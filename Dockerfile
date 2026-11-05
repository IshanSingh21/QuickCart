# ==============================================================================
# QuickCart Production Multi-Stage Dockerfile
# Optimized for minimal image size, unprivileged execution, and fast builds.
# ==============================================================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install system dependencies required for native builds & Prisma engine
RUN apk add --no-cache openssl libc6-compat python3 make g++

# Copy package manifests & Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies deterministically
RUN npm ci

# Generate Prisma Client for Alpine Linux
RUN npx prisma generate

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Install runtime dependencies: OpenSSL for Prisma, dumb-init for PID 1 signal forwarding
RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production
ENV PORT=5000

# Copy dependencies, Prisma artifacts, and source code from builder
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/prisma ./prisma
COPY --chown=node:node src ./src

# Expose HTTP port
EXPOSE 5000

# Container liveness health check targeting root /health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run as non-root unprivileged user
USER node

# Use dumb-init for graceful SIGTERM/SIGINT propagation
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Apply database migrations and launch server
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
