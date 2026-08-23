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
          // Kennzeichnen, welcher Weg die Anmeldung getragen hat: Ein
          // API-Schluessel hat kein Ausstellungsdatum, fuer ihn gibt es also
          // weder eine gleitende Sitzung noch ein Erneuerungs-Token.
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Lade aktuelle User-Daten aus der Datenbank
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Benutzer nicht gefunden' });
    }

    // Wurde das Passwort geaendert, nachdem dieses Token ausgestellt wurde?
    // Dann gilt es nicht mehr. Vorher blieben alte Anmeldungen bestehen: Wer
    // ein Token abgegriffen hatte, behielt den Zugang trotz neuem Passwort —
    // und genau davor soll ein Passwortwechsel schuetzen (24.08.).
    //
    // decoded.iat ist die Ausstellungszeit in Sekunden. Eine Sekunde Toleranz,
    // weil iat abgerundet wird: Ohne sie flog ein Token, das im selben Moment
    // wie die Aenderung entstand, sofort wieder raus — etwa das frische Token
    // direkt nach dem Setzen eines neuen Passworts.
    if (user.passwort_geaendert_am && decoded.iat) {
      const geaendert = Math.floor(new Date(user.passwort_geaendert_am).getTime() / 1000);
      if (Number.isFinite(geaendert) && decoded.iat < geaendert - 1) {
        return res.status(401).json({ message: 'Anmeldung abgelaufen, bitte neu anmelden' });
      }
    }

    // Füge vollständige User-Informationen zum Request hinzu
    req.user = user;

    // Gleitende Sitzung: Bei Nutzung laeuft die Anmeldung nicht ab. Ein neues
    // Token geht ueber einen Antwort-Header zurueck, sobald die halbe Laufzeit
    // vorbei ist. Nur fuer JWT — API-Schluessel haben eigene Gueltigkeit.
    erneuereBeiBedarf(decoded, res);

    next();
  } catch (error) {
    // Details nur ins Log, nicht an den Client: "invalid signature" vs.
    // "jwt expired" verraet Angreifern, woran ihr Token scheitert.
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

    const requestedId = parseInt(req.params[paramName]);
    
    if (req.user.role !== 'admin' && req.user.id !== requestedId) {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
    }

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