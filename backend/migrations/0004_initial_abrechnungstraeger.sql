-- Trigger 1: after_user_create
DROP TRIGGER IF EXISTS after_user_create;
CREATE TRIGGER after_user_create AFTER INSERT ON users FOR EACH ROW
BEGIN
    IF LENGTH(TRIM('${INITIAL_TRAEGER_1_NAME}')) > 0 THEN
        INSERT INTO abrechnungstraeger (user_id, name, sort_order, active) 
        VALUES (NEW.id, '${INITIAL_TRAEGER_1_NAME}', 1, TRUE);
    END IF;
END;

-- Trigger 2: after_user_create_mitfahrer
DROP TRIGGER IF EXISTS after_user_create_mitfahrer;
CREATE TRIGGER after_user_create_mitfahrer AFTER INSERT ON users FOR EACH ROW
BEGIN
    INSERT INTO mitfahrer_erstattung (user_id, betrag, gueltig_ab)
    VALUES (NEW.id, '${DEFAULT_ERSTATTUNG_MITFAHRER}', '${DEFAULT_ERSTATTUNG_DATUM}');
END;

-- Trigger 3: after_user_create_traeger2
DROP TRIGGER IF EXISTS after_user_create_traeger2;
CREATE TRIGGER after_user_create_traeger2 AFTER INSERT ON users FOR EACH ROW
BEGIN
    IF LENGTH(TRIM('${INITIAL_TRAEGER_2_NAME}')) > 0 THEN
        INSERT INTO abrechnungstraeger (user_id, name, sort_order, active)
        VALUES (NEW.id, '${INITIAL_TRAEGER_2_NAME}', 2, TRUE);
    END IF;
END;

-- Trigger 4: after_abrechnungstraeger_create
DROP TRIGGER IF EXISTS after_abrechnungstraeger_create;
CREATE TRIGGER after_abrechnungstraeger_create AFTER INSERT ON abrechnungstraeger FOR EACH ROW
BEGIN
    INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
    VALUES (NEW.id, '${DEFAULT_ERSTATTUNG_TRAEGER}', '${DEFAULT_ERSTATTUNG_DATUM}');
END;

-- Für bestehende User nachholen: Erster Abrechnungsträger
INSERT INTO abrechnungstraeger (user_id, name, sort_order, active)
SELECT 
    u.id,
    '${INITIAL_TRAEGER_1_NAME}',
    1,
    TRUE
FROM users u
WHERE '${INITIAL_TRAEGER_1_NAME}' != ''
AND NOT EXISTS (
    SELECT 1 FROM abrechnungstraeger 
    WHERE user_id = u.id 
    AND name = '${INITIAL_TRAEGER_1_NAME}'
);

-- Erstattungssätze für den ersten Träger
INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
SELECT 
    at.id,
    '${DEFAULT_ERSTATTUNG_TRAEGER}',
    '${DEFAULT_ERSTATTUNG_DATUM}'
FROM abrechnungstraeger at
WHERE at.name = '${INITIAL_TRAEGER_1_NAME}'
AND NOT EXISTS (
    SELECT 1 FROM erstattungsbetraege 
    WHERE abrechnungstraeger_id = at.id 
    AND gueltig_ab = '${DEFAULT_ERSTATTUNG_DATUM}'
);

-- Zweiter Abrechnungsträger für bestehende User
INSERT INTO abrechnungstraeger (user_id, name, sort_order, active)
SELECT 
    u.id,
    '${INITIAL_TRAEGER_2_NAME}',
    2,
    TRUE
FROM users u
WHERE '${INITIAL_TRAEGER_2_NAME}' != ''
AND NOT EXISTS (
    SELECT 1 FROM abrechnungstraeger 
    WHERE user_id = u.id 
    AND name = '${INITIAL_TRAEGER_2_NAME}'
);

-- Erstattungssätze für den zweiten Träger
INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
SELECT 
    at.id,
    '${DEFAULT_ERSTATTUNG_TRAEGER}',
    '${DEFAULT_ERSTATTUNG_DATUM}'
FROM abrechnungstraeger at
WHERE at.name = '${INITIAL_TRAEGER_2_NAME}'
AND NOT EXISTS (
    SELECT 1 FROM erstattungsbetraege 
    WHERE abrechnungstraeger_id = at.id 
    AND gueltig_ab = '${DEFAULT_ERSTATTUNG_DATUM}'
);