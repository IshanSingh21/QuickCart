# QuickCart Security Architecture & Threat Mitigation

## 1. Threat Modeling (STRIDE Analysis for E-Commerce)

| Threat Category | Potential Attack Vector | QuickCart Defense Implementation |
| :--- | :--- | :--- |
| **Spoofing** | Attacker forging JWT tokens or falsifying user identities | Cryptographically signed HMAC-SHA256 JWTs with short lifespan (15 min); refresh tokens stored hashed (SHA-256) in PostgreSQL with revocation capability. |
| **Tampering** | Client altering cart payload to pay $0.01 for a $300 item | **Strict Server-Side Price Authority**: Client only submits `productId` and `quantity`. Prices are looked up directly from PostgreSQL inside an ACID transaction. |
| **Repudiation** | User claiming they did not place an order or that money was taken twice | Immutable `OrderItem` historical snapshots, `InventoryLog` audit trail, and mandatory `Idempotency-Key` headers on state-mutating requests. |
| **Information Disclosure** | IDOR: Accessing other users' orders by guessing order IDs (`/orders/:id`) | Object-level authorization checks: queries enforce `WHERE id = :orderId AND userId = :requestingUserId`. Global sanitization strips sensitive fields from API responses. |
| **Denial of Service** | Brute-force attacks against `/auth/login` or flash-sale endpoint flooding | Two-tier Redis-backed sliding-window rate limiters: strict for authentication (10 req/15m) and general for catalog browsing (100 req/15m). |
| **Elevation of Privilege** | Normal `CUSTOMER` attempting to invoke Admin product/order endpoints | Role-Based Access Control (RBAC) middleware verifying `req.user.role === 'ADMIN'` before route handlers execute. |

---

## 2. In-Depth Security Mitigations (OWASP Top 10 Alignment)

### 2.1 Broken Access Control (OWASP A01)
- **Role-Based Access Control (RBAC):** Middleware checks `req.user.role` against permitted roles for admin-only endpoints (`/api/v1/categories`, `POST /api/v1/products`, `/admin/*`).
- **Object-Level Ownership Verification (Anti-IDOR):**
  Even with a valid JWT, users can only read or manipulate resources they own:
  ```javascript
  // Repository query pattern
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: req.user.role === 'ADMIN' ? undefined : req.user.id
    }
  });
  if (!order) throw new NotFoundError('Order not found');
  ```

### 2.2 Cryptographic Failures & Credential Protection (OWASP A02)
- **Password Hashing:** Passwords are never stored in plaintext. They are hashed using **bcrypt** with a work factor of 12 (computationally expensive to thwart offline rainbow-table and GPU brute-force attacks).
- **Refresh Token Storage:** Refresh tokens are never stored in plaintext in the database. When issued, the raw token is returned to the client once, and a SHA-256 hash of the token is persisted in `RefreshToken.tokenHash`.
- **Token Rotation & Reuse Detection:** When a refresh token is exchanged, it is immediately revoked and replaced with a new token. If an already revoked token is submitted, the system flags a potential theft and revokes all active sessions for that user.

### 2.3 Injection Prevention (OWASP A03)
- **SQL Injection:** All database interactions utilize **Prisma ORM**, which generates parameterized queries under the hood, ensuring user inputs are treated strictly as data literals.
- **Raw Queries:** Where raw SQL is required for atomic inventory decrement or text search, queries strictly utilize Prisma's tagged template literal (`prisma.$queryRaw`), preventing string-concatenation injection.

### 2.4 Insecure Design & Price Tampering (OWASP A04)
- **Zero-Trust Client Pricing:** E-commerce frontends are treated as untrusted presentation layers. The shopping cart and checkout endpoints reject any client-provided `price`, `discount`, or `subtotal` parameters. Prices are resolved from the database during the checkout transaction.
- **Negative Stock & Negative Quantity Exploits:** Input validation enforces `quantity >= 1` and `quantity <= 100` per line item. Database column constraints prevent negative stock (`stock >= 0`).

### 2.5 Security Misconfiguration & Hardening (OWASP A05)
- **Helmet Middleware:** Applies standard HTTP security headers:
  - `Content-Security-Policy` (CSP)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (Anti-Clickjacking)
  - `Strict-Transport-Security` (HSTS)
- **Removal of Fingerprinting:** The `X-Powered-By: Express` header is explicitly disabled to avoid leaking framework metadata.
- **Strict CORS:** Configured with explicit origins (`CORS_ORIGIN`), disallowing wildcard `*` in authenticated production environments.

