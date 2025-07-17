// backend/src/api/routes/health.routes.js
const express = require('express');
const router = express.Router();
const healthController = require('../../controllers/health.controller');

// A rota agora é /health e chama a nova função getHealthStatus
router.get('/health', healthController.getHealthStatus);

module.exports = router;