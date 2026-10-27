const { Router } = require('express');
const healthRoutes = require('../modules/health/health.routes');
const authRoutes = require('../modules/auth/auth.routes');

const router = Router();

// Mount module routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);

module.exports = router;
