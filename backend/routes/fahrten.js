const express = require('express');
const router = express.Router();
const fahrtController = require('../controllers/fahrtController');
const authMiddleware = require('../middleware/authMiddleware'); // Fügen Sie diese Zeile hinzu

// Fügen Sie authMiddleware zu allen Routen hinzu
router.use(authMiddleware);

router.post('/', fahrtController.createFahrt);
router.get('/', fahrtController.getAllFahrten);
router.get('/:id', fahrtController.getFahrtById);
router.put('/:id', fahrtController.updateFahrt);
router.delete('/:id', fahrtController.deleteFahrt);
router.get('/report/:year/:month', fahrtController.getMonthlyReport);
router.get('/monthly-summary', fahrtController.getMonthlySummary);
router.get('/year-summary/:year', fahrtController.getYearSummary);

module.exports = router;