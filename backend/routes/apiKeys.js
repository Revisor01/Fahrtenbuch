const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', apiKeyController.generateKey);
router.get('/', apiKeyController.listKeys);
router.delete('/:id', apiKeyController.revokeKey);

module.exports = router;