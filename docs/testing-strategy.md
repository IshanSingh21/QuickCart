# QuickCart Testing Strategy & Quality Assurance Architecture

## 1. Testing Philosophy & The Test Pyramid

An e-commerce backend handles financial transactions, inventory counts, and customer authentication. A failure in transactional integrity directly translates to monetary loss or reputational damage. Our testing strategy prioritizes automated, deterministic verification across three tiers:

```
        / \
       /   \        Concurrency & Stress Tests (5%)
      /  ▲  \       - 20 concurrent checkouts for 1 stock unit
     /───────\      - Idempotency replay verification
    /         \     Integration Tests (25%)
   /     ▲     \    - Express + Supertest + Dockerized Postgres & Redis
  /─────────────\   - Real Prisma queries, transactions, route auth
 /               \  Unit Tests (70%)
/        ▲        \ - Pure domain logic: cart totals, tax, discounts
─────────────────── - Input validation schemas (Zod), token utilities
```

---

## 2. Test Suites Breakdown

### 2.1 Unit Tests (`tests/unit/`)
- **Scope:** Isolated functions and classes with zero external network or database dependencies.
- **Fast Feedback:** Runs in milliseconds using Jest.
- **Target Areas:**
  - **Pricing & Cart Math:** Verification of floating-point rounding elimination using Decimal.js / PostgreSQL NUMERIC emulation. Subtotals, tax calculations, discounts, and item count calculations.
  - **Zod Validation Schemas:** Testing valid and invalid payloads for edge cases (e.g., negative price, empty string passwords, malformed emails, out-of-bounds pagination).
  - **Token Utilities:** Hashing verification, JWT signature generation, expiration claims, and payload decoding.
  - **Idempotency Helpers:** Key parsing and hashing utilities.

### 2.2 Integration Tests (`tests/integration/`)
- **Scope:** Full HTTP request-response lifecycle using **Supertest** interacting with real Express routers, middleware pipelines, and a dedicated test database in Docker.
- **Test Database Isolation Strategy:**
  - Tests run against a dedicated PostgreSQL database (`quickcart_test_db`) and Redis DB index (`db: 1`).
  - A database truncation helper (`tests/helpers/reset-db.js`) clears all tables between test suites in foreign-key safe order (`TRUNCATE TABLE ... CASCADE`).
  - Tests run sequentially per suite using `jest --runInBand` to avoid database cross-contamination.
- **Target Flows:**
  - Registration -> Login -> Access Token Generation -> Protected Route Access -> RBAC Verification.
  - Category Creation -> Product Creation with Images -> Catalog Filtering & Pagination.
  - Add to Cart -> Quantity Updates -> Cart Subtotal Verification.
  - Checkout -> Stock Decrement -> Order Creation -> Inventory Log Creation.
  - Simulated Payment -> Order State Transition to `PAID`.

### 2.3 Concurrency & Race Condition Verification (`tests/integration/concurrency/`)
Critical e-commerce edge cases must be proven with deterministic concurrent execution:

#### Test Case 1: The Flash Sale Oversell Prevention
- **Setup:** A product is seeded in the test database with `stock = 1`.
- **Execution:** Execute 20 concurrent HTTP checkout requests (`Promise.all()`) from 20 different authenticated users simultaneously.
- **Assertion:**
  - Exactly **1 request** receives `201 Created` with a confirmed order.
  - Exactly **19 requests** receive `409 Conflict` (Out of Stock).
  - Database check: Product `stock` is exactly `0` (never `-1` or negative).
  - Database check: Exactly `1` OrderItem record is created.

#### Test Case 2: Concurrent Idempotent Requests
- **Setup:** Client prepares a checkout payload with a fixed `Idempotency-Key: "fixed-uuid-123"`.
- **Execution:** Send 5 identical requests concurrently with the same idempotency key.
- **Assertion:**
  - Exactly **1 order** is created in the database.
  - All 5 requests receive successful responses with the identical `orderId` and `totalAmount`.
  - No duplicate inventory holds or duplicate database rows are created.

---

## 3. Test Directory Structure

```
quickcart/
└── tests/
    ├── helpers/
    │   ├── db-cleaner.js          # Truncates all tables between integration test runs
    │   ├── test-app.js            # Express app factory for Supertest
    │   ├── token-helper.js        # Generates pre-signed JWTs for test users/admins
    │   └── seed-test-data.js      # Seeds standard categories and products for testing
    ├── unit/
    │   ├── cart-pricing.test.js   # Precision and subtotal calculations
    │   ├── validation.test.js     # Zod schema boundary tests
    │   └── jwt-service.test.js    # Token signing and verification
    └── integration/
        ├── auth.test.js           # Register, login, refresh rotation, RBAC
        ├── products.test.js       # Search, filter, pagination, Redis cache
        ├── cart.test.js           # Cart operations and server-side pricing
        ├── orders.test.js         # Order creation and transactional integrity
        ├── payments.test.js       # Simulated payment processing and webhooks
        └── concurrency.test.js    # Flash sale race condition and idempotency
```

---

## 4. Test Execution & Coverage Standards

### Execution Commands
```bash
# Run all unit tests
npm run test:unit

# Run full integration test suite with real database
npm run test:integration

# Run entire test suite with coverage reporting
npm run test:coverage
```

### Coverage Thresholds (Enforced via Jest Config)
- **Business-Critical Domains (Orders, Cart, Inventory, Auth):** Minimum **85%** branch and line coverage.
- **Application Total:** Minimum **80%** overall coverage.
- Tests will be integrated into the GitHub Actions CI pipeline, automatically failing pull requests if any test fails or coverage drops below threshold.
