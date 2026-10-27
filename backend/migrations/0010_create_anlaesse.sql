-- Anlass-Liste je Nutzer, ohne Fremdschlüssel von fahrten, damit gelöschte Anlässe Abrechnungen nicht ändern. Wiederholbar, kein Semikolon am Ende einer Kommentarzeile.

-- 1. Tabelle anlegen
CREATE TABLE IF NOT EXISTS anlaesse (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  aktiv TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_anlaesse_user_name (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. UNIQUE-Schlüssel nachrüsten, falls ein abgebrochener Lauf ihn nicht anlegte.
SET @uniq_da := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anlaesse' AND INDEX_NAME = 'uniq_anlaesse_user_name');
SET @sql := IF(@uniq_da = 0, 'ALTER TABLE anlaesse ADD UNIQUE KEY uniq_anlaesse_user_name (user_id, name)', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Bewusst keine Übernahme alter Anlässe, das gäbe eine unbedienbar lange Liste.
