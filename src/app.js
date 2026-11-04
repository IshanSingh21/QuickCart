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

// Hardened Security HTTP headers for REST API
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// Dynamic CORS configuration complying with W3C specification for credentialed requests
const allowedOrigins = config.corsOrigin
  ? config.corsOrigin.split(',').map((o) => o.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients (mobile, server-to-server, curl) with no origin header
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes('*')) {
      // Reflect origin to comply with CORS spec when credentials: true
      return callback(null, origin);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }

    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With']
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
