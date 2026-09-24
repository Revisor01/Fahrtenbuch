-- Ein Mitfahrer-Satz je Stichtag und Nutzer.
--
-- Die Tabelle hatte als einzige der Erstattungstabellen keine solche Regel
-- (abrechnungstraeger_erstattungen hat idx_traeger_datum). Ein Doppelklick
-- auf „Speichern" legte deshalb zwei Saetze mit demselben gueltig_ab an.
-- Welcher davon greift, entscheidet die Sortierung — die Mitnahme-Erstattung
-- fiel je nach Lauf anders aus.
--
-- Die Oberflaeche zeigte fuer genau diesen Fall die Meldung „Fuer dieses
-- Datum existiert bereits ein Satz", ausgeloest durch „Duplicate entry" aus
-- der Datenbank. Ohne die Regel konnte sie nie erscheinen: toter Code, der
-- Sicherheit vortaeuschte. Mit dieser Migration stimmt die Meldung.
--
-- WICHTIG - diese Datei muss wiederholbar sein:
-- DDL committet in MySQL implizit, die Transaktion des Migrators schuetzt ein
-- ALTER TABLE also nicht. Schlaegt ein spaeteres Statement fehl, steht der
-- Index, der migrations-Eintrag fehlt, und beim naechsten Start liefe die
-- Datei erneut - dann scheiterte sie an "Duplicate key name". MySQL 8.4 kennt
-- kein "ADD INDEX IF NOT EXISTS" (das ist MariaDB), deshalb die Pruefung ueber
-- information_schema und PREPARE/EXECUTE, wie in 0011.
--
-- Der Migrator trennt Statements zeilenweise am Semikolon und versteht nur
-- --Kommentare, kein Blockkommentar. Deshalb kein Semikolon in Strings oder
-- am Ende mehrzeiliger Kommentare.

-- 1. Altbestand bereinigen, sonst scheitert das Anlegen des Index.
--
-- Von mehreren Saetzen desselben Stichtags bleibt der zuletzt angelegte
-- (hoechste id) - das ist der, den die Nutzer:in zuletzt gesehen hat und mit
-- dem bisher auch gerechnet wurde (die Abfragen sortieren nach gueltig_ab
-- absteigend und nehmen den ersten Treffer).
--
-- Laeuft auch beim Wiederholungslauf gefahrlos: Steht der Index bereits, gibt
-- es keine Duplikate mehr und das DELETE trifft nichts.
DELETE m1 FROM mitfahrer_erstattung m1 INNER JOIN mitfahrer_erstattung m2 ON m1.user_id = m2.user_id AND m1.gueltig_ab = m2.gueltig_ab AND m1.id < m2.id;

-- 2. Regel setzen, falls noch nicht vorhanden.
SET @index_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mitfahrer_erstattung' AND INDEX_NAME = 'idx_mitfahrer_user_datum');
SET @sql := IF(@index_da = 0, 'ALTER TABLE mitfahrer_erstattung ADD UNIQUE KEY idx_mitfahrer_user_datum (user_id, gueltig_ab)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
