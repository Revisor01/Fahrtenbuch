-- Migration: Standardorte hinzufügen
-- Datum: [Datum der Migration]

-- Erster Standardort
INSERT INTO orte (name, adresse, ist_wohnort, ist_dienstort, ist_kirchspiel, usage_count, user_id)
SELECT 
    '${STANDARD_ORT_1_NAME}', 
    '${STANDARD_ORT_1_ADRESSE}', 
    0, 
    0, 
    0, 
    0, 
    NULL
FROM DUAL
WHERE '${STANDARD_ORT_1_NAME}' != ''
AND NOT EXISTS (
    SELECT 1 FROM orte 
    WHERE name = '${STANDARD_ORT_1_NAME}' 
    AND adresse = '${STANDARD_ORT_1_ADRESSE}'
);

-- Zweiter Standardort
INSERT INTO orte (name, adresse, ist_wohnort, ist_dienstort, ist_kirchspiel, usage_count, user_id)
SELECT 
    '${STANDARD_ORT_2_NAME}', 
    '${STANDARD_ORT_2_ADRESSE}', 
    0, 
    0, 
    0, 
    0, 
    NULL
FROM DUAL
WHERE '${STANDARD_ORT_2_NAME}' != ''
AND NOT EXISTS (
    SELECT 1 FROM orte 
    WHERE name = '${STANDARD_ORT_2_NAME}' 
    AND adresse = '${STANDARD_ORT_2_ADRESSE}'
);