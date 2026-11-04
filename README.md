# QuickCart - Backend-Focused E-Commerce Platform

A production-grade, backend-focused e-commerce RESTful API built as an SDE portfolio project demonstrating deep proficiency in distributed systems patterns, database transaction isolation, concurrency management, and in-memory caching.

---

## 🛠 Tech Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime & Server** | Node.js (v20+) / Express.js | High-throughput asynchronous event-driven I/O, modular layered architecture |
| **Primary Database** | PostgreSQL 16 | Relational ACID compliance, strict foreign key constraints, NUMERIC precision |
| **Object-Relational Mapping** | Prisma ORM | Type-safe schema definition, parameterized queries, interactive transactions |
| **In-Memory Cache & Queue** | Redis 7 & BullMQ | Sub-millisecond catalog caching, rate limiting, and delayed asynchronous jobs |
| **Testing Suite** | Jest & Supertest | Comprehensive unit tests, integration tests, and concurrency race tests |
| **Containerization** | Docker & Docker Compose | Multi-container reproducible local and production deployment environments |
| **CI/CD** | GitHub Actions | Automated linting, test suite execution, and migration verification |

---

## 💡 Key Architectural Highlights (SDE Interview Talking Points)

1. **Atomic Concurrency & Inventory Race Condition Elimination:**
   - Naive read-then-write logic causes overselling in flash sales. QuickCart uses atomic conditional updates at the PostgreSQL engine level (`WHERE stock >= requested_quantity`) inside an ACID transaction to guarantee zero overselling under heavy concurrent load.
2. **Server-Side Price Authority (Zero-Trust Client Design):**
   - Prices, discounts, and order subtotals are calculated dynamically by the backend using authoritative database records. Client payloads attempting to tamper with pricing are completely ignored.
3. **Idempotent Mutations via `Idempotency-Key`:**
   - Critical mutating operations (order checkout, payment execution) enforce unique UUIDv4 idempotency keys with distributed Redis locking to safely handle network retries without duplicate orders or double debits.
4. **Cache-Aside In-Memory Acceleration:**
   - Redis caches catalog queries and category trees with TTLs. Admin mutations trigger surgical cache invalidation, ensuring sub-5ms read latency while maintaining data freshness.
5. **Asynchronous Order TTL & Inventory Recovery:**
   - Uses **BullMQ** with Redis delayed jobs to automatically expire unpaid orders after 15 minutes, safely restoring reserved inventory to the warehouse stock without periodic full-table database scans.
6. **Strict Ownership Isolation & Live Cart Valuation:**
   - Carts dynamically calculate line totals and subtotals from authoritative live catalog prices using `Prisma.Decimal` arbitrary-precision arithmetic. Cart line items enforce strict ownership validation against the authenticated JWT session, returning 404 on mismatched user IDs to neutralize IDOR enumeration attacks.
7. **Decoupled Two-Phase Payment Settlement & PCI-DSS Safety:**
   - External payment gateway calls are strictly decoupled from database transactions to prevent connection starvation and dual-write split-brain state. Payment attempts enforce unique idempotency keys, safe replay cache, and deterministic state transitions (`INITIATED` -> `SUCCEEDED` / `FAILED`). Zero cardholder data is collected, fully complying with PCI-DSS.
8. **Comprehensive Security & Concurrency Defense Matrix (Phase 8):**
   - Verified across 36 test suites and 298 automated tests (86.54% line coverage). Implements fail-fast startup checks for production secrets, deep recursive log sanitization for sensitive credentials and card data (OWASP A09), Helmet security headers, W3C-compliant credentialed CORS validation, 10kb request body limits to thwart memory exhaustion DoS attacks, and deterministic tests for concurrent purchases, transaction rollback, and rate limiting.

---

## 📂 Project Structure

