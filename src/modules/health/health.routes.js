const { Router } = require('express');
const healthController = require('./health.controller');

const router = Router();

// GET /api/v1/health
router.get('/health', healthController.checkHealth.bind(healthController));

module.exports = router;
