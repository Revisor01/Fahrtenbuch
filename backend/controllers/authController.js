const bcrypt = require('bcrypt');
const { registrierungErlaubt } = require('../utils/registrierung');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const crypto = require('crypto');
const mailService = require('../services/mailService');
const { TOKEN_LAUFZEIT } = require('../utils/tokenLaufzeit');

// Vergleichshash für unbekannte Konten, mit derselben Kostenstufe wie echte Passwörter.
const DUMMY_HASH = bcrypt.hashSync('kein-konto-mit-diesem-namen', 10);

// Mailfehler (SMTP-Code oder responseCode) von echten Serverfehlern unterscheiden.
const MAIL_FEHLERCODES = new Set([
  'EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EENVELOPE', 'EMESSAGE', 'EDNS',
]);

function istMailFehler(error) {
  if (!error) return false;
  if (MAIL_FEHLERCODES.has(error.code)) return true;
  if (typeof error.responseCode === 'number') return true;
  return /smtp|mail|greeting|authentication failed/i.test(error.message || '');
}

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
      // Suche den User anhand des Usernamens oder der E-Mail
      const [rows] = await db.execute(
          `SELECT u.*, p.email, p.full_name
           FROM users u
           LEFT JOIN user_profiles p ON u.id = p.user_id
           WHERE u.username = ? OR p.email = ?`,
          [username, username]
      );
        
      // Auch bei unbekanntem Namen vergleichen, sonst verrät die Laufzeit, welche Konten es gibt.
      if (rows.length === 0) {
          await bcrypt.compare(password, DUMMY_HASH);
          return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
      }
        
      const user = rows[0];
        
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
          return res.status(401).json({ message: 'Ungültige Anmeldeinformationen' });
      }
        
      const token = jwt.sign(
        { id: user.id, role: user.role, email_verified: user.email_verified },
        process.env.JWT_SECRET,
        { expiresIn: TOKEN_LAUFZEIT }
      );
        
      res.json({ token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Serverfehler beim Login' });
    }
};

// Timing-sicherer String-Vergleich (bei unterschiedlicher Länge normal ungleich)
function sicherGleich(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

exports.register = async (req, res) => {
  const { username, email, registrationCode } = req.body;

  try {
    // Gates nur bei nicht-leerer Variable, Compose liefert Leerstrings.
    if (!registrierungErlaubt()) {
      return res.status(403).json({ message: 'Registrierung ist deaktiviert' });
    }

    if (process.env.ALLOWED_EMAIL_DOMAINS) {
      const erlaubteDomains = process.env.ALLOWED_EMAIL_DOMAINS
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);
      const emailDomain = (email.split('@')[1] || '').toLowerCase();
      if (!erlaubteDomains.includes(emailDomain)) {
        return res.status(403).json({ message: 'Diese E-Mail-Domain ist nicht für die Registrierung zugelassen' });
      }
    }

    if (process.env.REGISTRATION_CODE) {
      if (!registrationCode || !sicherGleich(registrationCode, process.env.REGISTRATION_CODE)) {
        return res.status(403).json({ message: 'Ungültiger Registrierungscode' });
      }
    }

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
      
      // Leeres Passwort, Login erst nach dem Setzen per Token (7 Tage).
      const [userResult] = await connection.execute(
        `INSERT INTO users (username, verification_token, verification_token_expires, role, password)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), "user", ?)`,
        [username, verificationToken, '']
      );
      
      // Erstelle Profil
      await connection.execute(
        'INSERT INTO user_profiles (user_id, email) VALUES (?, ?)',
        [userResult.insertId, email]
      );
      
      // Erst senden, dann festschreiben, sonst bleibt ein Konto ohne Passwort und Link.
      await mailService.sendWelcomeEmail(email, username, verificationToken);

      await connection.commit();

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
    // Mailfehler: nichts angelegt, ein neuer Versuch hilft.
    if (istMailFehler(error)) {
      return res.status(502).json({
        message: 'Die Bestätigungsmail konnte nicht versendet werden. Bitte versuchen Sie es später erneut.'
      });
    }
    res.status(500).json({ message: 'Serverfehler bei der Registrierung' });
  }
};