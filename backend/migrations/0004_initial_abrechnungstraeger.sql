-- Trigger für automatische Erstattungssätze (Mitfahrer)
DROP TRIGGER IF EXISTS after_user_create_mitfahrer;
CREATE TRIGGER after_user_create_mitfahrer
AFTER INSERT ON users
FOR EACH ROW
INSERT INTO mitfahrer_erstattung (user_id, betrag, gueltig_ab)
VALUES (NEW.id, '${DEFAULT_ERSTATTUNG_MITFAHRER}', '${DEFAULT_ERSTATTUNG_DATUM}');

-- Trigger: Erstelle den ersten Abrechnungsträger, wenn der Name vorhanden ist
DROP TRIGGER IF EXISTS after_user_create;
CREATE TRIGGER after_user_create
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    IF LENGTH(TRIM('${INITIAL_TRAEGER_1_NAME}')) > 0 THEN
        INSERT INTO abrechnungstraeger (user_id, name, sort_order, active)
        VALUES (NEW.id, '${INITIAL_TRAEGER_1_NAME}', 1, TRUE);
    END IF;
END;

-- Trigger: Erstelle den zweiten Abrechnungsträger, wenn der Name vorhanden ist
DROP TRIGGER IF EXISTS after_user_create_traeger2;
CREATE TRIGGER after_user_create_traeger2
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    IF LENGTH(TRIM('${INITIAL_TRAEGER_2_NAME}')) > 0 THEN
        INSERT INTO abrechnungstraeger (user_id, name, sort_order, active)
        VALUES (NEW.id, '${INITIAL_TRAEGER_2_NAME}', 2, TRUE);
    END IF;
END;

-- Trigger: Erstelle die Erstattungsbeträge nachdem ein Abrechnungsträger erstellt wurde
DROP TRIGGER IF EXISTS after_abrechnungstraeger_create;
CREATE TRIGGER after_abrechnungstraeger_create
AFTER INSERT ON abrechnungstraeger
FOR EACH ROW
BEGIN
    INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
    VALUES (NEW.id, '${DEFAULT_ERSTATTUNG_TRAEGER}', '${DEFAULT_ERSTATTUNG_DATUM}');
END;