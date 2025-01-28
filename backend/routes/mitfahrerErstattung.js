const express = require('express');
const router = express.Router();
const mitfahrerErstattungController = require('../controllers/mitfahrerErstattungController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/current', mitfahrerErstattungController.getCurrentBetrag);
router.get('/historie', mitfahrerErstattungController.getHistorie);
router.post('/', mitfahrerErstattungController.setBetrag);

module.exports = router;