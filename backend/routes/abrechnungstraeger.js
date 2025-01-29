const express = require('express');
const router = express.Router();
const abrechnungstraegerController = require('../controllers/abrechnungstraegerController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', abrechnungstraegerController.getAllAbrechnungstraeger);
router.get('/simple', abrechnungstraegerController.getSimpleList);
router.put('/sort', abrechnungstraegerController.updateSortOrder);  // Diese Route muss vor /:id Routes stehen
router.post('/', abrechnungstraegerController.createAbrechnungstraeger);
router.put('/:id', abrechnungstraegerController.updateAbrechnungstraeger);
router.delete('/:id', abrechnungstraegerController.deleteAbrechnungstraeger);
router.get('/:id/historie', abrechnungstraegerController.getErstattungshistorie);
router.put('/:id/erstattung/:erstattungssatzId', abrechnungstraegerController.updateErstattungssatz);
router.post('/:id/erstattung', abrechnungstraegerController.addErstattungssatz);
router.delete('/:id/erstattung/:erstattungssatzId', abrechnungstraegerController.deleteErstattungssatz);
router.get('/:id', abrechnungstraegerController.getById);

module.exports = router;