```
quickcart/
├── .env.example              # Blueprint for all environment configuration variables
├── .env                      # Local development environment configuration (gitignored)
├── .env.test                 # Isolated test environment configuration
├── .gitignore                # Production git ignore definitions
├── docker-compose.yml        # PostgreSQL 16 and Redis 7 multi-container orchestration
├── jest.config.js            # Jest testing configuration and coverage setup
├── package.json              # Project manifest and task automation scripts
├── README.md                 # Project overview, architecture, and getting started
├── docs/                     # Comprehensive architectural documentation suite
│   ├── architecture.md       # High-level architecture, concurrency, and caching design
│   ├── schema.md             # ERD, data dictionary, and complete Prisma schema preview
│   ├── api-specs.md          # REST API contracts, JSON envelope, and error formats
│   ├── security.md           # Threat modeling (STRIDE) and OWASP top 10 defenses
│   ├── testing-strategy.md   # Test pyramid, concurrency testing, and QA architecture
│   ├── roadmap.md            # Detailed phase-by-phase implementation plan
│   └── setup-and-migrations.md # Safe database setup and migration workflow
├── prisma/
│   ├── schema.prisma         # Authoritative Prisma schema with 11 relational models
│   └── migrations/
│       ├── 20261026000000_init/ # Initial migration SQL script
│       │   └── migration.sql
│       └── 20261030000000_catalog_indexes/ # Category hierarchy and product catalog indexes
│           └── migration.sql
├── src/
│   ├── app.js                # Express app setup, security headers, middleware pipeline
│   ├── server.js             # HTTP server listener and graceful shutdown handlers
│   ├── config/
│   │   ├── env.js            # Centralized environment configuration and fail-fast validation
│   │   └── logger.js         # Structured JSON / formatted console logger
│   ├── constants/
│   │   └── http-status.js    # HTTP status codes and domain error codes enum
│   ├── jobs/                 # BullMQ asynchronous queue & background workers
│   │   ├── notification.queue.js  # Order confirmation queue with bounded exponential retries
│   │   └── notification.worker.js # Idempotent worker with audit tracking & DLQ alert
│   ├── lib/
│   │   ├── prisma.js         # PrismaClient singleton with event logging
│   │   └── redis.js          # Resilient ioredis client singleton with non-blocking scanDel & fallback
│   ├── middlewares/
│   │   ├── auth.js           # JWT authentication and Role-Based Access Control (RBAC)
│   │   ├── error-handler.js  # Centralized global error handler (Prisma, Zod, AppError)
│   │   ├── not-found.js      # 404 handler for unmatched routes
│   │   ├── rate-limiter.js   # Hybrid distributed rate limiters (RedisStore with MemoryStore fallback)
│   │   ├── request-logger.js # Morgan HTTP request logging with response latency
│   │   └── validate.js       # Reusable Zod schema request validation middleware
│   ├── modules/
│   │   ├── auth/             # Authentication & user identity domain
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.validation.js
│   │   ├── cart/             # Shopping cart & server-side price authority domain
│   │   │   ├── cart.controller.js
│   │   │   ├── cart.routes.js
│   │   │   ├── cart.service.js
│   │   │   └── cart.validation.js
│   │   ├── categories/       # Hierarchical category management domain
│   │   │   ├── categories.controller.js
│   │   │   ├── categories.routes.js
│   │   │   ├── categories.service.js
│   │   │   └── categories.validation.js
│   │   ├── health/           # Healthcheck module
│   │   │   ├── health.controller.js
│   │   │   ├── health.routes.js
│   │   │   └── health.service.js
│   │   ├── orders/           # Orders, inventory reservation & checkout ACID transactions
│   │   │   ├── orders.controller.js
│   │   │   ├── orders.routes.js
│   │   │   ├── orders.service.js
│   │   │   └── orders.validation.js
│   │   ├── payments/         # Simulated payment provider & decoupled settlement
│   │   │   ├── payments.controller.js
│   │   │   ├── payments.routes.js
│   │   │   ├── payments.service.js
│   │   │   ├── payments.validation.js
│   │   │   └── simulated-payment-provider.js
│   │   └── products/         # Product catalog, filtering, search & pagination domain
│   │       ├── products.controller.js
│   │       ├── products.routes.js
│   │       ├── products.service.js
│   │       └── products.validation.js
│   ├── routes/
│   │   └── api.routes.js     # Top-level API router mounting module sub-routers
│   ├── services/
│   │   └── cache.service.js  # Non-authoritative catalog cache-aside with surgical SCAN invalidation
│   └── utils/
│       ├── api-response.js   # Standard success/error JSON response envelope formatters
│       ├── app-error.js      # Operational domain error class with static helpers
│       ├── password.js       # Bcrypt salted hashing and secure comparison
│       ├── slugify.js        # URL-safe slug generation utility
│       └── token.js          # Cryptographic JWT access & refresh token rotation utilities
└── tests/
    ├── helpers/
    │   └── test-db.js        # Deterministic test database truncate and entity seeding harness
    ├── integration/
    │   ├── auth.test.js      # Supertest integration tests for register, login, me, refresh, logout, RBAC
    │   ├── cart.test.js      # Supertest integration tests for cart lifecycle, price authority, IDOR defense
    │   ├── categories.test.js# Supertest integration tests for category hierarchy, CRUD, and admin RBAC
    │   ├── concurrency-and-rollback.test.js # Race condition elimination, transaction rollback, and idempotency
    │   ├── distributed-rate-limiter.test.js # Distributed rate limiting and graceful in-memory fallback
    │   ├── health.test.js    # Supertest integration tests for /api/v1/health, 404, malformed JSON
    │   ├── orders.test.js    # Supertest integration tests for checkout, rollback, idempotency, race conditions
    │   ├── payments.test.js  # Supertest integration tests for simulated payment, idempotency replay, declines
    │   ├── products.test.js  # Supertest integration tests for catalog, search, pagination, price bounds
    │   ├── rate-limiting-stress.test.js # Volumetric rate limiting protection and Retry-After header enforcement
    │   ├── redis-caching.test.js # Cache-aside hits/misses, surgical invalidation, zero-leak privacy
    │   └── security-and-headers.test.js # Helmet security headers, CORS origin validation, SQLi probes, 10kb body limit
    └── unit/
        ├── api-response.test.js       # Unit tests for response envelopes
        ├── app-error.test.js          # Unit tests for AppError factory
        ├── auth-middleware.test.js    # Unit tests for JWT verification & role authorization
        ├── auth-service.test.js       # Unit tests for authentication logic & token reuse protocol
        ├── cache-service.test.js      # Unit tests for deterministic hashing and surgical invalidation
        ├── cart-service.test.js       # Unit tests for live decimal pricing, stock limits, and IDOR isolation
        ├── categories-service.test.js # Unit tests for category tree and CRUD logic
        ├── error-handler.test.js      # Unit tests for centralized error middleware
        ├── job-processing-resilience.test.js # Unit tests for BullMQ job processor, DLQ, and offline queue resilience
        ├── logger.test.js             # Unit tests for logger utility
        ├── logger-sanitizer.test.js   # Unit tests for recursive sensitive data masking (passwords, tokens, cards)
        ├── notification-queue.test.js # Unit tests for BullMQ queue, fail-open resilience, and jobId
        ├── notification-worker.test.js# Unit tests for idempotent job execution and DLQ handling
        ├── orders-service.test.js     # Unit tests for checkout ACID transactions, stock reservation, restock
        ├── password.test.js           # Unit tests for bcrypt hashing & comparison
        ├── payments-service.test.js   # Unit tests for 3-phase decoupled payments, idempotency, state transitions
        ├── production-secrets.test.js # Unit tests for fail-fast production startup validation of JWT secrets
        ├── products-service.test.js   # Unit tests for product filtering, active state rules, and stock logic
        ├── rate-limiter.test.js       # Unit tests for rate limiting error handler
        ├── redis-client.test.js       # Unit tests for ioredis singleton and offline fail-open wrappers
        ├── simulated-payment-provider.test.js # Unit tests for PCI-DSS simulated gateway provider
        ├── slugify.test.js            # Unit tests for slugify string transformation
        ├── token.test.js              # Unit tests for JWT signing & SHA-256 token hashing
        └── validation-middleware.test.js # Unit tests for Zod request validation
```

