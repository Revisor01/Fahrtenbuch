const router = require('express').Router();
const konfigController = require('../controllers/konfigController');
const { instanzLimiter } = require('../middleware/rateLimiter');

// Ohne authMiddleware, die Werte werden vor der Anmeldung gebraucht.
router.get('/', instanzLimiter, konfigController.getKonfig);

module.exports = router;
