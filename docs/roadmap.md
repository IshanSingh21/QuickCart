# QuickCart Engineering Roadmap & Phase-by-Phase Plan

This document outlines the systematic, phased implementation roadmap for **QuickCart**. Each phase delivers a complete, testable, and runnable milestone.

---

## Roadmap Overview

| Phase | Milestone | Core Focus |
| :---: | :--- | :--- |
| **Phase 0** | **System Architecture & Design** *(Current)* | Architecture, ERD, API specs, security threat model, testing strategy, and foundation configs. |
| **Phase 1** | **Infrastructure, Database & Base App** | Docker Compose, PostgreSQL, Redis, Prisma schema & migrations, Express app skeleton, health check, centralized error handling. |
| **Phase 2** | **Authentication, Authorization & RBAC** | JWT (access/refresh rotation), bcrypt hashing, customer & admin roles, rate limiting on auth endpoints. |
| **Phase 3** | **Product Catalog, Categories & Redis Caching** | Nested categories, product CRUD, search, price/category filtering, cursor/offset pagination, cache-aside Redis integration with invalidation. |
| **Phase 4** | **Shopping Cart Engine** | Cart persistence, server-side price authority (zero client trust), item quantity management, stock pre-validation. |
| **Phase 5** | **Orders & Concurrency-Safe Inventory** | Interactive ACID checkout transactions, atomic conditional stock decrement (`WHERE stock >= requested`), idempotency key verification, order state machine. |
| **Phase 6** | **Simulated Payments & Webhook Handling** | Payment state machine (`INITIATED`, `SUCCEEDED`, `FAILED`), webhook simulation with signature verification, idempotent payment settlement. |
| **Phase 7** | **Background Jobs & Event Automation** | BullMQ workers backed by Redis: 15-minute order expiration TTL, automated inventory restoration, asynchronous notification logging. |
| **Phase 8** | **Test Suite, CI/CD & Production Readiness** | Jest + Supertest test suite (unit, integration, concurrency race tests), GitHub Actions CI pipeline, OpenAPI/Swagger specs, production Dockerfile. |

---

## Detailed Phase Breakdown

### Phase 0: System Architecture & Initialization *(Completed in this phase)*
- **Deliverables:**
  - Architecture blueprint (`docs/architecture.md`)
  - Data entities and Prisma schema design (`docs/schema.md`)
  - REST API contracts and envelope specs (`docs/api-specs.md`)
  - Security threat model and OWASP mitigations (`docs/security.md`)
  - Automated testing strategy (`docs/testing-strategy.md`)
  - Phased roadmap (`docs/roadmap.md`)
  - Initialization configuration (`package.json`, `.env.example`, `.gitignore`, `docker-compose.yml`, `README.md`)
- **Acceptance Criteria:** Validated `docker-compose.yml` syntax, complete documentation suite, runnable initialization scripts.

---

### Phase 1: Infrastructure, Database & Base Application
- **Objectives:** Spin up PostgreSQL 16 and Redis 7 via Docker Compose, apply initial Prisma migrations, establish Express server with structured logging and standardized JSON error handling.
- **Deliverables:**
  - `docker-compose.yml` running and healthy.
  - `prisma/schema.prisma` configured and migrated (`npx prisma migrate dev`).
  - Database connection singleton (`src/lib/prisma.js`) and Redis client (`src/lib/redis.js`).
  - Centralized Express app (`src/app.js`), server bootstrap (`src/server.js`), and health check (`/health`).
  - Global error handler middleware and standard response envelope formatter.
- **Verification:**
  - `docker compose up -d` starts PostgreSQL and Redis with successful healthchecks.
  - `GET /health` returns `200 OK` with database and Redis latency metrics.

---

### Phase 2: Authentication, Authorization & RBAC
- **Objectives:** Build a secure, production-grade authentication system with refresh token rotation and role-based access control.
- **Deliverables:**
  - `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh-token`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
  - Passwords hashed with bcrypt (salt rounds 12).
  - Refresh tokens stored hashed (SHA-256) in DB with rotation and revocation.
  - `authenticate` and `requireRole('ADMIN')` middlewares.
  - Strict rate limiter on `/auth` endpoints.
- **Verification:**
  - Registration returns JWT access and refresh tokens.
  - Expired access tokens can be refreshed using the valid refresh token; revoked refresh tokens are rejected.
  - Customer cannot access admin routes (`403 Forbidden`).

