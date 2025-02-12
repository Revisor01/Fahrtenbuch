const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');
const mailService = require('../services/mailService');

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

exports.register = async (req, res) => {
    const { username, email } = req.body;
    
    try {
        // Prüfe ob Benutzer bereits existiert
        const [existingUsers] = await db.execute(
            'SELECT u.*, p.email FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.username = ? OR p.email = ?',
            [username, email]
        );
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Benutzername oder E-Mail bereits vergeben' });
        }
        
        // Generiere Verifikationstoken
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // Erstelle User
            const [userResult] = await connection.execute(
                'INSERT INTO users (username, verification_token, role) VALUES (?, ?, "user")',
                [username, verificationToken]
            );
            
            // Erstelle Profil
            await connection.execute(
                'INSERT INTO user_profiles (user_id, email) VALUES (?, ?)',
                [userResult.insertId, email]
            );
            
            await connection.commit();
            
            // E-Mail senden
            await mailService.sendWelcomeEmail(email, username, verificationToken);
            
            res.status(201).json({ 
                message: 'Registrierung erfolgreich. Bitte prüfen Sie Ihre E-Mails um Ihr Passwort zu setzen.'
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Serverfehler bei der Registrierung' });
    }
};