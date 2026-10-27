const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
    authMiddleware,
    requireRole,
    requireAdminOrSelf
} = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { resetLimiter, passwortLimiter, mailLimiter } = require('../middleware/rateLimiter');
const { createUserSchema, updateUserSchema, resetPasswordRequestSchema, resetPasswordSchema, setPasswordSchema, verifyEmailSchema, resendVerificationSchema, changePasswordSchema } = require('../schemas/userSchemas');


// Öffentliche Routen, alle begrenzt, auch das Einlösen von Tokens.
router.post('/reset-password/request', resetLimiter, validate(resetPasswordRequestSchema), userController.requestPasswordReset);
router.post('/reset-password/verify', resetLimiter, validate(resetPasswordSchema), userController.resetPassword);
router.post('/set-password', resetLimiter, validate(setPasswordSchema), userController.setPassword);
router.post('/verify-email', resetLimiter, validate(verifyEmailSchema), userController.verifyEmail);

// Protected routes
router.get('/me', authMiddleware, userController.getCurrentUser);
router.post('/resend-verification', authMiddleware, mailLimiter, validate(resendVerificationSchema), userController.resendVerification);

// passwortLimiter nach authMiddleware, weil er je Konto zählt.
router.put('/:id/password', authMiddleware, passwortLimiter, requireAdminOrSelf('id'), validate(changePasswordSchema), userController.changePassword);
router.put('/:id', authMiddleware, requireAdminOrSelf('id'), validate(updateUserSchema), userController.updateUser);

// Admin-only routes
router.get('/', authMiddleware, requireRole('admin'), userController.getAllUsers);
router.post('/', authMiddleware, requireRole('admin'), validate(createUserSchema), userController.createUser);
router.delete('/:id', authMiddleware, requireRole('admin'), userController.deleteUser);

module.exports = router;