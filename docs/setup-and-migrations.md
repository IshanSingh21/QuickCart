# QuickCart Development Setup, Docker & Migration Guide

## 1. Single-Command Containerized Setup (Docker Compose)

The entire QuickCart backend ecosystem (PostgreSQL 16, Redis 7, and the Express API server) can be started in a single command without installing Node.js, PostgreSQL, or Redis on the host machine.

### 1.1 Launch Full Stack with Automatic Migrations
```bash
# 1. Copy environment template (if not already done)
cp .env.example .env

# 2. Build and start all services (PostgreSQL, Redis, and Express API)
docker compose up --build
```

### 1.2 How Docker Compose Orchestration Works
- **Service Dependency Gating:** The `api` container waits until both `postgres` and `redis` report **healthy** status via their respective container health checks (`pg_isready` and `redis-cli ping`).
- **Automatic Migration Deployment:** When the `api` container boots, it automatically runs `npx prisma migrate deploy` to apply pending PostgreSQL schema migrations before launching `node src/server.js`.
- **Persistent Storage:** Database tables and Redis append-only files persist across container restarts via named volumes `quickcart_pgdata` and `quickcart_redisdata`.
- **Unprivileged Execution:** The API container runs as the non-root `node` user with `dumb-init` handling PID 1 signal forwarding for graceful shutdown.

### 1.3 Service Endpoints & Health Check
- **API Server:** `http://localhost:5000`
- **Liveness Health Check:** `http://localhost:5000/health` (Returns `200 OK`)
- **System Diagnostics:** `http://localhost:5000/api/v1/health` (Checks DB, Redis, and memory)

### 1.4 Teardown & Clean Reset
```bash
# Stop containers while preserving data volumes:
docker compose down

# Complete teardown including deletion of all database and cache volumes:
docker compose down -v
```

---

## 2. Local Host Development Setup (Without Dockerizing the API)

If you prefer running Node.js directly on your host machine while running PostgreSQL and Redis in Docker:

### 2.1 Start Supporting Infrastructure
```bash
docker compose up -d postgres redis
docker compose ps
```

### 2.2 Install Dependencies & Apply Migrations
```bash
npm ci
npx prisma generate
npx prisma migrate dev
```

### 2.3 Start Server
```bash
# Development mode with hot-reloading:
npm run dev

# Production mode:
npm start
```

---

## 3. Prisma Database Migrations

QuickCart utilizes Prisma ORM with version-controlled migrations located in `prisma/migrations/`.

### 2.1 Apply Migrations in Development
Once the PostgreSQL database container is running:
```bash
npx prisma migrate dev --name init
```
This executes any pending migration SQL scripts in chronological order and regenerates `@prisma/client`.

### 2.2 Verify Migration Status
To check if the database schema is in sync with `prisma/schema.prisma`:
```bash
npx prisma migrate status
```

### 2.3 Inspect Database via Prisma Studio
To launch the interactive GUI database browser:
```bash
npm run prisma:studio
# Opens on http://localhost:5555
```

### 2.4 Deploy Migrations in Production / CI
In production environments or automated CI pipelines, always use `prisma migrate deploy` (which strictly applies existing SQL files without attempting to create new migrations or reset schemas):
```bash
npx prisma migrate deploy
```

---

## 3. Running the Server

### Development Mode (with hot-reloading via Nodemon)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

---

## 4. Running the Test Suite & Quality Checks

```bash
# Run ESLint code quality checks
npm run lint

# Run all tests (unit and integration)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run full test suite with coverage report
npm run test:coverage
```

---

## 5. CI/CD Pipeline (GitHub Actions)

The repository includes an automated continuous integration pipeline at `.github/workflows/ci.yml` that triggers on all pushes and pull requests to `main`.

### 5.1 Pipeline Stages
1. **Dependency Installation:** Uses `npm ci` for strictly deterministic dependency locks.
2. **Schema Validation:** Verifies Prisma schema datamodel integrity via `npx prisma validate`.
3. **Linting:** Runs ESLint to enforce code consistency and syntax rules (`npm run lint`).
4. **Automated Testing:** Launches isolated PostgreSQL 16 and Redis 7 container service containers on the GitHub Actions runner, runs the full test suite with `--coverage`, and uploads coverage artifacts.
5. **Zero-Secret Requirement:** The CI workflow supplies mock test-only environment variables (`NODE_ENV=test`, dummy JWT keys), ensuring that open-source forks and external contributors can run the full CI suite without requiring production repository secrets.
6. **Container Build Verification:** Builds the multi-stage Docker image via `docker/build-push-action` using GitHub Actions build caching.
