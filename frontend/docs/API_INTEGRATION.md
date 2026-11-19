# QuickCart — Frontend API Integration Architecture & Guide

This document explains how the QuickCart frontend interacts with the verified backend API, detailing client architecture, interceptors, concurrency management, and server state synchronization.

---

## 🏗️ 1. Centralized API Client Architecture

All HTTP communications route through a unified Axios instance defined in [`src/lib/api-client.ts`](../src/lib/api-client.ts):

```
+-------------------------------------------------------------+
|                React UI / TanStack Query Hooks              |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               Typed API Services (Services Layer)           |
|  (authService, productsService, cartService, ordersService) |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               Centralized apiClient (Axios)                 |
|  - baseURL: env.VITE_API_BASE_URL (/api/v1 prefix)          |
|  - timeout: 15000ms                                         |
|  - withCredentials: true                                    |
+------------------------------+------------------------------+
                               |
         +---------------------+---------------------+
         |                                           |
         v (Request Interceptor)                     v (Response Interceptor)
+---------------------------------+         +---------------------------------+
| Inject Bearer Access Token      |         | Intercept HTTP 401 Unauthorized |
| from Zustand in-memory store    |         | Dispatch token refresh mutex    |
+---------------------------------+         +---------------------------------+
```

---

## 🔒 2. Authentication & Safe Token Refresh Mechanism

The QuickCart backend implements a dual-token JWT architecture:
- **Access Token**: Valid for 15 minutes. Stored strictly in-memory (`useAuthStore`).
- **Refresh Token**: Valid for 7 days. Stored in persistent storage or HTTP-only cookies. Rotated upon every refresh.

### Concurrent Request Queuing (Mutex Lock)
When multiple API calls fail simultaneously with HTTP 401 (e.g. cart fetch, user profile fetch, category fetch), naive implementations dispatch multiple refresh calls, causing race conditions and refresh token reuse rejections.

QuickCart prevents this using a queueing mutex in [`src/lib/token-refresh.ts`](../src/lib/token-refresh.ts):

```typescript
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const newTokens = await authService.refreshToken(storedRefreshToken);
    useAuthStore.getState().setTokens(newTokens);
    processQueue(null, newTokens.accessToken);
    return newTokens.accessToken;
  } catch (error) {
    processQueue(error, null);
    useAuthStore.getState().clearSession({ sessionExpired: true });
    throw error;
  } finally {
    isRefreshing = false;
  }
}
```

### Loop Prevention on Logout
When logging out, the request is flagged with `{ _skipAuthRefresh: true }`. If the logout request itself returns 401 (e.g. token already expired), the interceptor bypasses the refresh flow and directly terminates the session.

---

## 🔑 3. Idempotency Key Architecture

Order creation (`POST /api/v1/orders/checkout`) and payment processing (`POST /api/v1/payments/orders/:id/pay`) accept an `Idempotency-Key` header:

- **Generation**: Created via `generateIdempotencyKey(prefix)` in [`src/utils/idempotency.ts`](../src/utils/idempotency.ts). Combines timestamp and cryptographic random hex string (e.g., `idemp_order_1700000000000_a1b2c3d4`).
- **Safety**: If a network timeout occurs while an order is in flight, re-submitting with the same idempotency key returns the existing order rather than charging the card twice or reserving duplicate inventory.

---

## 📦 4. Typed Service Integration Matrix

| Service | File | Key Endpoints | Responsibilities |
| :--- | :--- | :--- | :--- |
| **`authService`** | `services/auth.service.ts` | `/auth/register`<br>`/auth/login`<br>`/auth/refresh-token`<br>`/auth/me`<br>`/auth/admin-check`<br>`/auth/logout` | Authentication, token renewal, session restore, role barrier verification. |
| **`productsService`** | `services/products.service.ts` | `/products`<br>`/products/slug/:slug`<br>`/products/:id` | Catalog discovery, pagination, server-side filtering, sorting, product details. |
| **`categoriesService`**| `services/categories.service.ts` | `/categories`<br>`/categories/:id` | Hierarchical category tree retrieval, category lookup by ID. |
| **`cartService`** | `services/cart.service.ts` | `/cart`<br>`/cart/items`<br>`/cart/items/:id` | Server-authoritative cart management, quantity updates, clear cart. |
| **`ordersService`** | `services/orders.service.ts` | `/orders/checkout`<br>`/orders`<br>`/orders/:id`<br>`/orders/:id/cancel` | Atomic checkout submission with idempotency, user order history, order cancellation. |
| **`paymentsService`** | `services/payments.service.ts` | `/payments/orders/:id/pay`<br>`/payments/orders/:id` | Simulated payment gateway dispatching, payment attempts history. |
| **`healthService`** | `services/health.service.ts` | `/health`<br>`/api/v1/health` | Backend system health probe, database and redis connectivity monitoring. |

---

## ⚠️ 5. Standardized Error Handling

All caught API exceptions are parsed through [`src/utils/error-handler.ts`](../src/utils/error-handler.ts):

- **Validation Errors (`400 VALIDATION_ERROR`)**: `getFieldValidationErrors(error)` extracts field-level Zod issues (e.g. `body.email` $\to$ `email`) for React Hook Form mapping.
- **Rate Limiting (`429 RATE_LIMIT_EXCEEDED`)**: Returns friendly cooldown advisory.
- **Offline / Server Down (`ERR_NETWORK`)**: Returns `"Cannot connect to QuickCart backend server. Please ensure the backend is running."`
- **Timeouts (`ECONNABORTED`)**: Returns `"Request timed out. Please check your network connection."`