---

## 🚀 Quickstart & Verification

### 1. Prerequisites
- **Node.js**: v20 or higher
- **Docker & Docker Compose**: v20+ (or local PostgreSQL 16)

### 2. Environment Setup
```bash
cp .env.example .env
```

### 3. Start PostgreSQL and Redis Infrastructure
```bash
docker compose up -d
docker compose ps
```

### 4. Run Database Migrations
```bash
npx prisma migrate dev --name init
```

### 5. Run Automated Tests
```bash
# Run all unit and integration tests
npm test

# Run tests with coverage reporting
npm run test:coverage
```

### 6. Start the API Server
```bash
# Development mode with hot-reloading
npm run dev

# Production mode
npm start
```

---

## 📚 Documentation Index

- [System Architecture & Concurrency Strategy](file:///docs/architecture.md)
- [Data Entities, ERD & Schema Design](file:///docs/schema.md)
- [REST API Specifications & Envelope Standards](file:///docs/api-specs.md)
- [Security Architecture & Threat Mitigation](file:///docs/security.md)
- [Testing Strategy & Quality Assurance](file:///docs/testing-strategy.md)
- [Setup & Migration Workflow](file:///docs/setup-and-migrations.md)
- [Phase-by-Phase Roadmap](file:///docs/roadmap.md)
