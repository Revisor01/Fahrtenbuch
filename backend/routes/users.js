const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const User = require('../models/User');  // Wichtig: User-Model importieren
const { 
    authMiddleware, 
    requireRole, 
    requireAdminOrSelf, 
    requireVerifiedEmail 
} = require('../middleware/authMiddleware');

// Public routes first
router.post('/reset-password/request', userController.requestPasswordReset);
router.post('/reset-password/verify', userController.resetPassword);
router.post('/reset-password/set', userController.setPassword);
router.post('/set-password', userController.setPassword);
router.post('/verify-email', userController.verifyEmail);

// Protected routes
router.get('/me', authMiddleware, userController.getCurrentUser);
router.post('/resend-verification', authMiddleware, userController.resendVerification);

// Admin or self routes
router.put('/:id/password', authMiddleware, requireAdminOrSelf('id'), userController.changePassword);
router.put('/:id', authMiddleware, requireAdminOrSelf('id'), userController.updateUser);

// Admin-only routes
router.get('/', authMiddleware, requireRole('admin'), userController.getAllUsers);
router.post('/', authMiddleware, requireRole('admin'), userController.createUser);
router.delete('/:id', authMiddleware, requireRole('admin'), userController.deleteUser);

module.exports = router;