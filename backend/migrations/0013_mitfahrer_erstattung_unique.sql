-- Ein Mitfahrer-Satz je Stichtag und Nutzer, sonst legte ein Doppelklick zwei an. Wiederholbar über information_schema, kein Semikolon am Ende einer Kommentarzeile.

-- 1. Duplikate bereinigen, der zuletzt angelegte Satz bleibt, mit dem bisher gerechnet wurde.
DELETE m1 FROM mitfahrer_erstattung m1 INNER JOIN mitfahrer_erstattung m2 ON m1.user_id = m2.user_id AND m1.gueltig_ab = m2.gueltig_ab AND m1.id < m2.id;

-- 2. Regel setzen, falls noch nicht vorhanden.
SET @index_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mitfahrer_erstattung' AND INDEX_NAME = 'idx_mitfahrer_user_datum');
SET @sql := IF(@index_da = 0, 'ALTER TABLE mitfahrer_erstattung ADD UNIQUE KEY idx_mitfahrer_user_datum (user_id, gueltig_ab)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
