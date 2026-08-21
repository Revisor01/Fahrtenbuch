const express = require('express');
const router = express.Router();
const anlassController = require('../controllers/anlassController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createAnlassSchema, updateAnlassSchema } = require('../schemas/anlassSchemas');

// Alle Routen mit authMiddleware
router.use(authMiddleware);

router.get('/', anlassController.getAllAnlaesse);
router.post('/', validate(createAnlassSchema), anlassController.createAnlass);
router.get('/:id', anlassController.getAnlassById);
router.put('/:id', validate(updateAnlassSchema), anlassController.updateAnlass);
router.delete('/:id', anlassController.deleteAnlass);

module.exports = router;
