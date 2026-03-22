const express = require('express');
const router = express.Router();
const mitfahrerErstattungController = require('../controllers/mitfahrerErstattungController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { setBetragSchema, updateErstattungssatzSchema } = require('../schemas/mitfahrerErstattungSchemas');

router.use(authMiddleware);

router.get('/current', mitfahrerErstattungController.getCurrentBetrag);
router.get('/historie', mitfahrerErstattungController.getHistorie);
router.post('/', validate(setBetragSchema), mitfahrerErstattungController.setBetrag);
router.put('/:erstattungssatzId', validate(updateErstattungssatzSchema), mitfahrerErstattungController.updateErstattungssatz);
router.delete('/:erstattungssatzId', mitfahrerErstattungController.deleteErstattungssatz);

module.exports = router;