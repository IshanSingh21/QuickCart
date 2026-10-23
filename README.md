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

---

## 📂 Project Structure

```
quickcart/
├── .env.example              # Blueprint for all environment configuration variables
├── .gitignore                # Production git ignore definitions
├── docker-compose.yml        # PostgreSQL 16 and Redis 7 multi-container orchestration
├── package.json              # Project manifest and task automation scripts
├── README.md                 # Project overview, architecture, and getting started
├── docs/                     # Comprehensive architectural documentation suite
│   ├── architecture.md       # High-level architecture, concurrency, and caching design
│   ├── schema.md             # ERD, data dictionary, and complete Prisma schema preview
│   ├── api-specs.md          # REST API contracts, JSON envelope, and error formats
│   ├── security.md           # Threat modeling (STRIDE) and OWASP top 10 defenses
│   ├── testing-strategy.md   # Test pyramid, concurrency testing, and QA architecture
│   └── roadmap.md            # Detailed phase-by-phase implementation plan
└── src/                      # Application source code (to be built in subsequent phases)
```

---

## 🚀 Phase 0 Quickstart & Verification

### 1. Prerequisites
- **Node.js**: v20 or higher
- **Docker & Docker Compose**: v20+

### 2. Setup Environment
Copy the example environment configuration:
```bash
cp .env.example .env
```

### 3. Start PostgreSQL and Redis Infrastructure
Launch the database and cache containers in the background:
```bash
docker compose up -d
```
Verify the health status of both services:
```bash
docker compose ps
```

### 4. Verify Phase 0 Initialization
Run the project initialization verification script:
```bash
npm run verify:setup
```

---

## 📚 Architectural Documentation

Dive deeper into the engineering designs:
- [System Architecture & Concurrency Strategy](file:///docs/architecture.md)
- [Data Entities, ERD & Schema Design](file:///docs/schema.md)
- [REST API Specifications & Envelope Standards](file:///docs/api-specs.md)
- [Security Architecture & Threat Mitigation](file:///docs/security.md)
- [Testing Strategy & Race Condition Verification](file:///docs/testing-strategy.md)
- [Phase-by-Phase Roadmap](file:///docs/roadmap.md)
