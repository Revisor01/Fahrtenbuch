-- API-Schluessel nicht mehr im Klartext speichern.
--
-- `api_keys.api_key` enthielt den Schluessel so, wie ihn der Kurzbefehl auf
-- dem iPhone mitschickt. Wer ein Datenbank-Backup in die Haende bekam, hatte
-- damit dauerhaft nutzbare Zugaenge zu allen betroffenen Konten — die
-- Schluessel laufen nicht ab.
--
-- Der Schluessel hat 256 Bit Entropie (crypto.randomBytes(32)), deshalb
-- genuegt SHA-256. Anders als bei Passwoertern gibt es hier nichts zu raten,
-- und ein schneller Hash haelt die Pruefung ein indizierter Gleichheits-
-- vergleich statt eines Tabellendurchlaufs.
--
-- WICHTIG — niemand wird ausgesperrt:
-- Die vorhandenen Schluessel werden hier in ihre Hashes ueberfuehrt, nicht
-- geloescht. Jeder Kurzbefehl, der heute laeuft, laeuft danach weiter. Ein
-- harter Schnitt haette alle auf einen Schlag ungueltig gemacht, ohne dass
-- sich der Klartext irgendwo wiederbeschaffen liesse.
--
-- Der Klartext wird im selben Zug geleert. Die Spalte bleibt vorerst
-- bestehen (NULL): Ein DROP COLUMN waere nicht zurueckzunehmen, falls beim
-- Ausrollen doch etwas auffaellt.
--
-- WICHTIG - diese Datei muss wiederholbar sein:
-- DDL committet in MySQL implizit. MySQL 8.4 kennt kein
-- "ADD COLUMN IF NOT EXISTS" (das ist MariaDB), deshalb die Pruefung ueber
-- information_schema und PREPARE/EXECUTE wie in 0011, 0013 und 0014.
--
-- Der Migrator trennt Statements zeilenweise am Semikolon und versteht nur
-- --Kommentare. Keine Kommentarzeile darf auf ein Semikolon enden.

-- 1. Spalte fuer den Hash anlegen, falls noch nicht vorhanden.
SET @spalte_da := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_keys' AND COLUMN_NAME = 'api_key_hash');
SET @sql := IF(@spalte_da = 0, 'ALTER TABLE api_keys ADD COLUMN api_key_hash CHAR(64) NULL AFTER api_key', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Vorhandene Schluessel uebernehmen. Nur beim ersten Lauf, und nur dort,
--    wo noch ein Klartext steht.
UPDATE api_keys SET api_key_hash = SHA2(api_key, 256) WHERE api_key IS NOT NULL AND api_key != '' AND api_key_hash IS NULL;

-- 3. Eindeutigkeit auf den Hash. Der alte UNIQUE-Schluessel auf api_key
--    traegt nicht mehr, sobald dort ueberall NULL steht.
SET @index_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_keys' AND INDEX_NAME = 'uniq_api_key_hash');
SET @sql := IF(@index_da = 0, 'ALTER TABLE api_keys ADD UNIQUE KEY uniq_api_key_hash (api_key_hash)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Die alte Spalte NULL-faehig machen. MUSS vor dem Leeren stehen: Sie ist
--    als NOT NULL angelegt, und Schritt 5 scheiterte sonst mit
--    „Column 'api_key' cannot be null" (beim Testen gegen MySQL 8.4
--    aufgefallen). Auch fuers Anlegen neuer Schluessel noetig, denn
--    ApiKey.generate schreibt die Spalte nicht mehr.
SET @nullbar := (SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_keys' AND COLUMN_NAME = 'api_key');
SET @sql := IF(@nullbar = 'NO', 'ALTER TABLE api_keys MODIFY COLUMN api_key VARCHAR(64) NULL', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Klartext leeren. Erst jetzt, damit Schritt 2 bei einem Abbruch
--    dazwischen noch etwas zu uebernehmen haette.
UPDATE api_keys SET api_key = NULL WHERE api_key_hash IS NOT NULL AND api_key IS NOT NULL;
