-- Manuelle Reihenfolge fuer Orte.
--
-- Bisher hatte orte keine sort_order. Die Liste in den Einstellungen sortierte
-- das Frontend alphabetisch nach Name, GET /api/orte lieferte sogar voellig
-- ungeordnet (kein ORDER BY). Mit dieser Spalte kann der Nutzer seine Orte
-- selbst per Drag & Drop ordnen - wie bei den Abrechnungstraegern.
--
-- Vorbelegung nach Name: Genau so zeigte die Einstellungen-Liste die Orte
-- bisher an. Beim Update aendert sich damit fuer den Nutzer sichtbar nichts.
--
-- BEWUSST NICHT nach Wohnort/Dienstort/Kirchspiel vorbelegt, obwohl
-- /api/orte/simple so sortiert: Der Erfassungs-Flow sortiert die Startorte
-- ohnehin im Frontend selbst nach Wohnort/Dienstort und bleibt davon
-- unberuehrt. In der Verwaltungsliste dagegen wuerde eine solche Vorbelegung
-- die gewohnte alphabetische Reihenfolge zerreissen.
--
-- WICHTIG - diese Datei muss wiederholbar sein:
-- DDL committet in MySQL implizit. Die Transaktion des Migrators schuetzt ein
-- ALTER TABLE also nicht. Schlaegt ein spaeteres Statement fehl, bleibt die
-- Spalte bestehen, der migrations-Eintrag fehlt - beim naechsten Start liefe
-- die Datei erneut und scheiterte an "Duplicate column name". Darum jeder
-- Schritt mit Existenzpruefung.
--
-- MySQL 8.4 kennt kein "ADD COLUMN IF NOT EXISTS" (das ist MariaDB), deshalb
-- die Pruefung ueber information_schema und PREPARE/EXECUTE.
--
-- Auch das Vorbelegungs-Statement laeuft ueber PREPARE: Der Migrator schickt
-- jede Anweisung einzeln, und MySQL prueft die Spaltennamen schon beim Parsen -
-- ein direktes "SET sort_order = ..." scheiterte deshalb, solange die Spalte
-- im selben Lauf erst angelegt wird.
--
-- Der Migrator trennt Statements zeilenweise am Semikolon und versteht nur
-- --Kommentare, kein /* */. Deshalb kein Semikolon in Strings oder am Ende
-- mehrzeiliger Kommentare.

-- 1. Spalte anlegen, falls noch nicht vorhanden
SET @spalte_da := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orte' AND COLUMN_NAME = 'sort_order');
SET @sql := IF(@spalte_da = 0, 'ALTER TABLE orte ADD COLUMN sort_order INT NOT NULL DEFAULT 0', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Vorbelegung je Nutzer nach Name, nur beim ersten Lauf.
--
-- Die Bedingung @spalte_da = 0 sorgt dafuer, dass ein Wiederholungslauf die
-- inzwischen vom Nutzer gezogene Reihenfolge nicht wieder platt macht. Ein
-- reines "WHERE sort_order = 0" reichte dafuer nicht: der erste Ort traegt
-- nach der Vorbelegung selbst eine 0.
--
-- ROW_NUMBER() beginnt bei 1 - passend zu createOrt, das mit
-- MAX(sort_order) + 1 ans Ende anhaengt.
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
