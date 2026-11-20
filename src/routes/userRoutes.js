const router = require('express').Router();
const ctrl = require('../controllers/userController');
const auth = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

// Rotas públicas: o cadastro e a geração do token não podem exigir um token
router.post('/token', asyncHandler(ctrl.token));
router.post('/', asyncHandler(ctrl.create));
router.get('/:id', asyncHandler(ctrl.getById));

router.put('/:id', auth, asyncHandler(ctrl.update));
router.delete('/:id', auth, asyncHandler(ctrl.remove));

module.exports = router;
