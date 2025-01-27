// In routes/orte.js

const express = require('express');
const router = express.Router();
const ortController = require('../controllers/ortController');
const { authMiddleware } = require('../middleware/authMiddleware');
const apiKeyMiddleware = require('../middleware/apiKeyMiddleware');

// Simple Route - MUSS VOR authMiddleware stehen
router.get('/simple', apiKeyMiddleware, ortController.getSimpleList);

// Bestehende Routen mit authMiddleware
router.use(authMiddleware);
router.post('/', ortController.createOrt);
router.get('/', ortController.getAllOrte);
router.get('/:id', ortController.getOrtById);
router.put('/:id', ortController.updateOrt);
router.delete('/:id', ortController.deleteOrt);

module.exports = router;