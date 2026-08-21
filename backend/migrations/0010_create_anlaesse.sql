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

-- 3. Bewusst KEINE Uebernahme der bisherigen Anlaesse.
--
-- Naheliegend waere, die Anlaesse aus fahrten einmalig einzuspielen. Auf den
-- echten Daten waeren das fuer den aktivsten Nutzer 262 Eintraege, davon 76
-- genau einmal benutzt - dazu Tippfehler ("BEerdigung") und Varianten, die
-- sich nur in einem Komma unterscheiden. Genau die unbedienbar lange Liste
-- also, die diese Funktion vermeiden soll.
--
-- Die Liste gehoert deshalb dem Nutzer: Er legt seine Standard-Anlaesse
-- selbst an, im Modal oder in den Einstellungen. Verloren geht dabei nichts -
-- fahrten.anlass bleibt unangetastet, und das Modal schlaegt weiterhin die
-- haeufigsten Anlaesse aus dem Verlauf des jeweiligen Ziels vor.
