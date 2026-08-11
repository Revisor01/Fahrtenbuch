const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { loginSchema, registerSchema } = require('../schemas/authSchemas');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');


router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/register', registerLimiter, validate(registerSchema), authController.register);

module.exports = router;