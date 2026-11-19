# QuickCart — Modern High-Performance E-Commerce Frontend

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.62-ff4154.svg)](https://tanstack.com/query)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-brown.svg)](https://github.com/pmndrs/zustand)
[![Vitest](https://img.shields.io/badge/Vitest-5.1-729b1b.svg)](https://vitest.dev/)

QuickCart is an independent, production-grade e-commerce single-page application (SPA) built for audio and creator tech gear. It features real-time inventory discovery, authoritative server-side cart pricing, time-sensitive BullMQ order reservations with live countdown timers, atomic idempotency keys, dual-token JWT authentication with safe rotation, and a simulated payment gateway.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [React 18](https://react.dev/) | Component architecture, Concurrent React, strict mode |
| **Language** | [TypeScript 5.6](https://www.typescriptlang.org/) | Strict type safety, end-to-end interface contracts |
| **Bundler & Tooling** | [Vite 6](https://vitejs.dev/) | Instant HMR, optimized Rollup bundling, code splitting |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Mobile-first utility design system, accessible neutral palette |
| **Routing** | [React Router 6.28](https://reactrouter.com/) | Declarative nested routing, route guards, SPA error boundaries |
| **Server State** | [TanStack Query 5](https://tanstack.com/query) | Cache deduplication, background invalidation, optimistic states |
| **Client State** | [Zustand 5](https://github.com/pmndrs/zustand) | In-memory token management, guest cart storage, modal UI states |
| **HTTP Client** | [Axios](https://axios-http.com/) | Interceptors for Bearer injection, auto token-refresh mutex, `withCredentials` |
| **Form & Validation** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Performant forms with schema-driven validation |
| **Icons** | [Lucide React](https://lucide.dev/) | Accessible, consistent iconography |
| **Testing** | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) | Component tests, integration suites, cross-browser E2E automation |

---

## 📁 Architecture & Folder Structure

```
frontend/
├── dist/                      # Production build output
├── docs/                      # Technical contracts and deployment guides
│   ├── API_CONTRACT.md        # Complete backend endpoint contracts & schemas
│   ├── AUTH_FLOW.md           # Token refresh, rotation & session lifecycle
│   ├── BACKEND_INTEGRATION_NOTES.md # Known backend boundaries & guardrails
│   ├── DEPLOYMENT_GUIDE.md    # Multi-platform deployment playbook
│   ├── FRONTEND_ARCHITECTURE.md # Architectural patterns & state separation
│   ├── PRODUCTION_CHECKLIST.md# Pre-flight deployment audit
│   └── TESTING_REPORT.md      # Final QA test matrix and audit results
├── e2e/                       # Playwright browser end-to-end specifications
│   ├── edge-cases.spec.ts     # Viewports, offline, and resilience specs
│   └── user-journey.spec.ts   # Full commerce journey browser automation
├── public/                    # Static assets copied verbatim to /dist
│   ├── _redirects             # SPA routing fallback for Netlify/Cloudflare
│   ├── favicon.svg            # Branded vector SVG favicon
│   └── robots.txt             # Search engine crawling rules
├── src/
│   ├── assets/                # Local static images and styles
│   ├── components/
│   │   ├── common/            # CartDrawer, SearchModal, RouteErrorBoundary
│   │   ├── layout/            # Navbar, MobileNav, Footer, Banner
│   │   └── ui/                # Button, Input, Select, Modal, Badge, Spinner...
│   ├── features/
│   │   ├── auth/              # Forms, ProtectedRoute, GuestRoute, token hooks
│   │   ├── cart/              # Cart table, unified server/guest cart hooks
│   │   ├── checkout/          # Shipping address, validation, payment mutation
│   │   ├── orders/            # Order status badges, item lists, history cards
│   │   ├── products/          # ProductCard, ProductGrid, FilterSidebar, Skeletons
│   │   └── profile/           # User dashboard, read-only identity view
│   ├── hooks/                 # Reusable utility hooks (useDebounce, useMediaQuery)
│   ├── layouts/               # RootLayout, AuthLayout, DashboardLayout
│   ├── lib/                   # Centralized apiClient, queryClient, tokenRefresh, env
│   ├── pages/                 # Route-level views (HomePage, ProductsPage, CartPage...)
│   ├── services/              # Typed backend REST services (auth, products, cart...)
│   ├── store/                 # Zustand stores (authStore, guestCartStore, uiStore)
│   ├── types/                 # Shared TypeScript models (api, auth, product, order...)
│   └── utils/                 # cn, formatters, idempotency generator, error-handler
├── .env.example               # Environment variables template
├── .env.production            # Production environment defaults
├── eslint.config.js           # ESLint 9 flat configuration
├── index.html                 # HTML entry with OpenGraph and SEO tags
├── package.json               # Scripts, dependencies, devDependencies
├── playwright.config.ts       # Playwright multi-browser test configuration
├── tailwind.config.js         # Design system tokens and extensions
├── tsconfig.json              # Strict TypeScript compiler options
├── vercel.json                # Vercel deployment rewrites and caching headers
└── vite.config.ts             # Vite bundler, Rollup manualChunks, proxy config
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **Backend Service**: QuickCart Express backend running on `http://localhost:5000`

### 1. Installation
```bash
cd frontend
npm install
```

### 2. Configure Local Environment
Create your local `.env` configuration file:
```bash
cp .env.example .env
```
Default local variables in `.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_APP_ENV=development
```

### 3. Start Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000` with instant HMR and API proxy routing.

---

## 📜 Available NPM Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts local development server on port 3000 with HMR |
| `npm run build` | `tsc -b && vite build` | Type-checks code and builds optimized production bundle in `/dist` |
| `npm run preview` | `vite preview` | Previews production `/dist` bundle locally on port 4173 |
| `npm run lint` | `eslint .` | Runs ESLint 9 checks across all source files |
| `npm run type-check`| `tsc --noEmit` | Validates strict TypeScript compilation without emitting files |
| `npm test` | `vitest run` | Runs all 11 Vitest unit, service, and integration suites (81 tests) |
| `npm run test:watch`| `vitest` | Runs Vitest in interactive watch mode |
| `npm run test:e2e` | `playwright test` | Runs Playwright cross-browser end-to-end test suite |

---

## 🌐 Production Deployment Guide

The QuickCart frontend is completely decoupled from the backend. It compiles down to static HTML, CSS, and JavaScript files (`/dist`), making it ideal for high-availability Edge CDNs.

### Recommended Platform: Vercel

Vercel provides native edge CDN distribution, global caching, automated preview deployments, and zero-configuration SSL/TLS.

#### Option A: Deploy via Vercel Dashboard
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Log into [vercel.com](https://vercel.com/) and click **"Add New Project"**.
3. Import your repository and select the **`frontend`** root directory as the **Root Directory**.
4. Configure Build and Output Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` (or `tsc -b && vite build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. In **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://api.yourdomain.com/api/v1`
   - `VITE_APP_ENV` = `production`
6. Click **Deploy**. Vercel will build the project and output a production URL (e.g., `https://quickcart-frontend.vercel.app`).

#### Option B: Deploy via Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

> **SPA Routing on Vercel**: Handled automatically by the included [`vercel.json`](./vercel.json), which routes all paths (`/(.*)`) back to `/index.html` with HTTP 200, sets 1-year immutable caching for `/assets/`, and adds security headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`).

---

### Alternative Platform: Netlify

1. In the Netlify dashboard, select **"Import an existing project"**.
2. Set **Base directory**: `frontend`.
3. Set **Build command**: `npm run build`.
4. Set **Publish directory**: `frontend/dist`.
5. Add production environment variables (`VITE_API_BASE_URL`, `VITE_APP_ENV`).
6. Deploy. SPA fallback is handled by the included [`public/_redirects`](./public/_redirects) file.

---

### Alternative Platform: Self-Hosted Docker + Nginx

To serve the frontend using a lightweight, containerized Alpine Nginx container:

```dockerfile
# Multi-stage Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**`nginx.conf`** SPA fallback:
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Static assets immutable caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, no-transform, immutable";
    }

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## ⚙️ Environment Variables Reference

| Variable Name | Required | Default / Example | Purpose |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `https://api.quickcart.com/api/v1` | Complete base URL targeting the backend REST API, including `/api/v1` |
| `VITE_APP_ENV` | Optional | `production` | Environment mode (`development`, `test`, `production`) |
| `PLAYWRIGHT_BASE_URL`| Optional | `http://localhost:3000` | Target URL used by Playwright E2E browser tests |

> **Security Note**: Vite bundles all variables prefixed with `VITE_` into the public JavaScript bundle. **Never store secret keys, database credentials, or private payment secrets in frontend environment files.**

---

## 🔒 Production Backend & Security Requirements

To ensure secure, uninterrupted communication between the frontend SPA and the backend API:

### 1. Correct Backend CORS Configuration
The backend Express server uses the `cors` package. In production, it **must** be configured with the exact origin of your deployed frontend:
```javascript
// Backend: src/app.js
const corsOptions = {
  origin: [
    'https://quickcart.yourdomain.com',
    'https://quickcart-frontend.vercel.app'
  ],
  credentials: true, // Required for cookie transmission & auth headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Requested-With'],
  exposedHeaders: ['Idempotency-Key', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // Pre-flight cache for 24 hours
};
app.use(cors(corsOptions));
```
> **Warning**: When `credentials: true` is enabled, browsers reject wildcards (`origin: '*'`). The origin string must match the exact protocol, domain, and port.

### 2. HTTPS & SSL/TLS Requirement
- In production, both frontend and backend must be hosted over HTTPS (`https://`).
- Browsers block requests from HTTPS frontends to plain HTTP backends as **Mixed Content**.
- Ensure valid SSL/TLS certificates (e.g., Let's Encrypt or Cloudflare Edge SSL).

### 3. Dual-Token Authentication Security Model
- **Access Tokens**: Short-lived (15 minutes). Stored **strictly in JavaScript memory** (`useAuthStore`). Never written to `localStorage` or `sessionStorage` to mitigate XSS exposure.
- **Refresh Tokens**: Long-lived (7 days). Stored in secure cookies or persistent storage. Rotated on every refresh (`POST /api/v1/auth/refresh-token`).
- **Concurrent Refresh Mutex**: Handled in [`src/lib/token-refresh.ts`](./src/lib/token-refresh.ts). If multiple API requests fail simultaneously with HTTP 401, only one refresh request is dispatched while pending requests are queued.
- **Loop Prevention**: Logout passes `{ _skipAuthRefresh: true }` to prevent refresh loops during unauthenticated transitions.

---

## 🔧 Troubleshooting Common Production Issues

### Issue 1: CORS Policy Violation (`Access to XMLHttpRequest blocked`)
- **Symptom**: Browser console shows `No 'Access-Control-Allow-Origin' header is present on the requested resource`.
- **Cause**: Backend does not recognize your production frontend domain, or sent `origin: '*'` with credentials.
- **Solution**: Add your exact frontend Vercel/production domain to the backend's allowed origins list and verify that the backend responds to pre-flight `OPTIONS` requests with HTTP 204.

### Issue 2: 404 Not Found on Page Refresh (`/products/keyboard` shows 404)
- **Symptom**: Navigating inside the app works, but reloading any non-root route returns a 404 error from the web server.
- **Cause**: The static host is looking for a physical file `/products/keyboard/index.html` on disk.
- **Solution**: Ensure your hosting provider is using the provided rewrite rules:
  - On **Vercel**: Handled by [`vercel.json`](./vercel.json).
  - On **Netlify / Cloudflare**: Handled by [`public/_redirects`](./public/_redirects).
  - On **Nginx**: Add `try_files $uri $uri/ /index.html;`.

### Issue 3: Mixed Content Warning (`This request has been blocked`)
- **Symptom**: The browser refuses to connect to `http://api.quickcart.com`.
- **Cause**: The frontend is served over `https://`, but `VITE_API_BASE_URL` points to an unencrypted `http://` endpoint.
- **Solution**: Set `VITE_API_BASE_URL=https://api.yourdomain.com/api/v1` in your production environment settings.

### Issue 4: Rate Limiting Breaches (HTTP 429)
- **Symptom**: Repeated requests fail with `Too Many Requests`.
- **Cause**: The backend limits authentication endpoints to 10 requests per 15 minutes and catalog queries to 100 requests per 15 minutes.
- **Solution**: The frontend automatically displays friendly rate limit advisories and disables submit buttons while requests are in flight. If your CDN makes bulk requests, whitelist CDN IP ranges on the backend Redis limiter.

---

## 📄 License & Ownership

Developed for QuickCart. Built following clean architecture, strict backend contracts, and robust frontend design systems.
