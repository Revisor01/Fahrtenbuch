-- Manuelle Reihenfolge für Orte, vorbelegt nach Name wie bisher angezeigt. Wiederholbar über information_schema und PREPARE, kein Semikolon am Ende einer Kommentarzeile.

-- 1. Spalte anlegen, falls noch nicht vorhanden
SET @spalte_da := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orte' AND COLUMN_NAME = 'sort_order');
SET @sql := IF(@spalte_da = 0, 'ALTER TABLE orte ADD COLUMN sort_order INT NOT NULL DEFAULT 0', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Vorbelegung je Nutzer nach Name nur beim ersten Lauf (@spalte_da = 0), ab 1 wie createOrt.
SET @sql := IF(@spalte_da = 0, 'UPDATE orte o JOIN (SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY name ASC, id ASC) AS rang FROM orte) r ON r.id = o.id SET o.sort_order = r.rang', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Index fuer die sortierte Ausgabe je Nutzer, falls noch nicht vorhanden
SET @index_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orte' AND INDEX_NAME = 'idx_orte_sortierung');
SET @sql := IF(@index_da = 0, 'ALTER TABLE orte ADD INDEX idx_orte_sortierung (user_id, sort_order)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
