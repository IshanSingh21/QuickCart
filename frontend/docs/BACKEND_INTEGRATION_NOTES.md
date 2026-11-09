# QuickCart — Backend Integration Notes & Frontend Guardrails

This document records the architectural constraints, missing backend capabilities, security mechanisms, and integration guidelines that the frontend team must observe when integrating with the QuickCart API.

---

## ⚠️ 1. Known Backend Limitations & Unsupported Features

### A. No Guest Cart or Unauthenticated Checkout
- **Backend Reality**: The cart endpoints (`GET /api/v1/cart`, `POST /api/v1/cart/items`) and checkout endpoint (`POST /api/v1/orders/checkout`) enforce the `authenticate` middleware. Unauthenticated requests return `401 Unauthorized`.
- **Frontend Integration Decision**:
  - The frontend will maintain a lightweight client-side cart in `localStorage` for anonymous visitors.
  - When a guest clicks **"Proceed to Checkout"** or visits `/cart`, prompt the user to **Sign In** or **Create an Account**, preserving their cart state and automatically redirecting them back to checkout post-authentication.

### B. No Multipart Image Upload Endpoint
- **Backend Reality**: The `POST /api/v1/products` and `PUT /api/v1/products/:id` endpoints accept image URLs (`url: z.string().url()`). There is no file upload route (`/api/v1/uploads`) or multipart form parser configured.
- **Frontend Integration Decision**:
  - Admin product creation/edit forms must use a URL input field (e.g. Unsplash or CDN links) with an image preview container rather than an asynchronous file upload widget.

### C. No Password Reset / Email Verification Flow
- **Backend Reality**: The authentication module implements `register`, `login`, `refresh-token`, `me`, and `logout`. There are no endpoints for email verification, OTP generation, or password resets.
- **Frontend Integration Decision**:
  - The `/login` page will deliberately omit "Forgot password?" links to avoid dead ends or broken user journeys.

### D. No Client-Side Discount or Price Alterations
- **Backend Reality**: The checkout endpoint strictly enforces **Server-Side Price Authority**. Clients cannot supply prices, discounts, coupons, shipping rates, or subtotal overrides.
- **Frontend Integration Decision**:
  - The frontend checkout form must only collect `shippingAddress` and generate an `Idempotency-Key`.
  - Displayed totals on the frontend must always be treated as previews; the authoritative source of truth is the response returned by `POST /api/v1/orders/checkout`.

---

## ⏱️ 2. Time-Sensitive Order Expiration (15-Minute Window)

### Mechanism
- When an order is created, the backend sets its status to `PENDING_PAYMENT` and pushes a delayed job to BullMQ (`order-expirations`) with a **15-minute countdown** (`15 * 60 * 1000 ms`).
- If payment is not completed before the job triggers, the worker transitions the order status to `EXPIRED` and atomically restocks the product inventory. Any subsequent attempt to pay returns `400 Bad Request: Cannot pay for an expired order`.

### Frontend Implementation Mandate
- The payment screen (`/pay/[orderId]`) must display a **live countdown timer** calculated from `new Date(order.createdAt).getTime() + 15 * 60 * 1000`.
- When the timer hits `00:00`:
  1. Freeze the payment form.
  2. Poll or refetch the order detail to verify the `EXPIRED` status.
  3. Display an **"Order Expired"** alert banner with a button directing the user back to `/products` to re-order.

---

## 💳 3. Simulated Payment Gateway Integration

### Mechanism
- The backend does not connect to live financial networks (Stripe/PayPal). Instead, it runs an internal `SimulatedPaymentProvider` that mirrors real gateway latency and failure scenarios.

### Frontend Implementation Mandate
- The payment view should provide an intuitive, portfolio-ready **Interactive Simulation Console**:
  - **Payment Method Selector**: `SIMULATED_CARD`, `SIMULATED_WALLET`, `SIMULATED_BANK_TRANSFER`, `SIMULATED_UPI`.
  - **Simulate Outcome Dropdown** (for demonstration & evaluation):
    - `SUCCESS` $\to$ Returns `200 OK`, transitions order to `PAID`.
    - `CARD_DECLINED` $\to$ Returns `402 Payment Required`, keeps order in `PENDING_PAYMENT`.
    - `INSUFFICIENT_FUNDS` $\to$ Returns `402 Payment Required`.
    - `GATEWAY_TIMEOUT` $\to$ Returns `500 Internal Error` (tests frontend error handling).
  - **Release Inventory on Failure Toggle**: Allows testing terminal order cancellation vs. retryable decline.

---

## 🚦 4. Rate Limiting & Throttling Guardrails

| Endpoint Group | Threshold | Behavior on Breach |
| :--- | :--- | :--- |
| `POST /auth/register`<br>`POST /auth/login` | **10 requests per 15 minutes** | Returns `429 Too Many Requests`<br>`code: "RATE_LIMIT_EXCEEDED"` |
| All other `/api/v1/*` routes | **100 requests per 15 minutes** | Returns `429 Too Many Requests`<br>`code: "RATE_LIMIT_EXCEEDED"` |

### Frontend Handling
- Disable form submit buttons while authentication or checkout requests are in-flight to prevent accidental double-clicks.
- If a `429` error is intercepted, display a prominent toast or alert: *"Too many requests. Please wait a few moments before trying again."*

---

## 🔒 5. IDOR Ownership Defense (404 vs 403)

- **Backend Reality**: When a customer requests an order that belongs to another user (`GET /api/v1/orders/:id`), the backend intentionally returns `404 Not Found` rather than `403 Forbidden` to prevent attackers from discovering valid order UUIDs through enumeration.
- **Frontend Handling**:
  - Treat `404 Not Found` gracefully on the order detail page by rendering a friendly empty state: *"Order not found. It may have been removed or you may need to log in to the account that placed it."*

---

## 🔢 6. Financial Formatting & Precision

- The backend models all currency using PostgreSQL `DECIMAL(10,2)` and serializes them in JSON responses as **exact strings** (e.g., `"349.99"`, `"0.00"`).
- **Frontend Handling**:
  - Avoid performing floating-point math on prices in client code.
  - Render prices using a standard formatter:
    ```typescript
    export const formatPrice = (price: string | number, currency = 'USD'): string => {
      const numeric = typeof price === 'string' ? parseFloat(price) : price;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numeric || 0);
    };
    ```
