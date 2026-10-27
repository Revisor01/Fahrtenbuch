-- Ablaufdatum für verification_token, damit alte Links keine Kontoübernahme erlauben.
ALTER TABLE users ADD COLUMN verification_token_expires DATETIME NULL AFTER verification_token;

-- Bestandstokens sofort entwerten.
UPDATE users SET verification_token_expires = NOW() WHERE verification_token IS NOT NULL;

CREATE INDEX idx_verification_token_expires ON users (verification_token_expires);
