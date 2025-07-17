const express = require('express');
const router = express.Router();
const gsiController = require('../../controllers/gsi.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Rota POST que espera um array de steamIds no corpo
router.post('/gsi/player-stats', authMiddleware.verifyToken, gsiController.getPlayerStats);

module.exports = router;