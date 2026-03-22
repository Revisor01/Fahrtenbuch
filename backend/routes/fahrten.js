const express = require('express');
const router = express.Router();
const fahrtController = require('../controllers/fahrtController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createFahrtSchema, updateFahrtSchema, addMitfahrerSchema, updateMitfahrerSchema, abrechnungsStatusSchema } = require('../schemas/fahrtSchemas');

// Fügen Sie authMiddleware zu allen Routen hinzu
router.use(authMiddleware);

router.post('/', validate(createFahrtSchema), fahrtController.createFahrt);
router.get('/', fahrtController.getAllFahrten);
router.get('/export/:type/:year/:month', fahrtController.exportToExcel);
router.get('/export-range/:type/:startYear/:startMonth/:endYear/:endMonth', fahrtController.exportToExcelRange);
router.get('/export-pdf/:type/:year/:month', fahrtController.exportToPdf);
router.get('/export-pdf-range/:type/:startYear/:startMonth/:endYear/:endMonth', fahrtController.exportToPdfRange);
router.get('/report/:year/:month', fahrtController.getMonthlyReport);
router.get('/monthly-summary', fahrtController.getMonthlySummary);
router.get('/year-summary/:year', fahrtController.getYearSummary);
router.get('/report-range/:startYear/:startMonth/:endYear/:endMonth', fahrtController.getReportRange);
router.get('/:id', fahrtController.getFahrtById);
router.put('/:id', validate(updateFahrtSchema), fahrtController.updateFahrt);
router.delete('/:id', fahrtController.deleteFahrt);
router.post('/:fahrtId/mitfahrer', validate(addMitfahrerSchema), fahrtController.addMitfahrer);
router.put('/:fahrtId/mitfahrer/:mitfahrerId', validate(updateMitfahrerSchema), fahrtController.updateMitfahrer);
router.delete('/:fahrtId/mitfahrer/:mitfahrerId', fahrtController.deleteMitfahrer);
router.post('/abrechnungsstatus', validate(abrechnungsStatusSchema), fahrtController.updateAbrechnungsStatus);

module.exports = router;