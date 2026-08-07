const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../schemas/authSchemas');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10, // max 10 Versuche pro IP
  message: { message: 'Zu viele Login-Versuche. Bitte in 15 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 Minuten
  max: 5, // max 5 Registrierungen pro IP
  message: { message: 'Zu viele Registrierungsversuche. Bitte in einer Stunde erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

module.exports = router;