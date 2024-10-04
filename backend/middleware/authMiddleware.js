const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('Received Authorization header:', authHeader);

  if (!authHeader) {
    return res.status(401).json({ message: 'Kein Authentifizierungstoken vorhanden' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    res.status(401).json({ message: 'Ungültiges Token', error: error.message });
  }
};

module.exports = authMiddleware;