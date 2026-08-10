const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const userController = require('../controllers/userController');
const {
    authMiddleware,
    requireRole,
    requireAdminOrSelf
} = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createUserSchema, updateUserSchema, resetPasswordRequestSchema, resetPasswordSchema, setPasswordSchema, verifyEmailSchema, resendVerificationSchema, changePasswordSchema } = require('../schemas/userSchemas');

const resetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 Minuten
  max: 5, // max 5 Reset-Anfragen pro IP
  message: { message: 'Zu viele Passwort-Reset-Anfragen. Bitte in 10 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes first
router.post('/reset-password/request', resetLimiter, validate(resetPasswordRequestSchema), userController.requestPasswordReset);
router.post('/reset-password/verify', validate(resetPasswordSchema), userController.resetPassword);
router.post('/set-password', validate(setPasswordSchema), userController.setPassword);
router.post('/verify-email', validate(verifyEmailSchema), userController.verifyEmail);

// Protected routes
router.get('/me', authMiddleware, userController.getCurrentUser);
router.post('/resend-verification', authMiddleware, validate(resendVerificationSchema), userController.resendVerification);

// Admin or self routes
router.put('/:id/password', authMiddleware, requireAdminOrSelf('id'), validate(changePasswordSchema), userController.changePassword);
router.put('/:id', authMiddleware, requireAdminOrSelf('id'), validate(updateUserSchema), userController.updateUser);

// Admin-only routes
router.get('/', authMiddleware, requireRole('admin'), userController.getAllUsers);
router.post('/', authMiddleware, requireRole('admin'), validate(createUserSchema), userController.createUser);
router.delete('/:id', authMiddleware, requireRole('admin'), userController.deleteUser);

module.exports = router;