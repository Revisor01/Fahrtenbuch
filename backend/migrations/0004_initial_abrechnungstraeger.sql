DELIMITER //

-- Drop bestehenden Trigger
DROP TRIGGER IF EXISTS after_user_create//

-- Neuer Trigger der sowohl Mitfahrer-Erstattung als auch Abrechnungsträger anlegt
CREATE TRIGGER after_user_create
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    -- Mitfahrer-Erstattung (wie bisher)
    INSERT INTO mitfahrer_erstattung (user_id, betrag, gueltig_ab)
    VALUES (NEW.id, '${DEFAULT_ERSTATTUNG_MITFAHRER}', '${DEFAULT_ERSTATTUNG_DATUM}');
    
    -- Abrechnungsträger 1 (wenn definiert)
    IF '${INITIAL_TRAEGER_1_NAME}' != '' THEN
        INSERT INTO abrechnungstraeger (user_id, name, sort_order, active)
        VALUES (NEW.id, '${INITIAL_TRAEGER_1_NAME}', 1, TRUE);
        
        SET @last_id = LAST_INSERT_ID();
        
        INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
        VALUES (@last_id, '${DEFAULT_ERSTATTUNG_TRAEGER}', '${DEFAULT_ERSTATTUNG_DATUM}');
    END IF;
    
    -- Abrechnungsträger 2 (wenn definiert)
    IF '${INITIAL_TRAEGER_2_NAME}' != '' THEN
        INSERT INTO abrechnungstraeger (user_id, name, sort_order, active)
        VALUES (NEW.id, '${INITIAL_TRAEGER_2_NAME}', 2, TRUE);
        
        SET @last_id = LAST_INSERT_ID();
        
        INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
        VALUES (@last_id, '${DEFAULT_ERSTATTUNG_TRAEGER}', '${DEFAULT_ERSTATTUNG_DATUM}');
    END IF;
END//

DELIMITER ;

-- Für bestehende User nachholen
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