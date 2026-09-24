-- Index in der Reihenfolge, in der die Abfragen filtern: erst der Nutzer,
-- dann der Zeitraum.
--
-- Vorhanden war `idx_fahrten_datum_user (datum, user_id)` — genau verkehrt
-- herum. Jede Abfrage dieser App fragt „ein Nutzer, ein Zeitraum" — mit dem
-- Datum an erster Stelle muss MySQL ueber alle Nutzer hinweg lesen und
-- danach aussortieren.
--
-- Gemessen an 50.000 Zeilen (MySQL 8.4, 40 Nutzer, fuenf Jahrgaenge), Abfrage
-- „ein Monat eines Nutzers":
--   YEAR()/MONTH() mit altem Index:  1.250 gepruefte Zeilen, 0,56 ms
--   Datumsbereich mit altem Index:      812 gepruefte Zeilen, 0,55 ms
--   Datumsbereich mit diesem Index:      28 gepruefte Zeilen, 0,06 ms
--
-- Beides gehoert zusammen: `YEAR(datum)` legt eine Funktion um die Spalte und
-- macht jeden Index darauf unbrauchbar — der neue Index allein haette nichts
-- gebracht. Die Abfragen in models/Fahrt.js und controllers/fahrtController.js
-- sind im selben Commit auf `datum >= ? AND datum < ?` umgestellt.
--
-- Der alte Index bleibt vorerst stehen: Er kostet wenig, und ein Entfernen
-- waehrend der laufenden Umstellung nimmt dem Optimierer den Rueckfallweg,
-- falls doch eine Abfrage uebersehen wurde.
--
-- WICHTIG - diese Datei muss wiederholbar sein:
-- DDL committet in MySQL implizit, die Transaktion des Migrators traegt hier
-- nicht. MySQL 8.4 kennt kein "ADD INDEX IF NOT EXISTS" (das ist MariaDB),
-- deshalb die Pruefung ueber information_schema wie in 0011 und 0013.
--
-- Der Migrator trennt Statements zeilenweise am Semikolon und versteht nur
-- --Kommentare. Deshalb kein Semikolon in Kommentarzeilen.

SET @index_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'fahrten' AND INDEX_NAME = 'idx_fahrten_user_datum');
SET @sql := IF(@index_da = 0, 'ALTER TABLE fahrten ADD INDEX idx_fahrten_user_datum (user_id, datum)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
