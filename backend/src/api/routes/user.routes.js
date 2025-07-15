// backend/src/api/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

// AQUI ESTÁ A MÁGICA:
// Colocamos o `authMiddleware.verifyToken` ANTES da função do controller.
// A rota só será acessada se o middleware chamar a função next().
router.get('/users/me', authMiddleware.verifyToken, userController.getMyProfile);
// NOVA ROTA POST para iniciar a atualização
router.post('/users/me/refresh-names', authMiddleware.verifyToken, userController.refreshEvaluatedPlayerNames);
router.get('/users/me/stats', authMiddleware.verifyToken, userController.getUserStats);


module.exports = router;