const express = require('express');
const router = express.Router();
const steamController = require('../../controllers/steam.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// Ambas as rotas precisam que o usuário esteja logado
router.get('/steam/match-history', authMiddleware.verifyToken, steamController.getMatchHistory);
router.get('/steam/match-details/:matchId', authMiddleware.verifyToken, steamController.getMatchDetails);

module.exports = router;