const router = require('express').Router();
const instanzController = require('../controllers/instanzController');
const { instanzLimiter } = require('../middleware/rateLimiter');

// Ohne authMiddleware, die App braucht die Liste vor dem Login.
router.get('/', instanzLimiter, instanzController.getAllInstanzen);

module.exports = router;
