const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { passwortLimiter } = require('../middleware/rateLimiter');
const {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
} = require('../schemas/profileSchemas');

router.use(authMiddleware);

router.get('/', profileController.getProfile);
router.put('/', validate(updateProfileSchema), profileController.updateProfile);
router.put('/change-password', passwortLimiter, validate(changePasswordSchema), profileController.changePassword);

// Konto löschen, mit dem Passwort-Limiter, weil die Route ein Passwort prüft.
router.delete('/', passwortLimiter, validate(deleteAccountSchema), profileController.deleteAccount);

module.exports = router;
