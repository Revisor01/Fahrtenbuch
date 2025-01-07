const express = require('express');
const router = express.Router();
const distanzController = require('../controllers/distanzController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Fügen Sie authMiddleware zu allen Routen hinzu
router.use(authMiddleware);

router.post('/', distanzController.createOrUpdateDistanz);
router.get('/between', distanzController.getDistanz);
router.get('/', distanzController.getAllDistanzen);
router.put('/:id', distanzController.updateDistanz);
router.get('/autosplit', distanzController.getAutoSplitDistance);
router.delete('/:id', distanzController.deleteDistanz);

module.exports = router;