const express = require('express');
const router = express.Router();
const ortController = require('../controllers/ortController');
const authMiddleware = require('../middleware/authMiddleware'); // Fügen Sie diese Zeile hinzu

// Fügen Sie authMiddleware zu allen Routen hinzu
router.use(authMiddleware);

router.post('/', ortController.createOrt);
router.get('/', ortController.getAllOrte);
router.get('/:id', ortController.getOrtById);
router.put('/:id', ortController.updateOrt);
router.delete('/:id', ortController.deleteOrt);

module.exports = router;