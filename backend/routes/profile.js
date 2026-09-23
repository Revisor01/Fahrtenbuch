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

// Eigenes Konto loeschen — Pflicht fuer App Store und Play Store.
// Derselbe Limiter wie beim Passwortwechsel: Die Route prueft ein Passwort
// und waere sonst ein Weg, Passwoerter durchzuprobieren.
router.delete('/', passwortLimiter, validate(deleteAccountSchema), profileController.deleteAccount);

module.exports = router;
