CREATE TABLE IF NOT EXISTS favoriten_fahrten (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  von_ort_id INT NOT NULL,
  nach_ort_id INT NOT NULL,
  anlass VARCHAR(500) NOT NULL,
  abrechnungstraeger_id INT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (von_ort_id) REFERENCES orte(id) ON DELETE CASCADE,
  FOREIGN KEY (nach_ort_id) REFERENCES orte(id) ON DELETE CASCADE,
  FOREIGN KEY (abrechnungstraeger_id) REFERENCES abrechnungstraeger(id) ON DELETE CASCADE
);
