DELIMITER //

-- Insert Initial Admin User
INSERT INTO users (username, password, role, email_verified)
SELECT * FROM (SELECT
    '${INITIAL_ADMIN_USERNAME}',
    'PLACEHOLDER_PASSWORD_HASH',
    'admin',
    TRUE
) AS tmp
WHERE NOT EXISTS (
    SELECT username FROM users WHERE username = '${INITIAL_ADMIN_USERNAME}'
);

-- Insert Initial Admin User Profile
INSERT INTO user_profiles (user_id, email) VALUES (
    (SELECT id FROM users WHERE username = '${INITIAL_ADMIN_USERNAME}'),
    '${INITIAL_ADMIN_EMAIL}'
);

-- Setze Standardwerte aus ENV-Variablen (als Strings behandeln)
SET @default_erstattung_traeger = '${DEFAULT_ERSTATTUNG_TRAEGER}';
SET @default_erstattung_mitfahrer = '${DEFAULT_ERSTATTUNG_MITFAHRER}';
SET @default_erstattung_datum = '${DEFAULT_ERSTATTUNG_DATUM}';

-- Trigger für automatische Erstattungssätze
DROP TRIGGER IF EXISTS after_user_create;

CREATE TRIGGER after_user_create
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO mitfahrer_erstattung (user_id, betrag, gueltig_ab)
    VALUES (NEW.id, @default_erstattung_mitfahrer, @default_erstattung_datum);
END //

DROP TRIGGER IF EXISTS after_abrechnungstraeger_create;

CREATE TRIGGER after_abrechnungstraeger_create
AFTER INSERT ON abrechnungstraeger
FOR EACH ROW
BEGIN
    INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
    VALUES (NEW.id, @default_erstattung_traeger, @default_erstattung_datum);
END //

DELIMITER ;