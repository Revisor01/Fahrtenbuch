SET @default_erstattung_traeger = 0.30;
SET @default_erstattung_mitfahrer = 0.05;
SET @default_erstattung_datum = '2024-01-01';

-- Insert Initial Admin User
INSERT INTO users (username, password, role, email_verified)
SELECT * FROM (SELECT
    '${INITIAL_ADMIN_USERNAME}',
    '${INITIAL_ADMIN_PASSWORD}', -- This is the plain password
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

-- Trigger für automatische Erstattungssätze
DELIMITER //

DROP TRIGGER IF EXISTS after_user_create//
CREATE TRIGGER after_user_create
AFTER INSERT ON users
FOR EACH ROW
BEGIN
INSERT INTO mitfahrer_erstattung (user_id, betrag, gueltig_ab)
VALUES (NEW.id, @default_erstattung_mitfahrer, @default_erstattung_datum);
END//

DROP TRIGGER IF EXISTS after_abrechnungstraeger_create//
CREATE TRIGGER after_abrechnungstraeger_create
AFTER INSERT ON abrechnungstraeger
FOR EACH ROW
BEGIN
INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
VALUES (NEW.id, @default_erstattung_traeger, @default_erstattung_datum);
END//

DELIMITER ;