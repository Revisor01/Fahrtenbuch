-- Verwaltbare Anlass-Liste je Nutzer.
--
-- Bisher war "anlass" nur ein Freitext-VARCHAR an fahrten. Im Erfassungs-Modal
-- wurden als Vorschlaege die haeufigsten Anlaesse aus dem Verlauf des jeweiligen
-- Ziels errechnet. Diese Tabelle macht daraus eine gepflegte Liste, die der
-- Nutzer selbst verwalten und aus dem Modal heraus erweitern kann.
--
-- BEWUSST KEIN Fremdschluessel von fahrten auf anlaesse: fahrten.anlass bleibt
-- ein VARCHAR. Wird ein Anlass geloescht, behalten bestehende Fahrten ihren
-- Text - Abrechnungsdaten duerfen sich nicht rueckwirkend aendern.
--
-- WICHTIG - diese Datei muss wiederholbar sein:
-- DDL committet in MySQL implizit. Die Transaktion des Migrators schuetzt ein
-- CREATE TABLE also nicht. Schlaegt ein spaeteres Statement fehl, bleibt die
-- Tabelle bestehen, der migrations-Eintrag fehlt - beim naechsten Start liefe
-- die Datei erneut. Darum CREATE TABLE IF NOT EXISTS, Existenzpruefungen ueber
-- information_schema und ein INSERT IGNORE fuer die Uebernahme.
--
-- Der Migrator trennt Statements zeilenweise am Semikolon und versteht nur
-- --Kommentare, kein /* */. Deshalb kein Semikolon in Strings oder am Ende
-- mehrzeiliger Kommentare.

-- 1. Tabelle anlegen
CREATE TABLE IF NOT EXISTS anlaesse (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  aktiv TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_anlaesse_user_name (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. UNIQUE-Schluessel nachruesten, falls die Tabelle aus einem abgebrochenen
-- Lauf ohne ihn stammt. Ohne den Schluessel liefe create() ins Duplikat.
SET @uniq_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anlaesse' AND INDEX_NAME = 'uniq_anlaesse_user_name');
SET @sql := IF(@uniq_da = 0, 'ALTER TABLE anlaesse ADD UNIQUE KEY uniq_anlaesse_user_name (user_id, name)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Bestehende Anlaesse einmalig uebernehmen.
--
-- Je Nutzer die verschiedenen Anlaesse aus fahrten, dabei das Praefix
-- "Rueckfahrt: " abschneiden - Hin- und Rueckfahrt sind derselbe Anlass, sonst
-- staende jeder Eintrag doppelt in der Liste. Der Umlaut wird wie in 0009 als
-- Platzhalter geschrieben, damit die Datei unabhaengig von der Verbindungs-
-- Kodierung greift.
--
-- sort_order = Haeufigkeit absteigend, der meistgenutzte Anlass bekommt die 0.
-- Leere Namen fallen raus. INSERT IGNORE, damit ein Wiederholungslauf die
-- bereits vorhandenen Zeilen nicht anfasst und vom Nutzer geloeschte Anlaesse
-- nicht zurueckkehren, solange gleichnamige Eintraege noch existieren.
DROP TEMPORARY TABLE IF EXISTS tmp_anlaesse;
CREATE TEMPORARY TABLE tmp_anlaesse (user_id INT NOT NULL, name VARCHAR(255) NOT NULL, anzahl INT NOT NULL);

SET @sql := 'INSERT INTO tmp_anlaesse (user_id, name, anzahl) SELECT f.user_id, TRIM(REGEXP_REPLACE(f.anlass, ''^R.ckfahrt:[[:space:]]*'', '''')) AS name, COUNT(*) AS anzahl FROM fahrten f WHERE f.anlass IS NOT NULL AND f.user_id IS NOT NULL GROUP BY f.user_id, name HAVING name <> ''''';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rang je Nutzer bilden: haeufigster Anlass zuerst. Ein einfaches
-- Zaehler-Konstrukt statt Fensterfunktion, damit die Datei auch auf
-- aelteren Servern laeuft.
SET @rang := 0;
SET @letzter_user := NULL;

SET @sql := 'INSERT IGNORE INTO anlaesse (user_id, name, sort_order, aktiv) SELECT s.user_id, s.name, s.rang, 1 FROM (SELECT t.user_id, t.name, @rang := IF(@letzter_user = t.user_id, @rang + 1, 0) AS rang, @letzter_user := t.user_id AS dummy FROM (SELECT user_id, name, anzahl FROM tmp_anlaesse ORDER BY user_id ASC, anzahl DESC, name ASC) t) s';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TEMPORARY TABLE IF EXISTS tmp_anlaesse;
