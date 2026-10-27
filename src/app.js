const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config/env');
const requestLogger = require('./middlewares/request-logger');
const notFoundHandler = require('./middlewares/not-found');
const errorHandler = require('./middlewares/error-handler');
const { generalLimiter } = require('./middlewares/rate-limiter');
const apiRoutes = require('./routes/api.routes');
const healthController = require('./modules/health/health.controller');
const ApiResponse = require('./utils/api-response');

const app = express();

// Security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

// Body parsing middlewares with safe payload limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Structured request logging
app.use(requestLogger);

// Root route
app.get('/', (req, res) => {
  return ApiResponse.success(res, {
    message: 'Welcome to QuickCart Backend API',
    data: {
      version: '0.1.0',
      docs: '/api/v1/health',
      environment: config.env
    }
  });
});

// Container liveness/readiness direct probe
app.get('/health', healthController.checkHealth.bind(healthController));

// Versioned API Routes (/api/v1/*)
app.use(config.apiPrefix, generalLimiter, apiRoutes);

// Catch 404 for unhandled routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
