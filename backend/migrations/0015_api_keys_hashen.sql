-- API-Schlüssel nur als SHA-256 speichern, bestehende werden überführt statt gelöscht. Die Klartextspalte bleibt vorerst als NULL. Keine Kommentarzeile darf auf ein Semikolon enden.

-- 1. Spalte fuer den Hash anlegen, falls noch nicht vorhanden.
SET @spalte_da := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_keys' AND COLUMN_NAME = 'api_key_hash');
SET @sql := IF(@spalte_da = 0, 'ALTER TABLE api_keys ADD COLUMN api_key_hash CHAR(64) NULL AFTER api_key', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Vorhandene Schlüssel übernehmen, nur wo noch ein Klartext steht.
UPDATE api_keys SET api_key_hash = SHA2(api_key, 256) WHERE api_key IS NOT NULL AND api_key != '' AND api_key_hash IS NULL;

-- 3. Eindeutigkeit auf den Hash.
SET @index_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_keys' AND INDEX_NAME = 'uniq_api_key_hash');
SET @sql := IF(@index_da = 0, 'ALTER TABLE api_keys ADD UNIQUE KEY uniq_api_key_hash (api_key_hash)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Alte Spalte NULL-fähig machen, vor dem Leeren, sonst scheitert Schritt 5.
SET @nullbar := (SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_keys' AND COLUMN_NAME = 'api_key');
SET @sql := IF(@nullbar = 'NO', 'ALTER TABLE api_keys MODIFY COLUMN api_key VARCHAR(64) NULL', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Klartext leeren, erst jetzt, damit Schritt 2 nach einem Abbruch noch greift.
UPDATE api_keys SET api_key = NULL WHERE api_key_hash IS NOT NULL AND api_key IS NOT NULL;
