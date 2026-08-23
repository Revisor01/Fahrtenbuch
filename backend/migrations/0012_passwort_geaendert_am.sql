-- Zeitpunkt der letzten Passwortaenderung.
--
-- Bisher blieben nach einem Passwortwechsel alle bestehenden Anmeldungen
-- gueltig: Wer ein Token abgegriffen hatte, behielt den Zugang, obwohl das
-- Passwort laengst ein anderes war. Genau dafuer wechselt man es aber.
--
-- Die Auth-Middleware vergleicht das Ausstellungsdatum des Tokens mit diesem
-- Wert und weist aeltere ab. NULL heisst "nie geaendert" - dann greift die
-- Pruefung nicht, bestehende Anmeldungen bleiben also erhalten. Niemand wird
-- durch diese Migration ausgeloggt.
--
-- MySQL 8.4 kennt kein "ADD COLUMN IF NOT EXISTS" (das ist MariaDB), deshalb
-- die Pruefung ueber information_schema und PREPARE/EXECUTE - wie in 0011.
--
-- Der Migrator trennt Statements zeilenweise am Semikolon und versteht nur
-- --Kommentare, kein Blockkommentar. Deshalb kein Semikolon in Strings.

SET @spalte_da := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'passwort_geaendert_am');
SET @sql := IF(@spalte_da = 0, 'ALTER TABLE users ADD COLUMN passwort_geaendert_am DATETIME NULL DEFAULT NULL', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