### 2.6 Identification and Authentication Failures (OWASP A07)
- **Dual-Token Architecture:**
  - `accessToken`: Short-lived (15 minutes), passed via `Authorization: Bearer <token>`.
  - `refreshToken`: Long-lived (7 days), stored securely, rotatable, and revokable.
- **Brute-Force Rate Limiting:** Redis-backed rate limiter on `POST /api/v1/auth/login` throttles repeated failed attempts per IP and per username.

### 2.7 Software and Data Integrity (Input Validation with Zod)
- Every incoming request body, query parameter, and path variable is validated against strict **Zod schemas** before reaching the controller.
- **Unknown Property Stripping:** Unrecognized fields in payloads are stripped to prevent mass-assignment attacks.

### 2.8 Security Logging & Error Sanitization (OWASP A09)
- **No Stack Trace Leakage:** In production (`NODE_ENV=production`), internal database error messages, stack traces, and SQL queries are logged internally via structured logger but never exposed in HTTP error responses. Clients receive generic, actionable messages (`INTERNAL_SERVER_ERROR`).
- **Secret Masking:** Logs automatically sanitize sensitive fields (`password`, `token`, `cardNumber`, `authorization`, `secret`, `apiKey`).

---

## 3. Phase 8 Security Review & Vulnerability Audit Matrix

### 3.1 Audit Findings & Mitigations

| Security Domain | Risk Assessment | Mitigation Implemented | Verification Test Suite |
| :--- | :--- | :--- | :--- |
| **SQL Injection** | **Zero Risk:** All database access is parameterized via Prisma ORM. Atomic inventory decrements use Prisma's tagged template literal `tx.$queryRaw\`...\`` with parameterized bind variables. | Probed with classical injection strings (`' OR '1'='1`, `'; DROP TABLE products; --`, UNION queries). | `tests/integration/security-and-headers.test.js` |
| **Production Secrets** | **High (Pre-Audit) $\to$ Mitigated:** Development fallback JWT secrets could previously be used in production if unconfigured. | Implemented `validateProductionSecrets()`: enforces that `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are mandatory, non-default, and $\ge 32$ characters in production; fails fast on boot. | `tests/unit/production-secrets.test.js` |
| **Sensitive Data in Logs** | **Medium (Pre-Audit) $\to$ Mitigated:** Plaintext passwords, tokens, or credit cards in error metadata could leak to server log collectors. | Implemented recursive `sanitizeData()` in logger; redacts sensitive keys matching `/password\|token\|secret\|authorization\|cookie\|cardnumber\|cvv/i` with `[REDACTED]`. Circular references handled via `WeakSet`. | `tests/unit/logger-sanitizer.test.js` |
| **CORS Misconfiguration** | **Medium (Pre-Audit) $\to$ Mitigated:** Standard wildcard `*` with `credentials: true` violates W3C CORS specifications. | Replaced static string with dynamic validator function that parses comma-separated origins, properly validates caller origin, and reflects permitted origin for credentialed requests. | `tests/integration/security-and-headers.test.js` |
| **Security Headers** | **Low $\to$ Hardened:** Framework fingerprinting and MIME-sniffing risks. | Configured Helmet with `crossOriginResourcePolicy: { policy: 'cross-origin' }`, `X-Content-Type-Options: nosniff`, and stripped `X-Powered-By`. | `tests/integration/security-and-headers.test.js` |
| **Rate Limiting & Flooding** | **Low $\to$ Hardened:** Credential stuffing and volumetric DoS. | Configured hybrid sliding-window limiters with `429 Too Many Requests`, `RATE_LIMIT_EXCEEDED` code, and `Retry-After` header. Memory fallback ensures uptime when Redis is offline. | `tests/integration/rate-limiting-stress.test.js` |
| **Concurrency / Flash Sales** | **Critical $\to$ Verified:** Overselling when concurrent checkouts compete for finite stock. | Verified with 5 simultaneous requests competing for 2 units: exactly 2 succeed with `201 Created`, 3 are rejected with `409 Conflict`, stock reaches exactly 0. Mid-transaction failures abort cleanly without partial records. | `tests/integration/concurrency-and-rollback.test.js` |
| **Dependency Vulnerabilities** | **Informational / Monitored:** `npm audit` flagged transient vulnerabilities in build tools (`tar` under `bcrypt`'s native builder) and `zod` collection limit. | Body size strictly capped at 10kb (`express.json({ limit: '10kb' })`) to prevent JSON memory exhaustion attacks against schema validators. Native dependencies isolated to server runtime. | `npm audit` |
