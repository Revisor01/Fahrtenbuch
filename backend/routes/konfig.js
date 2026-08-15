const router = require('express').Router();
const konfigController = require('../controllers/konfigController');
const { instanzLimiter } = require('../middleware/rateLimiter');

// Bewusst ohne authMiddleware: Die App braucht diese Werte, bevor sich
// jemand anmelden kann — etwa um zu wissen, ob eine Registrierung
// angeboten wird. Derselbe grosszuegige Limiter wie beim Instanz-Verzeichnis.
router.get('/', instanzLimiter, konfigController.getKonfig);

module.exports = router;