---

### Phase 3: Product Catalog, Categories & Redis Caching
- **Objectives:** Create hierarchical category management and high-performance product browsing with full-text search, filtering, and Redis caching.
- **Deliverables:**
  - Category tree endpoints (`/api/v1/categories`).
  - Product catalog endpoints (`GET /api/v1/products`) with query filters (`search`, `category`, `minPrice`, `maxPrice`, `sortBy`, `page`, `limit`).
  - Admin CRUD endpoints for products and categories.
  - Redis cache-aside layer: catalog reads cached with TTL; admin mutations invalidate corresponding cache keys.
- **Verification:**
  - Catalog query hits database on first request and Redis on subsequent requests (<5ms response time).
  - Updating a product instantly invalidates the cached entry.

---

### Phase 4: Shopping Cart Engine
- **Objectives:** Implement server-side shopping cart with dynamic price resolution and stock pre-checks.
- **Deliverables:**
  - `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PATCH /api/v1/cart/items/:itemId`, `DELETE /api/v1/cart/items/:itemId`, `DELETE /api/v1/cart`.
  - Server-side price authority: Client submits only `productId` and `quantity`. Cart computes line totals and subtotals dynamically from the current product catalog.
  - Stock validation prevents adding more units than currently available.
- **Verification:**
  - Tampered client price payloads are disregarded.
  - Cart totals update accurately when product quantities are modified.

---

### Phase 5: Orders & Concurrency-Safe Inventory Management
- **Objectives:** Orchestrate checkout transactions preventing race conditions and double-spending.
- **Deliverables:**
  - `POST /api/v1/orders/checkout` with mandatory `Idempotency-Key` header.
  - Atomic database transaction (`prisma.$transaction`) executing conditional SQL update (`WHERE stock >= requested`).
  - Creation of immutable `OrderItem` records capturing historical unit price snapshot.
  - Cart clearing upon successful checkout.
  - `InventoryLog` audit entry recording stock deduction.
- **Verification:**
  - Simultaneous checkout of the last remaining stock unit succeeds for 1 user and fails with `409 Conflict` for concurrent users.
  - Duplicate checkout request with identical idempotency key returns the existing order without duplicate charging or stock deductions.

---

### Phase 6: Simulated Payment Processing & Webhooks
- **Objectives:** Implement simulated payment gateway integration with idempotent webhook processing and safe order state transitions.
- **Deliverables:**
  - `POST /api/v1/payments/orders/:orderId/pay` with `Idempotency-Key`.
  - Payment intent creation, state machine transitions (`INITIATED` -> `SUCCEEDED` / `FAILED`), and simulated gateway latency/failure rate flags.
  - Order status updated to `PAID` upon payment success.
  - Webhook endpoint (`POST /api/v1/payments/webhook`) handling asynchronous settlement safely.
- **Verification:**
  - Successful payment marks order `PAID`.
  - Duplicate payment requests with same idempotency key are rejected or return existing payment record.

---

### Phase 7: Background Jobs & Asynchronous Workflows
- **Objectives:** Deploy BullMQ workers backed by Redis to manage order expiration TTL and automated inventory replenishment.
- **Deliverables:**
  - BullMQ queue setup (`order-expiration-queue`) and worker process.
  - Upon order creation, a delayed job is scheduled with a 15-minute TTL.
  - If order remains `PENDING_PAYMENT` after 15 minutes, the worker updates status to `EXPIRED` and atomically restores reserved product stock.
  - `InventoryLog` records `EXPIRATION_RELEASE`.
- **Verification:**
  - Unpaid order automatically transitions to `EXPIRED` after timeout, and product stock increases back to previous quantity.

---

### Phase 8: Testing Suite, CI/CD & Production Readiness
- **Objectives:** Finalize automated test suite, GitHub Actions CI workflow, API documentation, and multi-stage Docker containerization.
- **Deliverables:**
  - Complete Jest + Supertest test suite (unit, integration, concurrency race tests).
  - GitHub Actions CI workflow (`.github/workflows/ci.yml`) running linter, migrations, and tests against Postgres/Redis services.
  - Swagger / OpenAPI documentation (`/api/docs`).
  - Production `Dockerfile` with multi-stage build.
- **Verification:**
  - All tests pass with >85% coverage on core checkout and payment code.
  - GitHub Actions workflow executes successfully on push.
