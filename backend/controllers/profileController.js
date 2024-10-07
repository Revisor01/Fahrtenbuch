const db = require('../config/database');
const bcrypt = require('bcrypt');

exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT u.username, p.email, p.full_name, p.iban, p.kirchengemeinde, p.kirchspiel, p.kirchenkreis, o.name as wohnort, o.adresse as wohnort_adresse, d.name as dienstort, d.adresse as dienstort_adresse FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id LEFT JOIN orte o ON u.id = o.user_id AND o.ist_wohnort = 1 LEFT JOIN orte d ON u.id = d.user_id AND d.ist_dienstort = 1 WHERE u.id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Profil nicht gefunden' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Fehler beim Abrufen des Profils:', error);
    res.status(500).json({ message: 'Serverfehler beim Abrufen des Profils' });
  }
};

exports.updateProfile = async (req, res) => {
  const { email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis } = req.body;
  
  console.log('Received profile update request:', { email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis });
  console.log('User ID:', req.user.id);
  
  try {
    const result = await db.execute(
      'INSERT INTO user_profiles (user_id, email, full_name, iban, kirchengemeinde, kirchspiel, kirchenkreis) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), full_name = VALUES(full_name), iban = VALUES(iban), kirchengemeinde = VALUES(kirchengemeinde), kirchspiel = VALUES(kirchspiel), kirchenkreis = VALUES(kirchenkreis)',
      [req.user.id, email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis]
    );
    console.log('Database operation result:', result);
    
    res.json({ message: 'Profil erfolgreich aktualisiert' });
  } catch (error) {
    console.error('Detaillierter Fehler beim Aktualisieren des Profils:', error);
    res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Profils', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Neue Passwörter stimmen nicht überein' });
  }

  try {
    const [user] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);

    if (user.length === 0) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user[0].password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Altes Passwort ist falsch' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (error) {
    console.error('Fehler beim Ändern des Passworts:', error);
    res.status(500).json({ message: 'Serverfehler beim Ändern des Passworts' });
  }
};
