const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', apiKeyController.generateKey);
router.get('/', apiKeyController.listKeys);
router.get('/test', apiKeyController.testKey);
router.delete('/:id', apiKeyController.deleteKey);

module.exports = router;