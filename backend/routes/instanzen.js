const router = require('express').Router();
const instanzController = require('../controllers/instanzController');
const { instanzLimiter } = require('../middleware/rateLimiter');

// Bewusst ohne authMiddleware: die App ruft diese Liste vor dem Login ab,
// um ueberhaupt zu wissen, gegen welchen Server sie sich anmelden soll.
router.get('/', instanzLimiter, instanzController.getAllInstanzen);

module.exports = router;
