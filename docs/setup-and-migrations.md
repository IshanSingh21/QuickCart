# QuickCart Development Setup & Prisma Migration Guide

## 1. Quickstart Development Setup

### 1.1 Environment Configuration
Copy the safe `.env.example` blueprint:
```bash
cp .env.example .env
```
Ensure secrets and database credentials in `.env` match your local environment.

### 1.2 Start Database & Cache Infrastructure (Docker)
Launch PostgreSQL 16 and Redis 7 in detached mode:
```bash
docker compose up -d
```
Check that the containers are healthy:
```bash
docker compose ps
```

---

## 2. Prisma Database Migrations

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

## 4. Running the Test Suite

```bash
# Run all tests (unit and integration)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run full test suite with coverage report
npm run test:coverage
```
