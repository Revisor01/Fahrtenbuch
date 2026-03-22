const express = require('express');
const router = express.Router();
const fahrtController = require('../controllers/fahrtController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Fügen Sie authMiddleware zu allen Routen hinzu
router.use(authMiddleware);

router.post('/', fahrtController.createFahrt);
router.get('/', fahrtController.getAllFahrten);
router.get('/export/:type/:year/:month', fahrtController.exportToExcel);
router.get('/export-range/:type/:startYear/:startMonth/:endYear/:endMonth', fahrtController.exportToExcelRange);
router.get('/report/:year/:month', fahrtController.getMonthlyReport);
router.get('/monthly-summary', fahrtController.getMonthlySummary); 
router.get('/year-summary/:year', fahrtController.getYearSummary);
router.get('/report-range/:startYear/:startMonth/:endYear/:endMonth', fahrtController.getReportRange);
router.get('/:id', fahrtController.getFahrtById);
router.put('/:id', fahrtController.updateFahrt);
router.delete('/:id', fahrtController.deleteFahrt);
router.post('/:fahrtId/mitfahrer', fahrtController.addMitfahrer);
router.put('/:fahrtId/mitfahrer/:mitfahrerId', fahrtController.updateMitfahrer);
router.delete('/:fahrtId/mitfahrer/:mitfahrerId', fahrtController.deleteMitfahrer);
router.post('/abrechnungsstatus', fahrtController.updateAbrechnungsStatus);

module.exports = router;