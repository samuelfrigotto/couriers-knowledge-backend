// backend/src/api/routes/evaluation.routes.js
const express = require('express');
const router = express.Router();
const evaluationController = require('../../controllers/evaluation.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// A rota POST /evaluations será protegida.
// Apenas usuários autenticados (com um token válido) podem criar avaliações.
router.post('/evaluations', authMiddleware.verifyToken, evaluationController.createEvaluation);

// Lista as avaliações feitas pelo usuário autenticado
router.get('/evaluations/me', authMiddleware.verifyToken, evaluationController.getMyEvaluations);

// Lista as avaliações sobre um jogador específico (pelo steam_id)
router.get('/evaluations/player/:steamId', authMiddleware.verifyToken, evaluationController.getPlayerEvaluations);

// Edita uma avaliação específica (pelo seu ID)
router.put('/evaluations/:id', authMiddleware.verifyToken, evaluationController.updateEvaluation);

// Apaga uma avaliação específica (pelo seu ID)
router.delete('/evaluations/:id', authMiddleware.verifyToken, evaluationController.deleteEvaluation);

// NOVA ROTA GET para buscar as tags
router.get('/evaluations/tags', authMiddleware.verifyToken, evaluationController.getUniqueTags);



module.exports = router;