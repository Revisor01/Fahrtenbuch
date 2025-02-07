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

-- Trigger für automatische Erstattungssätze
DROP TRIGGER IF EXISTS after_user_create;

CREATE TRIGGER after_user_create
AFTER INSERT ON users
FOR EACH ROW
INSERT INTO mitfahrer_erstattung (user_id, betrag, gueltig_ab)
VALUES (NEW.id, '${DEFAULT_ERSTATTUNG_MITFAHRER}', '${DEFAULT_ERSTATTUNG_DATUM}');

DROP TRIGGER IF EXISTS after_abrechnungstraeger_create;

CREATE TRIGGER after_abrechnungstraeger_create
AFTER INSERT ON abrechnungstraeger
FOR EACH ROW
INSERT INTO erstattungsbetraege (abrechnungstraeger_id, betrag, gueltig_ab)
VALUES (NEW.id, '${DEFAULT_ERSTATTUNG_TRAEGER}', '${DEFAULT_ERSTATTUNG_DATUM}');