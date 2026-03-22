const express = require('express');
const router = express.Router();
const ortController = require('../controllers/ortController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createOrtSchema, updateOrtSchema } = require('../schemas/ortSchemas');

// Alle Routen mit authMiddleware
router.use(authMiddleware);

router.post('/', validate(createOrtSchema), ortController.createOrt);
router.get('/', ortController.getAllOrte);
router.get('/simple', ortController.getSimpleList);  // VOR /:id
router.get('/:id', ortController.getOrtById);
router.put('/:id', validate(updateOrtSchema), ortController.updateOrt);
router.delete('/:id', ortController.deleteOrt);

module.exports = router;