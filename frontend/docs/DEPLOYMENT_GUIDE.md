# QuickCart — Production Deployment Playbook & Operations Guide

This guide details the procedures for deploying, configuring, and verifying the QuickCart frontend in production environments while maintaining complete decoupling from the independent backend.

---

## 🏛️ 1. Architecture & Deployment Boundary

```
+-----------------------------------------------------------+
|                      End Users                            |
+-----------------------------+-----------------------------+
                              |
                              v (HTTPS)
+-----------------------------------------------------------+
|         Frontend Static Application Layer (Edge CDN)       |
|  - Platform: Vercel / Netlify / Cloudflare Pages / Nginx  |
|  - Artifacts: /dist (HTML5, JS Chunks, CSS, Assets)       |
|  - Routing: Client-Side SPA with /index.html rewrite      |
|  - Environment: VITE_API_BASE_URL (publicly configured)   |
+-----------------------------+-----------------------------+
                              |
                              v (REST API over HTTPS + CORS)
+-----------------------------------------------------------+
|              Backend Service Layer (Independent)          |
|  - Platform: Node.js / Express Container on VPS / Cloud   |
|  - Database: PostgreSQL (Prisma ORM)                      |
|  - Cache & Queues: Redis + BullMQ (Order Expirations)     |
|  - Security: JWT Dual-Tokens, Rate Limiter, Helmet, CORS   |
+-----------------------------------------------------------+
```

### Core Principles
1. **Zero Backend Modifications**: The backend deployment runs independently as a Docker container or standalone Node.js process. The frontend does not bundle backend code or access the database directly.
2. **Stateless Static Asset Distribution**: The frontend compiles to immutable hashed static assets deployed across global Edge points of presence.
3. **Environment-Based Connectivity**: API endpoints are strictly configurable via environment variables (`VITE_API_BASE_URL`).

---

## 🚀 2. Deploying to Vercel (Recommended Platform)

Vercel is the recommended hosting platform for QuickCart due to native Vite framework support, automatic edge asset compression, instant preview deployments, and seamless single-page application (SPA) routing.

### Step-by-Step Vercel Deployment

#### Step 1: Connect Git Repository
1. Log into your [Vercel Account](https://vercel.com/).
2. Click **"Add New..."** $\to$ **"Project"**.
3. Authorize your GitHub / GitLab repository containing QuickCart.

#### Step 2: Configure Project Settings
- **Project Name**: `quickcart-frontend`
- **Framework Preset**: `Vite`
- **Root Directory**: Select `frontend` (Click "Edit" and choose the `frontend` subfolder).
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### Step 3: Configure Environment Variables
Expand the **Environment Variables** panel and add:

| Key | Value | Target Environments |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://api.yourdomain.com/api/v1` | Production, Preview, Development |
| `VITE_APP_ENV` | `production` | Production |

#### Step 4: Deploy
Click **"Deploy"**. Vercel will install dependencies, compile TypeScript, run the Vite bundler with optimized `manualChunks`, and generate a live URL (e.g. `https://quickcart-frontend.vercel.app`).

#### Step 5: SPA Routing & Caching Verification
The repository includes a root [`vercel.json`](../vercel.json) configuration:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```
This ensures that deep links (e.g., `/products/vintage-studio-mic`, `/cart`, `/profile`) resolve to `/index.html` on direct browser refresh.

---

## 🌐 3. Alternative Platform: Netlify

If deploying to Netlify:
1. In the Netlify console, create a new site from your Git repository.
2. Set **Base directory**: `frontend`.
3. Set **Build command**: `npm run build`.
4. Set **Publish directory**: `frontend/dist`.
5. Under **Site configuration** $\to$ **Environment variables**, set `VITE_API_BASE_URL` and `VITE_APP_ENV`.
6. SPA routing is automatically maintained by [`public/_redirects`](../public/_redirects):
   ```
   /*    /index.html   200
   ```

---

## 🐳 4. Alternative Platform: Self-Hosted Docker + Nginx

For on-premise, VPS, or Kubernetes deployments:

### Multi-Stage Dockerfile (`frontend/Dockerfile`)
```dockerfile
# Stage 1: Build the Vite production bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

### Production Nginx Configuration (`frontend/nginx.conf`)
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # Hashed static assets (immutable caching for 1 year)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

## 🔒 5. Backend CORS & Integration Requirements

The backend deployment must satisfy the following integration requirements to enable seamless communication with the frontend:

### 1. CORS Configuration on Backend
Ensure the backend Express service allows your frontend's production origin:
```javascript
// QuickCart Backend: src/app.js
const cors = require('cors');

const allowedOrigins = [
  'https://quickcart.yourdomain.com',
  'https://quickcart-frontend.vercel.app'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl) or matched domains
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true, // Required for cookie and authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Requested-With'
    ],
    exposedHeaders: [
      'Idempotency-Key',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    maxAge: 86400 // Cache pre-flight OPTIONS response for 24 hours
  })
);
```

### 2. HTTPS & Mixed Content Protection
Both frontend and backend **must** be served over HTTPS. Browsers actively block requests from secure HTTPS frontends to plain HTTP backends as **Mixed Active Content**.

### 3. Authentication Cookie Security
If the backend issues `refreshToken` via cookies:
- Must have `HttpOnly: true` (prevents JavaScript access).
- Must have `Secure: true` (transmitted only over HTTPS).
- Must have `SameSite: 'Lax'` or `'None'` (if hosted on separate top-level domains with HTTPS).

---

## 🔍 6. Post-Deployment Verification Checklist

Once deployed, execute this 5-minute health check:

1. **Root Load**: Open `https://your-frontend-domain.com`. Verify hero banner, categories, and typography render without console errors.
2. **Direct Route Refresh**: Navigate to `/products`, `/cart`, and `/register`. Refresh the browser on each route to verify SPA rewrites return HTTP 200 rather than 404.
3. **Backend Connectivity**: Open browser DevTools Network tab. Filter by `Fetch/XHR`. Verify `GET /api/v1/health` or `GET /api/v1/products` returns HTTP 200 with JSON payload.
4. **Authentication**: Register a test user and log in. Verify the header displays the authenticated user name and that protected route `/profile` is accessible.
5. **Cart & Reservation**: Add an item to the cart, navigate to `/checkout`, and submit. Verify that the order transitions to `PENDING_PAYMENT` with a live 15-minute countdown clock.
6. **Simulated Payment**: Complete the payment with outcome `SUCCESS`. Verify redirect to confirmation page and order status `PAID`.
