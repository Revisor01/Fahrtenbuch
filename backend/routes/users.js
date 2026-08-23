const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
    authMiddleware,
    requireRole,
    requireAdminOrSelf
} = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { resetLimiter, passwortLimiter } = require('../middleware/rateLimiter');
const { createUserSchema, updateUserSchema, resetPasswordRequestSchema, resetPasswordSchema, setPasswordSchema, verifyEmailSchema, resendVerificationSchema, changePasswordSchema } = require('../schemas/userSchemas');


// Public routes first — alle ohne Anmeldung erreichbar und deshalb begrenzt.
// Das Einloesen eines Tokens war bisher unbegrenzt: genau der Weg, ueber den
// sich Tokens haetten durchprobieren lassen.
router.post('/reset-password/request', resetLimiter, validate(resetPasswordRequestSchema), userController.requestPasswordReset);
router.post('/reset-password/verify', resetLimiter, validate(resetPasswordSchema), userController.resetPassword);
router.post('/set-password', resetLimiter, validate(setPasswordSchema), userController.setPassword);
router.post('/verify-email', resetLimiter, validate(verifyEmailSchema), userController.verifyEmail);

// Protected routes
router.get('/me', authMiddleware, userController.getCurrentUser);
router.post('/resend-verification', authMiddleware, validate(resendVerificationSchema), userController.resendVerification);

// Admin or self routes
// passwortLimiter NACH authMiddleware: Er zaehlt pro Konto, und dafuer muss
// req.user schon stehen — davor faellt er auf die IP zurueck.
router.put('/:id/password', authMiddleware, passwortLimiter, requireAdminOrSelf('id'), validate(changePasswordSchema), userController.changePassword);
router.put('/:id', authMiddleware, requireAdminOrSelf('id'), validate(updateUserSchema), userController.updateUser);

// Admin-only routes
router.get('/', authMiddleware, requireRole('admin'), userController.getAllUsers);
router.post('/', authMiddleware, requireRole('admin'), validate(createUserSchema), userController.createUser);
router.delete('/:id', authMiddleware, requireRole('admin'), userController.deleteUser);

module.exports = router;