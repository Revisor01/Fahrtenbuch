const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { 
    authMiddleware, 
    requireRole, 
    requireAdminOrSelf, 
    requireVerifiedEmail 
} = require('../middleware/authMiddleware');

// Admin-only routes
router.get('/', authMiddleware, requireRole('admin'), userController.getAllUsers);
router.post('/', authMiddleware, requireRole('admin'), userController.createUser);
router.delete('/:id', authMiddleware, requireRole('admin'), userController.deleteUser);

// Admin or self routes
router.put('/:id', authMiddleware, requireAdminOrSelf('id'), userController.updateUser);
router.put('/:id/password', authMiddleware, requireAdminOrSelf('id'), userController.changePassword);
router.post('/resend-verification', authMiddleware, userController.resendVerification);

// Public routes (no auth required)
router.post('/reset-password', userController.requestPasswordReset);
router.post('/reset-password/verify', userController.resetPassword);
router.post('/set-password', userController.setPassword);
router.post('/verify-email', userController.verifyEmail);

// Protected routes
router.get('/me', authMiddleware, requireVerifiedEmail, (req, res) => {
    // Entferne sensitive Daten
    const { password, ...user } = req.user;
    res.json(user);
});

module.exports = router;