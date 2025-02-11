const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username });
    
    try {
      // Suche den User anhand des Usernamens oder der E-Mail
      const [rows] = await db.execute(
          `SELECT u.*, p.email, p.full_name
           FROM users u
           LEFT JOIN user_profiles p ON u.id = p.user_id
           WHERE u.username = ? OR p.email = ?`,
          [username, username]
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
  const { username, email, registrationCode } = req.body;
  
  try {
    // Prüfe ob Registrierung erlaubt ist
    if (process.env.ALLOW_REGISTRATION !== 'true') {
      return res.status(403).json({ message: 'Registrierung ist deaktiviert' });
    }
    
    // Prüfe Email-Domain
    if (process.env.ALLOWED_EMAIL_DOMAINS) {
      const domain = email.split('@')[1];
      const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS.split(',');
      if (!allowedDomains.includes(domain)) {
        return res.status(400).json({ 
          message: 'Diese Email-Domain ist nicht für die Registrierung zugelassen' 
        });
      }
    }
    
    // Prüfe Registrierungscode
    if (process.env.REGISTRATION_CODE && 
      registrationCode !== process.env.REGISTRATION_CODE) {
        return res.status(400).json({ 
          message: 'Ungültiger Registrierungscode' 
        });
      }
    
    // Prüfe ob Benutzer bereits existiert
    const [existingUsers] = await db.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?', 
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        message: 'Benutzername oder E-Mail bereits vergeben' 
      });
    }
    
    // Erstelle Benutzer mit verification_token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Speichere Benutzer (ohne Passwort!)
    const [result] = await db.execute(
      'INSERT INTO users (username, verification_token) VALUES (?, ?)',
      [username, verificationToken]
    );
    
    // Speichere E-Mail im Profil
    await db.execute(
      'INSERT INTO user_profiles (user_id, email) VALUES (?, ?)',
      [result.insertId, email]
    );
    
    // Sende Willkommens-Email mit Token für Passwort-Setup
    await mailService.sendWelcomeEmail(email, username, verificationToken);
    
    res.status(201).json({ 
      message: 'Registrierung erfolgreich. Bitte prüfen Sie Ihre E-Mails um Ihr Passwort zu setzen.' 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Serverfehler bei der Registrierung' });
  }
};