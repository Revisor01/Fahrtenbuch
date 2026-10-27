-- Verknüpft Hin- und Rückfahrten über partner_fahrt_id. Wiederholbar (DDL committet implizit), Prüfung über information_schema und PREPARE, kein Semikolon am Ende einer Kommentarzeile.

-- 1. Spalte anlegen, falls noch nicht vorhanden
SET @spalte_da := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten' AND COLUMN_NAME = 'partner_fahrt_id');
SET @sql := IF(@spalte_da = 0, 'ALTER TABLE fahrten ADD COLUMN partner_fahrt_id INT NULL DEFAULT NULL', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Index fuer die Rueckwaertssuche, falls noch nicht vorhanden
SET @index_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten' AND INDEX_NAME = 'idx_fahrten_partner');
SET @sql := IF(@index_da = 0, 'ALTER TABLE fahrten ADD INDEX idx_fahrten_partner (partner_fahrt_id)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Fremdschlüssel auf die eigene Tabelle, ON DELETE SET NULL lässt die Partnerfahrt bestehen.
SET @fk_da := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten' AND CONSTRAINT_NAME = 'fk_fahrten_partner');
SET @sql := IF(@fk_da = 0, 'ALTER TABLE fahrten ADD CONSTRAINT fk_fahrten_partner FOREIGN KEY (partner_fahrt_id) REFERENCES fahrten(id) ON DELETE SET NULL', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Nur eindeutige Bestandspaare mit Ort-IDs verknüpfen, eine Lücke ist harmlos, eine falsche Zuordnung nicht.

-- 4a. Kandidaten sammeln: je Fahrt genau ein Partner, dessen Anlass passt
DROP TEMPORARY TABLE IF EXISTS tmp_paare;
CREATE TEMPORARY TABLE tmp_paare (fahrt_id INT PRIMARY KEY, partner_id INT NOT NULL);

SET @sql := 'INSERT INTO tmp_paare (fahrt_id, partner_id) SELECT a.id, MIN(b.id) FROM fahrten a JOIN fahrten b ON b.user_id = a.user_id AND b.datum = a.datum AND b.von_ort_id = a.nach_ort_id AND b.nach_ort_id = a.von_ort_id AND b.id <> a.id AND (b.anlass = a.anlass OR b.anlass LIKE CONCAT(''R%ckfahrt: '', a.anlass) OR a.anlass LIKE CONCAT(''R%ckfahrt: '', b.anlass)) WHERE a.von_ort_id IS NOT NULL AND a.nach_ort_id IS NOT NULL AND a.partner_fahrt_id IS NULL GROUP BY a.id HAVING COUNT(DISTINCT b.id) = 1';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4b. Nur wechselseitig eindeutige Paare, mit zweiter Kopie, weil MySQL eine temporäre Tabelle nicht zweimal öffnet.
DROP TEMPORARY TABLE IF EXISTS tmp_paare_gegen;
CREATE TEMPORARY TABLE tmp_paare_gegen (fahrt_id INT PRIMARY KEY, partner_id INT NOT NULL);
INSERT INTO tmp_paare_gegen (fahrt_id, partner_id) SELECT fahrt_id, partner_id FROM tmp_paare;

DROP TEMPORARY TABLE IF EXISTS tmp_paare_ok;
CREATE TEMPORARY TABLE tmp_paare_ok (fahrt_id INT PRIMARY KEY, partner_id INT NOT NULL);

INSERT INTO tmp_paare_ok (fahrt_id, partner_id) SELECT p.fahrt_id, p.partner_id FROM tmp_paare p JOIN tmp_paare_gegen g ON g.fahrt_id = p.partner_id AND g.partner_id = p.fahrt_id;

-- 4c. Verknuepfung schreiben
SET @sql := 'UPDATE fahrten f JOIN tmp_paare_ok p ON p.fahrt_id = f.id SET f.partner_fahrt_id = p.partner_id WHERE f.partner_fahrt_id IS NULL';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP TEMPORARY TABLE IF EXISTS tmp_paare;
DROP TEMPORARY TABLE IF EXISTS tmp_paare_gegen;
DROP TEMPORARY TABLE IF EXISTS tmp_paare_ok;
