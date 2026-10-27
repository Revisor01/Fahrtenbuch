const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const { erneuereBeiBedarf } = require('../utils/tokenLaufzeit');

const authMiddleware = async (req, res, next) => {
  // Erst prüfen ob API Key vorhanden
  const apiKey = req.header('X-API-Key');
  if (apiKey) {
    try {
      const keyData = await ApiKey.validate(apiKey);
      if (keyData) {
        // Lade aktuelle User-Daten aus der Datenbank
        const user = await User.findById(keyData.user_id);
        if (user) {
          req.user = user;
          // API-Schlüssel haben kein Ausstellungsdatum, also keine gleitende Sitzung.
          req.mitApiSchluessel = true;
          await ApiKey.updateLastUsed(keyData.api_key_id);
          return next();
        }
      }
    } catch (error) {
      console.error('API Key validation failed:', error);
    }
  }
  
  // Wenn kein API Key oder ungültig, prüfe JWT Token
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Keine Authentifizierung vorhanden' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Algorithmus festlegen, damit die Annahme im Code steht.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    
    // Lade aktuelle User-Daten aus der Datenbank
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Benutzer nicht gefunden' });
    }

    // Token vor dem letzten Passwortwechsel gelten nicht; 1 s Toleranz, weil iat abgerundet wird.
    if (user.passwort_geaendert_am && decoded.iat) {
      const geaendert = Math.floor(new Date(user.passwort_geaendert_am).getTime() / 1000);
      if (Number.isFinite(geaendert) && decoded.iat < geaendert - 1) {
        return res.status(401).json({ message: 'Anmeldung abgelaufen, bitte neu anmelden' });
      }
    }

    // Füge vollständige User-Informationen zum Request hinzu
    req.user = user;

    // Gleitende Sitzung: neues Token im Antwort-Header ab halber Laufzeit, nur für JWT.
    erneuereBeiBedarf(decoded, res);

    next();
  } catch (error) {
    // Details nur ins Log, sonst erfahren Angreifer, woran ihr Token scheitert.
    console.error('Token verification failed:', error.message);
    res.status(401).json({ message: 'Ungültige Authentifizierung' });
  }
};

// Middleware für Rollen-Check
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
    }

    next();
  };
};

// Middleware für Admin oder eigenen Account
const requireAdminOrSelf = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const roh = req.params[paramName];

    // Nur reine Ziffern, MySQL liest '2e1' als 20.
    if (typeof roh !== 'string' || !/^\d+$/.test(roh)) {
      return res.status(400).json({ message: 'Ungültige ID' });
    }

    const requestedId = Number(roh);
    if (!Number.isSafeInteger(requestedId)) {
      return res.status(400).json({ message: 'Ungültige ID' });
    }

    if (req.user.role !== 'admin' && req.user.id !== requestedId) {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
    }

    // Normalisiert zurückschreiben, damit nachgelagerte Abfragen nie den Rohwert sehen.
    req.params[paramName] = String(requestedId);

    next();
  };
};

// Middleware für verifizierte E-Mail
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Nicht authentifiziert' });
  }

  if (!req.user.email_verified) {
    return res.status(403).json({ 
      message: 'E-Mail-Adresse nicht verifiziert',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  requireRole,
  requireAdminOrSelf,
  requireVerifiedEmail
};