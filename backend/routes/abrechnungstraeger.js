const express = require('express');
const router = express.Router();
const abrechnungstraegerController = require('../controllers/abrechnungstraegerController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Alle Routen sind geschützt
router.use(authMiddleware);

// GET /api/abrechnungstraeger
router.get('/', abrechnungstraegerController.getAllAbrechnungstraeger);

// POST /api/abrechnungstraeger
router.post('/', abrechnungstraegerController.createAbrechnungstraeger);

// PUT /api/abrechnungstraeger/:id
router.put('/:id', abrechnungstraegerController.updateAbrechnungstraeger);

// PUT /api/abrechnungstraeger/sort
router.put('/sort', abrechnungstraegerController.updateSortOrder);

// DELETE /api/abrechnungstraeger/:id
router.delete('/:id', abrechnungstraegerController.deleteAbrechnungstraeger);

// GET /api/abrechnungstraeger/:id/historie
router.get('/:id/historie', abrechnungstraegerController.getErstattungshistorie);

router.get('/simple', abrechnungstraegerController.getSimpleList);

module.exports = router;