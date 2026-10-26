const { PrismaClient } = require('@prisma/client');
const config = require('../config/env');
const logger = require('../config/logger');

const prismaOptions = {
  log: config.env === 'development'
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ]
    : [{ emit: 'event', level: 'error' }]
};

const prisma = new PrismaClient(prismaOptions);

if (config.env === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`[Prisma Query] ${e.query} (${e.duration}ms)`);
  });
}

prisma.$on('error', (e) => {
  logger.error(`[Prisma Error] ${e.message}`);
});

module.exports = prisma;
