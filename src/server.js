const app = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const prisma = require('./lib/prisma');

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`QuickCart server started successfully in [${config.env}] mode on port ${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}${config.apiPrefix}/health`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.warn(`Received ${signal}. Initiating graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await prisma.$disconnect();
      logger.info('Database connection closed cleanly.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnect:', { error: err.message });
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds timeout
  setTimeout(() => {
    logger.error('Forced shutdown: Timed out waiting for connections to close.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

module.exports = server;
