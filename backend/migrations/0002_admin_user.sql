-- Initialer Admin. Aliase, sonst bricht MySQL bei einem Admin namens "admin" mit doppeltem Spaltennamen ab.
INSERT INTO users (username, password, role, email_verified)
SELECT * FROM (SELECT
    '${INITIAL_ADMIN_USERNAME}' AS username,
    'PLACEHOLDER_PASSWORD_HASH' AS password,
    'admin' AS role,
    TRUE AS email_verified
) AS tmp
WHERE NOT EXISTS (
    SELECT username FROM users WHERE username = '${INITIAL_ADMIN_USERNAME}'
);

-- Profil nur, wenn keins existiert, user_profiles.user_id ist nicht UNIQUE.
INSERT INTO user_profiles (user_id, email)
SELECT u.id, '${INITIAL_ADMIN_EMAIL}'
FROM users u
WHERE u.username = '${INITIAL_ADMIN_USERNAME}'
  AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = u.id);

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