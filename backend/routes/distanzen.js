const express = require('express');
const router = express.Router();
const distanzController = require('../controllers/distanzController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { createDistanzSchema, updateDistanzSchema } = require('../schemas/distanzSchemas');

router.use(authMiddleware);

router.post('/', validate(createDistanzSchema), distanzController.createOrUpdateDistanz);
router.get('/between', distanzController.getDistanz);
router.get('/', distanzController.getAllDistanzen);
router.put('/:id', validate(updateDistanzSchema), distanzController.updateDistanz);
router.delete('/:id', distanzController.deleteDistanz);

module.exports = router;