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

const SENSITIVE_KEY_REGEX = /password|token|secret|authorization|cookie|cardnumber|cvv|creditcard|apikey/i;

/**
 * Deeply sanitizes sensitive data fields (e.g. passwords, tokens, credit card info)
 * before serialization to logs to protect against sensitive data exposure (OWASP A09).
 */
function sanitizeData(data, visited = new WeakSet()) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (visited.has(data)) return '[CIRCULAR]';
  visited.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, visited));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value, visited);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const safeMeta = meta ? sanitizeData(meta) : null;
  if (config.env === 'production') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(safeMeta && typeof safeMeta === 'object' ? safeMeta : { meta: safeMeta })
    });
  }
  const metaStr = safeMeta ? ` ${JSON.stringify(safeMeta)}` : '';
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
  },
  sanitizeData,
  formatMessage
};

module.exports = logger;
