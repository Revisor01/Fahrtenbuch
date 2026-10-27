-- Index (user_id, datum) in Filterreihenfolge: 28 statt 812 gepruefte Zeilen je Monatsabfrage.
-- Der alte Index bleibt als Rueckfallweg. Kein Semikolon in Kommentarzeilen.

SET @index_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten' AND INDEX_NAME = 'idx_fahrten_user_datum');
SET @sql := IF(@index_da = 0, 'ALTER TABLE fahrten ADD INDEX idx_fahrten_user_datum (user_id, datum)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
