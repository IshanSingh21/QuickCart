const config = require('./env');

const LogLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4
};

const currentLevel = (() => {
  const level = (config.logging.level || '').toUpperCase();
  return LogLevels[level] !== undefined ? LogLevels[level] : (config.env === 'test' ? LogLevels.SILENT : LogLevels.INFO);
})();

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  if (config.env === 'production') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(meta && typeof meta === 'object' ? meta : { meta })
    });
  }
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

const logger = {
  debug(message, meta) {
    if (currentLevel <= LogLevels.DEBUG) {
      console.debug(formatMessage('DEBUG', message, meta));
    }
  },
  info(message, meta) {
    if (currentLevel <= LogLevels.INFO) {
      console.info(formatMessage('INFO', message, meta));
    }
  },
  warn(message, meta) {
    if (currentLevel <= LogLevels.WARN) {
      console.warn(formatMessage('WARN', message, meta));
    }
  },
  error(message, meta) {
    if (currentLevel <= LogLevels.ERROR) {
      console.error(formatMessage('ERROR', message, meta));
    }
  }
};

module.exports = logger;
