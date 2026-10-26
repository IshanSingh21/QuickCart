const morgan = require('morgan');
const config = require('../config/env');
const logger = require('../config/logger');

// Custom morgan token for response time in ms
morgan.token('latency', (req, res) => {
  if (!req._startAt || !res._startAt) return '';
  const ms = (res._startAt[0] - req._startAt[0]) * 1e3 + (res._startAt[1] - req._startAt[1]) * 1e-6;
  return `${ms.toFixed(2)}ms`;
});

const morganFormat = config.env === 'production'
  ? JSON.stringify({
      method: ':method',
      url: ':url',
      status: ':status',
      responseTime: ':latency',
      contentLength: ':res[content-length]',
      userAgent: ':user-agent'
    })
  : ':method :url :status :latency - :res[content-length] bytes';

const requestLogger = morgan(morganFormat, {
  skip: () => config.env === 'test',
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
});

module.exports = requestLogger;
