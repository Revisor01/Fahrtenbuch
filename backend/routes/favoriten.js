const router = require('express').Router();
const favoritController = require('../controllers/favoritController');

router.get('/', favoritController.getAllFavoriten);
router.post('/', favoritController.createFavorit);
router.delete('/:id', favoritController.deleteFavorit);
router.post('/:id/execute', favoritController.executeFavorit);

module.exports = router;
