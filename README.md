# QuickCart — Production-Grade E-Commerce REST API Backend

[![CI/CD Pipeline](https://github.com/quickcart/quickcart-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/quickcart/quickcart-backend/actions)
[![Node.js Version](https://img.shields.io/badge/Node.js-v20.x%20LTS-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x-red.svg)](https://redis.io/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.41-orange.svg)](https://bullmq.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-304%20Passed-brightgreen.svg)](https://jestjs.io/)
[![Coverage](https://img.shields.io/badge/Coverage-86.5%25-brightgreen.svg)](https://jestjs.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> QuickCart is a high-concurrency, transaction-safe backend e-commerce RESTful API designed to solve mission-critical real-world retail problems: **atomic inventory reservations without overselling**, **mathematical deadlock elimination**, **decoupled payment settlement**, **distributed cache consistency**, **background job processing**, and **zero-trust server-side price authority**.

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Relational Data Model (ERD)](#-relational-data-model-erd)
- [Technology Stack](#-technology-stack)
- [Core Engineering Decisions & Concurrency Deep Dives](#-core-engineering-decisions--concurrency-deep-dives)
  - [1. Server-Side Price Authority](#1-server-side-price-authority)
  - [2. Two-Phase Decoupled Payment Settlement](#2-two-phase-decoupled-payment-settlement)
  - [3. Preventing Overselling via Atomic Conditional Updates](#3-preventing-overselling-via-atomic-conditional-updates)
  - [4. Circular Deadlock Elimination via Ordered Resource Locking](#4-circular-deadlock-elimination-via-ordered-resource-locking)
  - [5. Cache-Aside Redis Reads & Non-Blocking Invalidation](#5-cache-aside-redis-reads--non-blocking-invalidation)
  - [6. Resilient Background Queues & Automatic Expiration](#6-resilient-background-queues--automatic-expiration)
- [Local Setup & Development Quickstart](#-local-setup--development-quickstart)
- [Environment Variables](#-environment-variables)
- [RESTful API Reference](#-restful-api-reference)
- [Automated Testing & Quality Assurance](#-automated-testing--quality-assurance)
- [Docker & Production Deployment Blueprint](#-docker--production-deployment-blueprint)
- [Senior SDE Interview Questions & Model Answers](#-senior-sde-interview-questions--model-answers)
- [Known Limitations & Architecture Roadmap](#-known-limitations--architecture-roadmap)
- [License](#-license)

---

## 🏛 System Architecture

The following diagram illustrates the complete high-concurrency request lifecycle, data layer isolation, caching tiers, asynchronous background workers, and containerized boundaries:

```mermaid
flowchart TD
    Client["Clients & Frontends\n(Next.js / React / Mobile)"]

    subgraph Edge ["Edge & Security Layer"]
        CF["Cloudflare CDN & DDoS Protection\n(SSL/TLS Termination)"]
        ALB["AWS Application Load Balancer\n(Reverse Proxy & Path Routing)"]
    end

    subgraph AppCluster ["Containerized API Cluster (Docker / ECS Fargate)"]
        Node1["Node.js Instance #1\n(Express + Helmet + CORS)"]
        Node2["Node.js Instance #2\n(Express + Helmet + CORS)"]
        Limiter["Hybrid Rate Limiter\n(sliding-window, Redis backed)"]
    end

    subgraph DataTier ["Data & Caching Tier"]
        RedisCluster[("Redis 7.x Cluster\n• Catalog Cache (TTL 1h)\n• Rate Limiting Stores\n• BullMQ Job Queues")]
        PostgresPrimary[("PostgreSQL 16 Primary\n• ACID Transactions\n• Row-Level Locks\n• Immutable Audit Ledger")]
    end

    subgraph AsyncTier ["Asynchronous Workers Tier (BullMQ)"]
        NotificationWorker["Notification Worker\n• Order Confirmation Dispatch\n• Bounded Retries + DLQ"]
        ExpiryWorker["Order Expiration Worker\n• 15-Minute Unpaid TTL\n• Auto Restock + EXPIRATION_RELEASE"]
    end

    Client -->|HTTPS / TLS 1.3| CF
    CF --> ALB
    ALB --> Node1
    ALB --> Node2
    Node1 & Node2 <--> Limiter
    Limiter <--> RedisCluster
    Node1 & Node2 <-->|Cache-Aside Reads & Non-blocking SCAN| RedisCluster
    Node1 & Node2 <-->|Prisma ORM / Connection Pool| PostgresPrimary
    Node1 & Node2 -->|Enqueue Delayed / Notification Jobs| RedisCluster
    RedisCluster -->|Poll & Consume Jobs| NotificationWorker & ExpiryWorker
    ExpiryWorker -->|Atomic Restock & State Transition| PostgresPrimary
```

---

## 🗄 Relational Data Model (ERD)

QuickCart is modeled using **Prisma ORM** targeting **PostgreSQL 16**. All monetary fields use high-precision PostgreSQL `DECIMAL(10,2)` rather than floating-point values to eliminate rounding errors.

```mermaid
erDiagram
    USERS ||--o{ REFRESH_TOKENS : "issues"
    USERS ||--o{ ORDERS : "places"
    USERS ||--o| CARTS : "owns"

    CARTS ||--o{ CART_ITEMS : "contains"
    PRODUCTS ||--o{ CART_ITEMS : "referenced_in"

    CATEGORIES ||--o{ PRODUCTS : "categorizes"
    CATEGORIES ||--o{ CATEGORIES : "parent_to"
    PRODUCTS ||--o{ PRODUCT_IMAGES : "has"

    ORDERS ||--|{ ORDER_ITEMS : "contains"
    PRODUCTS ||--o{ ORDER_ITEMS : "item_snapshot"

    ORDERS ||--o{ PAYMENTS : "billed_by"
    PRODUCTS ||--o{ INVENTORY_RECORDS : "tracks"
    ORDERS ||--o{ INVENTORY_RECORDS : "audited_by"

    USERS {
        uuid id PK
        varchar email UK
        varchar passwordHash
        varchar firstName
        varchar lastName
        enum role "CUSTOMER | ADMIN"
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
    }

    REFRESH_TOKENS {
        uuid id PK
        uuid userId FK
        varchar tokenHash UK
        timestamptz expiresAt
        timestamptz revokedAt
        timestamptz createdAt
    }

    CATEGORIES {
        uuid id PK
        varchar name
        varchar slug UK
        text description
        uuid parentId FK
        timestamptz createdAt
        timestamptz updatedAt
    }

    PRODUCTS {
        uuid id PK
        varchar name
        varchar slug UK
        varchar sku UK
        text description
        decimal price
        int stock
        int version
        uuid categoryId FK
        boolean isActive
        timestamptz createdAt
        timestamptz updatedAt
    }

    CARTS {
        uuid id PK
        uuid userId FK, UK
        timestamptz createdAt
        timestamptz updatedAt
    }

    CART_ITEMS {
        uuid id PK
        uuid cartId FK
        uuid productId FK
        int quantity
        timestamptz createdAt
        timestamptz updatedAt
    }

    ORDERS {
        uuid id PK
        varchar orderNumber UK
        uuid userId FK
        enum status "PENDING_PAYMENT | PAID | PROCESSING | SHIPPED | DELIVERED | CANCELLED | EXPIRED | REFUNDED"
        decimal subtotal
        decimal taxAmount
        decimal shippingAmount
        decimal totalAmount
        varchar currency
        varchar idempotencyKey UK
        jsonb shippingAddress
        timestamptz createdAt
        timestamptz updatedAt
    }

    ORDER_ITEMS {
        uuid id PK
        uuid orderId FK
        uuid productId FK
        varchar productName
        varchar productSku
        decimal unitPrice
        int quantity
        decimal lineTotal
        timestamptz createdAt
    }

    PAYMENTS {
        uuid id PK
        uuid orderId FK
        varchar paymentIntentId UK
        varchar idempotencyKey UK
        varchar provider
        enum status "INITIATED | SUCCEEDED | FAILED | REFUNDED"
        decimal amount
        varchar currency
        jsonb gatewayResponse
        timestamptz createdAt
        timestamptz updatedAt
    }

    INVENTORY_RECORDS {
        uuid id PK
        uuid productId FK
        uuid orderId FK
        enum changeType "CHECKOUT_RESERVATION | EXPIRATION_RELEASE | MANUAL_ADJUSTMENT | CANCELLATION_RESTOCK"
        int quantityDelta
        int remainingStock
        varchar reason
        timestamptz createdAt
    }
```

---

## 🛠 Technology Stack

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `20.x LTS` | Non-blocking asynchronous I/O engine |
| **Framework** | Express.js | `4.21.x` | REST routing, middleware orchestration, and error filtering |
| **Primary Database** | PostgreSQL | `16.x` | ACID transactions, strict schema constraints, row locking |
| **ORM / Data Mapper**| Prisma ORM | `5.22.x` | Type-safe query building, migrations, connection management |
| **Cache & In-Memory**| Redis / ioredis | `7.x / 5.4.x` | Sub-millisecond catalog caching & distributed rate limits |
| **Background Queues**| BullMQ | `5.41.x` | Reliable distributed background jobs, bounded retries & DLQ |
| **Authentication** | JWT + bcrypt | `9.0.x / 5.1.x`| Asymmetric token signing, password hashing, reuse detection |
| **Validation** | Zod | `3.24.x` | Strict runtime request body and query parameter validation |
| **Security Headers** | Helmet + CORS | `8.0.x / 2.8.x`| CSP, HSTS, X-Frame-Options, frameguard, credential gating |
| **Testing Suite** | Jest + Supertest| `29.7.x / 7.0.x`| Automated unit, integration, concurrency, & security testing |
| **Containerization** | Docker & Compose | Multi-stage | Alpine-based minimal image with unprivileged `node` user |
| **CI / CD Pipeline** | GitHub Actions | Ubuntu 24.04 | Automated linting, Prisma validation, and test runs on push/PR |

---

## 💡 Core Engineering Decisions & Concurrency Deep Dives

### 1. Server-Side Price Authority
- **Problem**: Client devices, frontend code, or intercepted proxy requests can arbitrarily tamper with item prices, line discounts, or order totals.
- **Solution**: The shopping cart and checkout endpoints **never accept price or total inputs from the client**. The client only sends `productId` and `quantity`. The backend performs authoritative database lookups for product pricing, calculates subtotal, tax, and total using `Decimal(10,2)` operations, and creates frozen price snapshots in `OrderItem`.

### 2. Two-Phase Decoupled Payment Settlement
- **Problem**: Wrapping third-party payment gateway calls (Stripe, PayPal, Adyen) inside a PostgreSQL database transaction keeps database connections open during unpredictable external network latency (often 500ms–3000ms). Under traffic spikes, this causes rapid **connection pool exhaustion** and cascading service failure.
- **Solution**: QuickCart implements a **3-Phase Decoupled Pattern**:
  1. **Phase 1 (Preparation)**: Create payment record in `INITIATED` status with unique `idempotencyKey` inside a fast database transaction.
  2. **Phase 2 (External Call)**: Contact simulated payment provider **completely outside of any database transaction**. Zero database locks or connection threads are held.
  3. **Phase 3 (Settlement)**: Upon return, open a concise, millisecond-fast ACID transaction to update payment status (`SUCCEEDED` / `FAILED`), transition order state (`PAID`), and asynchronously enqueue background notification jobs.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Express as API Router
    participant Service as Payment Service
    participant DB as PostgreSQL
    participant Gateway as Payment Gateway

    Client->>Express: POST /payments/orders/:id/pay
    Express->>Service: processPayment()
    Service->>DB: Phase 1: Insert Payment (status = INITIATED)
    Note over Service,Gateway: Zero DB locks held during external network I/O
    Service->>Gateway: Phase 2: processPayment() [Simulated 200ms]
    Gateway-->>Service: Return HTTP 200 { success: true }
    Service->>DB: Phase 3: BEGIN TRANSACTION
    DB->>DB: UPDATE payments SET status = 'SUCCEEDED'
    DB->>DB: UPDATE orders SET status = 'PAID'
    DB->>Service: COMMIT TRANSACTION
    Service-->>Express: Standardized JSON ApiResponse
    Express-->>Client: 200 OK { status: "SUCCEEDED" }
```

### 3. Preventing Overselling via Atomic Conditional Updates
- **Problem**: In high-velocity flash sales, multiple shoppers simultaneously checkout the final remaining unit of inventory. Naive read-then-write checks (`if (product.stock >= qty) update()`) suffer from **Time-Of-Check to Time-Of-Use (TOCTOU)** race conditions, resulting in negative stock.
- **Solution**: QuickCart uses PostgreSQL **atomic conditional updates with row locking**:
  ```sql
  UPDATE "products"
  SET "stock" = "stock" - $quantity,
      "version" = "version" + 1,
      "updatedAt" = NOW()
  WHERE "id" = $productId::uuid
    AND "stock" >= $quantity
    AND "isActive" = true
  RETURNING "id", "name", "sku", "price", "stock", "isActive";
  ```
  If zero rows are updated, the checkout immediately rolls back and returns `409 Conflict: Insufficient stock` without any chance of overselling.

### 4. Circular Deadlock Elimination via Ordered Resource Locking
- **Problem**: User A checks out `[Product 1, Product 2]`. Simultaneously, User B checks out `[Product 2, Product 1]`. PostgreSQL locks Product 1 for User A and Product 2 for User B. When User A attempts to lock Product 2 and User B attempts to lock Product 1, a **circular-wait deadlock** (`40P01 dead_lock_detected`) occurs.
- **Solution**: QuickCart enforces a **Global Deterministic Lock Acquisition Order** before entering any transaction:
  ```javascript
  const sortedItems = [...cart.items].sort((a, b) => a.productId.localeCompare(b.productId));
  ```
  Because all concurrent checkouts lock products in identical lexicographical UUID order, circular-wait dependency graphs are **mathematically impossible**.

### 5. Cache-Aside Redis Reads & Non-Blocking Invalidation
- **Problem**: Naive Redis caching of catalog queries can block Redis single-threaded event loops if `KEYS *` is executed during product updates.
- **Solution**: QuickCart uses cursor-based non-blocking `SCAN` iteration (`redis.scan(cursor, 'MATCH', 'catalog:*', 'COUNT', 100)`) combined with targeted pipeline deletion (`redis.pipeline().del(keys).exec()`). Read endpoints implement Cache-Aside with fallback to PostgreSQL and dynamic TTL jitter to prevent cache stampedes.

### 6. Resilient Background Queues & Automatic Expiration
- **Problem**: If a customer checks out and reserves stock but never completes payment, inventory remains locked forever unless cancelled.
- **Solution**: QuickCart deploys a dedicated BullMQ queue (`order-expirations`) with a **15-minute delayed job** (`delay: 15 * 60 * 1000`). If the order status remains `PENDING_PAYMENT` when the worker evaluates the job, an ACID transaction transitions the status to `EXPIRED`, increments product stock, and creates an `EXPIRATION_RELEASE` inventory ledger audit record.

---

## 🚀 Local Setup & Development Quickstart

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Docker & Docker Compose**: v2.x or higher

### Step-by-Step Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/quickcart/quickcart-backend.git
   cd quickcart-backend
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies**:
   ```bash
   npm ci
   ```

4. **Launch PostgreSQL & Redis with Docker Compose**:
   ```bash
   docker compose up -d postgres redis
   ```

5. **Run Prisma Migrations & Seed Sample Data**:
   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```
   *The idempotent seed script generates default Admin (`admin@quickcart.com` / `AdminPass123!`) and Customer (`customer@quickcart.com` / `CustomerPass123!`) credentials along with categories and demo catalog items.*

6. **Start the API Server in Development Mode**:
   ```bash
   npm run dev
   ```
   Server initializes at `http://localhost:5000`. Verify health:
   ```bash
   curl http://localhost:5000/api/v1/health
   ```

---

## ⚙️ Environment Variables

| Variable | Description | Default Value | Required in Production |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | `development` | Yes |
| `PORT` | HTTP port on which the Express server listens | `5000` | No |
| `API_PREFIX` | Base URI routing prefix for REST endpoints | `/api/v1` | No |
| `DATABASE_URL` | PostgreSQL connection string with credentials and pool limits | `postgresql://quickcart_user:quickcart_password@localhost:5432/quickcart_db?schema=public` | **Yes (Secret)** |
| `REDIS_HOST` | Hostname of the Redis server or ElastiCache cluster | `localhost` | Yes |
| `REDIS_PORT` | Port number of the Redis service | `6379` | No |
| `REDIS_PASSWORD` | Authentication password for Redis (AUTH) | *(empty)* | Recommended |
| `JWT_ACCESS_SECRET` | 256-bit cryptographic secret for signing Access Tokens | `quickcart_jwt_access_secret_2026_dev_key` | **Yes (Secret)** |
| `JWT_REFRESH_SECRET`| 256-bit cryptographic secret for signing Refresh Tokens | `quickcart_jwt_refresh_secret_2026_dev_key` | **Yes (Secret)** |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan | `15m` | No |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token lifespan | `7d` | No |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated or wildcard for dev) | `*` | Yes |
| `RATE_LIMIT_WINDOW_MS` | Sliding rate limiter window duration in milliseconds | `900000` (15m) | No |
| `RATE_LIMIT_MAX` | Max allowed requests per client IP per window | `100` | No |

---

## 📡 RESTful API Reference

All successful responses follow the standardized envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "2026-11-07T12:00:00.000Z" }
}
```
All error responses return:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for product Sony WH-1000XM5. Requested: 2, Available: 0"
  }
}
```

### Endpoints Overview

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register customer account (returns access + refresh tokens) |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user credentials and issue rotated tokens |
| `POST` | `/api/v1/auth/refresh-token` | Public | Rotate refresh token with reuse detection |
| `POST` | `/api/v1/auth/logout` | Authenticated | Revoke active refresh token |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve profile details of authenticated caller |
| `GET` | `/api/v1/categories` | Public | List categories with hierarchical children and product counts |
| `POST` | `/api/v1/categories` | Admin Only | Create a new product category |
| `GET` | `/api/v1/products` | Public (Cached) | Paginated catalog listing with search, category filters, and sorting |
| `GET` | `/api/v1/products/:idOrSlug` | Public (Cached) | Retrieve product detail by UUID or unique slug |
| `POST` | `/api/v1/products` | Admin Only | Create new product and invalidate Redis catalog cache |
| `PUT` | `/api/v1/products/:id` | Admin Only | Update product, stock, or price and bust cache |
| `DELETE`| `/api/v1/products/:id` | Admin Only | Soft/hard delete product and evict cache |
| `GET` | `/api/v1/cart` | Authenticated | Retrieve caller's cart with live computed totals |
| `POST` | `/api/v1/cart/items` | Authenticated | Add product to cart with server-side stock verification |
| `PATCH`| `/api/v1/cart/items/:id` | Authenticated | Update item quantity |
| `DELETE`| `/api/v1/cart/items/:id` | Authenticated | Remove item from cart |
| `DELETE`| `/api/v1/cart` | Authenticated | Clear all items from caller's cart |
| `POST` | `/api/v1/orders/checkout` | Authenticated | ACID transaction checkout with atomic stock decrement |
| `GET` | `/api/v1/orders` | Authenticated | Paginated order history for caller |
| `GET` | `/api/v1/orders/:id` | Authenticated | Detailed order view with IDOR defense |
| `PATCH`| `/api/v1/orders/:id/cancel` | Authenticated | Cancel `PENDING_PAYMENT` order and restock inventory |
| `POST` | `/api/v1/payments/orders/:id/pay`| Authenticated | 3-Phase payment execution with idempotency protection |
| `GET` | `/api/v1/payments/orders/:id` | Authenticated | Retrieve payment ledger and attempts for order |
| `GET` | `/api/v1/health` | Public | Liveness and readiness probe inspecting DB and Redis connections |

---

## 🧪 Automated Testing & Quality Assurance

QuickCart features an extensive test harness covering unit logic, integration routes, high-concurrency race conditions, IDOR ownership isolation, and background job resilience:

```bash
# Run entire test suite (37 test suites, 304 passing tests)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests in-band
npm run test:integration

# Generate code coverage report
npm run test:coverage
```

### Verification Highlights
- **Concurrent Purchase Race Condition (`orders.test.js`)**: 2 concurrent checkouts against a single remaining stock unit; exactly 1 succeeds (201) and 1 fails with 409 Conflict.
- **Idempotency Key Collision Replay (`payments.test.js`)**: Identical checkout and payment requests return identical cached responses without double-charging or creating duplicate orders.
- **IDOR Protection (`orders.test.js`)**: User B querying User A's order receives a strict `404 Not Found` rather than `403 Forbidden` to prevent object ID enumeration attacks.
- **Token Reuse Detection (`auth.test.js`)**: Replaying an expired/already-rotated refresh token immediately revokes the entire compromised token family.

---

## 🐳 Docker & Production Deployment Blueprint

### Multi-Stage Container Build

QuickCart uses an optimized, multi-stage Alpine Docker image executing as an unprivileged user with `dumb-init` for proper Unix PID 1 signal forwarding:

```bash
# Build production image
docker compose build

# Start full containerized stack (API, PostgreSQL, Redis)
docker compose up --build -d

# Check container health status
docker compose ps
```

### AWS Enterprise Cloud Architecture

For production cloud deployment, QuickCart is designed to run seamlessly on AWS:

```
[Route 53 DNS]
       │
[Cloudflare WAF / DDoS]
       │
[AWS Application Load Balancer] (TLS Termination, Path-based Routing)
       │
 ┌─────┴────────────────────────┐
 │                              │
[ECS Fargate Task - Instance 1] [ECS Fargate Task - Instance 2]
 │                              │
 ├──────────────────────────────┴──────────────────────────────┐
 │                                                             │
▼                                                             ▼
[AWS RDS PostgreSQL 16 Multi-AZ]              [AWS ElastiCache Redis Cluster]
(Primary DB + Standby Replica + KMS)          (Multi-AZ with Auto-Failover)
```

---

## 🎓 Senior SDE Interview Questions & Model Answers

### Q1: How do you prevent inventory overselling during high-concurrency flash sales?
> **Answer**: We reject the naive read-then-write approach (`findUnique` followed by `update`) because it introduces a Time-Of-Check to Time-Of-Use (TOCTOU) race condition. Instead, QuickCart executes an atomic SQL conditional decrement:
> ```sql
> UPDATE products SET stock = stock - :qty, version = version + 1
> WHERE id = :id AND stock >= :qty AND isActive = true
> RETURNING *;
> ```
> PostgreSQL's row-level lock on the targeted product row ensures serializable execution for that record. If the remaining stock is less than `:qty`, zero rows match the condition, allowing us to immediately abort the checkout and roll back the interactive transaction with a `409 Conflict`.

### Q2: Why avoid wrapping external payment gateway calls inside database transactions?
> **Answer**: Wrapping external network HTTP calls within an active database transaction holds open a database connection for the entire duration of the external latency (frequently 500ms to 3 seconds). Under high concurrency, this rapidly exhausts the PostgreSQL connection pool (defaulting to 10–50 connections), starving all other API routes and crashing the backend. QuickCart uses the **3-Phase Decoupled Pattern**: (1) local DB write in `INITIATED` state, (2) external HTTP gateway call with zero DB connections open, and (3) fast millisecond settlement in a subsequent DB transaction.

### Q3: How do you prevent deadlocks when an order contains multiple products?
> **Answer**: Circular-wait deadlocks occur when Transaction A locks Product 1 and waits for Product 2, while Transaction B locks Product 2 and waits for Product 1. QuickCart eliminates this by sorting all cart items by `productId` (lexicographical order) before acquiring any locks. Because all concurrent transactions acquire row locks in the exact same sequence, a circular-wait dependency graph is mathematically impossible.

### Q4: How does QuickCart guarantee payment and checkout idempotency?
> **Answer**: Clients submit a unique `Idempotency-Key` header with each checkout or payment attempt. QuickCart stores this key in unique database constraints (`orders.idempotencyKey` and `payments.idempotencyKey`). If a network timeout causes the client to retry with the same key, the service intercepts the unique constraint or pre-checks the key, detects the previously processed record, and safely replays the exact original response without double-charging or decrementing inventory twice.

### Q5: How do you safely invalidate cached catalog queries in Redis without blocking the Redis event loop?
> **Answer**: Redis is single-threaded. Executing `KEYS catalog:*` blocks the event loop for the duration of the scan, potentially causing latency spikes or timeouts across the entire platform. QuickCart uses cursor-based `SCAN` via `ioredis` (`redis.scan(cursor, 'MATCH', 'catalog:*', 'COUNT', 100)`), gathering batches of keys non-blockingly and deleting them via a pipelined batch (`redis.pipeline().del(keys).exec()`).

### Q6: How do you handle unpaid checkout reservations so inventory isn't held indefinitely?
> **Answer**: Upon successful checkout, QuickCart atomically decrements stock, creates the order in `PENDING_PAYMENT` status, and pushes a delayed job to a BullMQ queue (`order-expirations`) with a 15-minute delay (`delay: 15 * 60 * 1000`). If the user does not pay within 15 minutes, the worker picks up the job, verifies that the order is still `PENDING_PAYMENT`, transitions it to `EXPIRED`, and restocks the reserved product quantities while logging an `EXPIRATION_RELEASE` inventory ledger audit record.

### Q7: Why use `DECIMAL(10,2)` instead of floating-point numbers for money?
> **Answer**: IEEE 754 floating-point arithmetic cannot represent base-10 fractional numbers precisely (e.g., `0.1 + 0.2 === 0.30000000000000004`). In financial systems, accumulating rounding discrepancies leads to balance reconciliation errors, tax calculation drift, and compliance violations. QuickCart uses PostgreSQL `DECIMAL(10,2)` and JavaScript Decimal wrappers (`Prisma.Decimal`), ensuring arbitrary-precision arithmetic and exact 2-decimal string serialization.

---

## 🗺 Known Limitations & Architecture Roadmap

1. **Transactional Outbox Pattern**: Currently, background jobs (BullMQ) are enqueued in application code immediately after database transactions commit. Under network failure between API instances and Redis, a commit could succeed while queueing fails. Future iterations will write job intents to an `outbox` table in PostgreSQL within the primary transaction, relaying events to Redis via Change Data Capture (Debezium/CDC).
2. **Elasticsearch / OpenSearch Integration**: Catalog text search currently uses PostgreSQL trigram / ILIKE queries (`@@index([name, description])`). For massive multi-million SKU catalogs, offloading search and faceted filtering to an Elasticsearch cluster will deliver typo-tolerant full-text search with sub-10ms response times.
3. **Multi-Currency & FX Exchange**: Monetary fields currently standardize on USD. Future milestones will introduce a currency exchange rates table and dynamic client currency conversion.

---

## 📄 License

This project is licensed under the terms of the **MIT License**.
Developed with pride by the QuickCart Engineering Team.
