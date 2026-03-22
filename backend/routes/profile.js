const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { updateProfileSchema, changePasswordSchema } = require('../schemas/profileSchemas');

router.use(authMiddleware);

router.get('/', profileController.getProfile);
router.put('/', validate(updateProfileSchema), profileController.updateProfile);
router.put('/change-password', validate(changePasswordSchema), profileController.changePassword);

module.exports = router;
