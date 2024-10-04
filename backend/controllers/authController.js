const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.login = async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });
  
  try {
    // Benutzer in der Datenbank suchen
    const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    console.log('Database query result:', users);
    
    if (users.length === 0) {
      console.log('User not found');
      return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
    }
    
    const user = users[0];
    
    // Direkter Passwortvergleich (nicht sicher!)
    const isMatch = password === user.password;
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
    }
    
    // JWT Token erstellen
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    console.log('Login successful, token generated');
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Serverfehler beim Login' });
  }
};
// Optional: Registrierungsfunktion
exports.register = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Überprüfen, ob der Benutzer bereits existiert
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Benutzername bereits vergeben' });
    }

    // Passwort hashen
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Benutzer in die Datenbank einfügen
    await db.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

    res.status(201).json({ message: 'Benutzer erfolgreich registriert' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Serverfehler bei der Registrierung' });
  }
};