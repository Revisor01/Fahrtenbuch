const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.login = async (req, res) => {
    const { username, password, email } = req.body;
    console.log('Login attempt:', { username, email });
    
    if (!username && !email) {
        return res.status(400).json({ message: 'Benutzername oder E-Mail erforderlich' });
    }
    
    try {
        // Suche den User anhand des Usernamens oder der E-Mail
      const [rows] = await db.execute(
          `SELECT u.*, p.email, p.full_name
           FROM users u
           LEFT JOIN user_profiles p ON u.id = p.user_id
           WHERE u.username = ? OR p.email = ?`,
          [username, email]
      );
        
      if (rows.length === 0) {
          console.log('User not found');
          return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
      }
        
      const user = rows[0];
        
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match:', isMatch);
        
      if (!isMatch) {
          console.log('Password mismatch');
          return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
      }
        
    const token = jwt.sign(
      { id: user.id, role: user.role, email_verified: user.email_verified },
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

// Optional: Registrierungsfunktion (bleibt unverändert)
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