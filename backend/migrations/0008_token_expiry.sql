-- Ablaufdatum fuer verification_token.
-- Bisher hatte nur password_reset_token ein Ablaufdatum; Einladungs- und
-- Verifikations-Tokens galten unbegrenzt und liessen sich ueber
-- /api/users/set-password jederzeit zur Kontouebernahme nutzen.
ALTER TABLE users ADD COLUMN verification_token_expires DATETIME NULL AFTER verification_token;

-- Bestandstokens sofort entwerten: sie sind unbekannten Alters und wurden
-- bisher nie geprueft. Betroffene Nutzer fordern einen neuen Link an.
UPDATE users SET verification_token_expires = NOW() WHERE verification_token IS NOT NULL;

CREATE INDEX idx_verification_token_expires ON users (verification_token_expires);
