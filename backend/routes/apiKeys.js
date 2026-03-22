const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createApiKeySchema } = require('../schemas/apiKeySchemas');

router.use(authMiddleware);

router.post('/', validate(createApiKeySchema), apiKeyController.generateKey);
router.get('/', apiKeyController.listKeys);
router.get('/test', apiKeyController.testKey);
router.delete('/:id', apiKeyController.deleteKey);

module.exports = router;