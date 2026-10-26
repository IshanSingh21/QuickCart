const logger = require('../../src/config/logger');

describe('Logger Utility', () => {
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleDebugSpy;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log messages at various log levels without crashing', () => {
    logger.debug('Debug test message', { debug: true });
    logger.info('Info test message', { info: true });
    logger.warn('Warn test message', { warn: true });
    logger.error('Error test message', { error: true });

    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
