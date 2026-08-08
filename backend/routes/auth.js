const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../schemas/authSchemas');

// Alltagstauglich statt streng: Vertippen darf niemanden aussperren.
// Erfolgreiche Logins zählen nicht mit, gebremst wird nur das Raten.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 Minuten
  max: 20, // max 20 Fehlversuche pro IP
  skipSuccessfulRequests: true,
  message: { message: 'Zu viele Login-Versuche. Bitte in 10 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 Minuten
  max: 5, // max 5 Registrierungen pro IP
  message: { message: 'Zu viele Registrierungsversuche. Bitte in 10 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

module.exports = router;