-- Trigger: after_user_create_orte
DROP TRIGGER IF EXISTS after_user_create_orte;

CREATE TRIGGER after_user_create_orte AFTER INSERT ON users FOR EACH ROW
BEGIN
    -- Erster Standardort
    IF LENGTH(TRIM('${STANDARD_ORT_1_NAME}')) > 0 THEN
        INSERT INTO orte (name, adresse, ist_wohnort, ist_dienstort, ist_kirchspiel, usage_count, user_id)
        VALUES (
            '${STANDARD_ORT_1_NAME}', 
            '${STANDARD_ORT_1_ADRESSE}', 
            0, 
            0, 
            0, 
            0, 
            NEW.id
        );
    END IF;

    -- Zweiter Standardort
    IF LENGTH(TRIM('${STANDARD_ORT_2_NAME}')) > 0 THEN
        INSERT INTO orte (name, adresse, ist_wohnort, ist_dienstort, ist_kirchspiel, usage_count, user_id)
        VALUES (
            '${STANDARD_ORT_2_NAME}', 
            '${STANDARD_ORT_2_ADRESSE}', 
            0, 
            0, 
            0, 
            0, 
            NEW.id
        );
    END IF;
END;