const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Basis-Authentifizierung
const authMiddleware = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('Received Authorization header:', authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: 'Kein Authentifizierungstoken vorhanden' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    
    // Lade aktuelle User-Daten aus der Datenbank
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Benutzer nicht gefunden' });
    }

    // Füge vollständige User-Informationen zum Request hinzu
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    res.status(401).json({ message: 'Ungültiges Token', error: error.message });
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