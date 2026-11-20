const router = require('express').Router();
const ctrl = require('../controllers/productController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// "/search" precisa vir antes de "/:id"
router.get('/search', asyncHandler(ctrl.search));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', auth, asyncHandler(ctrl.create));
router.put('/:id', auth, asyncHandler(ctrl.update));
router.delete('/:id', auth, asyncHandler(ctrl.remove));

module.exports = router;
