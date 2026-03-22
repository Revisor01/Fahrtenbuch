const express = require('express');
const router = express.Router();
const abrechnungstraegerController = require('../controllers/abrechnungstraegerController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createAbrechnungstraegerSchema, updateAbrechnungstraegerSchema, addErstattungssatzSchema, updateErstattungssatzSchema, updateSortOrderSchema } = require('../schemas/abrechnungstraegerSchemas');

router.use(authMiddleware);

router.get('/', abrechnungstraegerController.getAllAbrechnungstraeger);
router.get('/simple', abrechnungstraegerController.getSimpleList);
router.put('/sort', validate(updateSortOrderSchema), abrechnungstraegerController.updateSortOrder);  // Diese Route muss vor /:id Routes stehen
router.post('/', validate(createAbrechnungstraegerSchema), abrechnungstraegerController.createAbrechnungstraeger);
router.put('/:id', validate(updateAbrechnungstraegerSchema), abrechnungstraegerController.updateAbrechnungstraeger);
router.delete('/:id', abrechnungstraegerController.deleteAbrechnungstraeger);
router.get('/:id/historie', abrechnungstraegerController.getErstattungshistorie);
router.put('/:id/erstattung/:erstattungssatzId', validate(updateErstattungssatzSchema), abrechnungstraegerController.updateErstattungssatz);
router.post('/:id/erstattung', validate(addErstattungssatzSchema), abrechnungstraegerController.addErstattungssatz);
router.delete('/:id/erstattung/:erstattungssatzId', abrechnungstraegerController.deleteErstattungssatz);
router.get('/:id', abrechnungstraegerController.getById);

module.exports = router;