-- Zeitpunkt der letzten Passwortänderung, ältere Token gelten nicht mehr. NULL heißt nie geändert, niemand wird ausgeloggt. Kein Semikolon in Strings.

SET @spalte_da := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'passwort_geaendert_am');
SET @sql := IF(@spalte_da = 0, 'ALTER TABLE users ADD COLUMN passwort_geaendert_am DATETIME NULL DEFAULT NULL', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
