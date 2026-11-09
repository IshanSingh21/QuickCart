# QuickCart — Comprehensive Frontend API Contract

This document provides a verified, production-grade specification of all RESTful API endpoints exposed by the QuickCart backend (`v0.1.0`). Every endpoint, parameter, request envelope, response payload, error code, and file reference documented here reflects the **actual backend implementation**.

---

## 🌐 Global API Architecture & Conventions

### Base URLs & Environment
- **Development Base URL**: `http://localhost:5000/api/v1`
- **Root Welcome Route**: `http://localhost:5000/`
- **Direct Container Health Probe**: `http://localhost:5000/health`
- **Versioned API Health Probe**: `http://localhost:5000/api/v1/health`

### Standard Request Headers
- `Content-Type: application/json` (Required for `POST`, `PUT`, `PATCH`)
- `Authorization: Bearer <access_token>` (Required for all protected endpoints)
- `Idempotency-Key: <unique_uuid_or_string>` (Optional but strongly recommended for `checkout` and `pay` endpoints to prevent duplicate charges/orders on network retry)

### Standard Response Envelopes

#### Success Envelope (`ApiResponse.success`)
All successful HTTP responses (`200 OK`, `201 Created`) are wrapped in this envelope:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resource retrieved successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```
*Note: `meta` is present on paginated list endpoints (`products`, `orders`). For singular responses, `meta` is omitted.*

#### Error Envelope (`ApiResponse.error`)
All HTTP error responses (`400`, `401`, `402`, `403`, `404`, `409`, `422`, `429`, `500`) follow this strict structure:
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "body.email",
        "message": "Please provide a valid email address",
        "rule": "invalid_string"
      }
    ]
  }
}
```

### Standard Error Codes (`ErrorCodes`)
| Error Code | HTTP Status | Trigger / Description |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | `400 Bad Request` | Zod schema validation failed on body, query, or params |
| `UNAUTHORIZED` | `401 Unauthorized` | Missing, malformed, or invalid Bearer token |
| `TOKEN_EXPIRED` | `401 Unauthorized` | Access token JWT lifetime has elapsed |
| `INVALID_TOKEN` | `401 Unauthorized` | Token signature mismatch or corrupted token |
| `PAYMENT_REQUIRED` | `402 Payment Required`| Simulated payment card decline or insufficient funds |
| `FORBIDDEN` | `403 Forbidden` | Authenticated user lacks required role (e.g. `CUSTOMER` trying to access `ADMIN` route) |
| `NOT_FOUND` | `404 Not Found` | Requested resource ID does not exist, or IDOR ownership access blocked |
| `CONFLICT` | `409 Conflict` | Unique constraint collision (email, slug, SKU, idempotency key) or insufficient inventory stock |
| `RATE_LIMIT_EXCEEDED` | `429 Too Many Requests` | IP exceeded sliding window rate limit threshold |
| `INTERNAL_ERROR` | `500 Internal Server Error`| Unhandled server exception or gateway communication failure |
| `DATABASE_ERROR` | `500 Internal Server Error`| Relational database connection or query execution failure |

---

## 📋 Comprehensive Endpoint Inventory

### 1. System & Health Probes

#### `GET /api/v1/health`
- **Access**: Public
- **Implementation**: [`src/modules/health/health.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/health/health.controller.js)
- **Description**: Inspects database connectivity latency, Redis ping status, process uptime, and memory consumption.
- **Request Body**: None
- **Response `data`**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-08T12:00:00.000Z",
    "uptime": 3600,
    "environment": "development",
    "version": "0.1.0",
    "memory": {
      "rssMb": 65,
      "heapUsedMb": 32,
      "heapTotalMb": 48
    },
    "database": {
      "status": "connected",
      "latencyMs": 4
    },
    "redis": {
      "status": "connected",
      "latencyMs": 2
    }
  }
  ```

---

### 2. Authentication & User Profile

#### `POST /api/v1/auth/register`
- **Access**: Public (Rate Limited: 10 req / 15m)
- **Implementation**: [`src/modules/auth/auth.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/auth/auth.controller.js)
- **Validation**: [`registerSchema`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/auth/auth.validation.js)
- **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "password": "Password123!",
    "firstName": "Jane",
    "lastName": "Doe"
  }
  ```
  *Password Requirements*: Min 8 chars, max 100 chars; at least 1 uppercase, 1 lowercase, 1 number, 1 special character (`!@#$%^&*()_+-=[]{};':"|,.<>/?`).
- **Response `data` (`201 Created`)**:
  ```json
  {
    "user": {
      "id": "c1f7a6b2-8e12-4c6e-9310-8b1a2d5f6e80",
      "email": "customer@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "CUSTOMER",
      "isActive": true,
      "createdAt": "2026-11-08T12:00:00.000Z",
      "updatedAt": "2026-11-08T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "7a8f9c1e2d3b4a5f6081...",
      "expiresIn": 900
    }
  }
  ```
- **Errors**: `400 VALIDATION_ERROR`, `409 CONFLICT` ("An account with this email already exists"), `429 RATE_LIMIT_EXCEEDED`.

#### `POST /api/v1/auth/login`
- **Access**: Public (Rate Limited: 10 req / 15m)
- **Implementation**: [`src/modules/auth/auth.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/auth/auth.controller.js)
- **Validation**: [`loginSchema`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/auth/auth.validation.js)
- **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "password": "Password123!"
  }
  ```
- **Response `data` (`200 OK`)**: Identical structure to `register` (`user` + `tokens`).
- **Errors**: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED` ("Invalid email or password"), `429 RATE_LIMIT_EXCEEDED`.

#### `POST /api/v1/auth/refresh-token`
- **Access**: Public
- **Implementation**: [`src/modules/auth/auth.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/auth/auth.controller.js)
- **Validation**: [`refreshTokenSchema`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/auth/auth.validation.js)
- **Request Body**:
  ```json
  {
    "refreshToken": "7a8f9c1e2d3b4a5f6081..."
  }
  ```
- **Response `data` (`200 OK`)**:
  ```json
  {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "b2c3d4e5f6a102938475...",
      "expiresIn": 900
    }
  }
  ```
- **Errors**: `401 UNAUTHORIZED` ("Invalid or expired refresh token" or "Invalid refresh token. Session terminated for security.").

#### `GET /api/v1/auth/me`
- **Access**: Authenticated (`Bearer <token>`)
- **Implementation**: [`src/modules/auth/auth.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/auth/auth.controller.js)
- **Request Body**: None
- **Response `data` (`200 OK`)**:
  ```json
  {
    "user": {
      "id": "c1f7a6b2-8e12-4c6e-9310-8b1a2d5f6e80",
      "email": "customer@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "CUSTOMER",
      "isActive": true,
      "createdAt": "2026-11-08T12:00:00.000Z",
      "updatedAt": "2026-11-08T12:00:00.000Z"
    }
  }
  ```
- **Errors**: `401 UNAUTHORIZED`, `401 TOKEN_EXPIRED`, `404 NOT_FOUND`.

#### `GET /api/v1/auth/admin-check`
- **Access**: Authenticated (`ADMIN` role only)
- **Implementation**: [`src/modules/auth/auth.routes.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/auth/auth.routes.js#L45-L55)
- **Request Body**: None
- **Response `data` (`200 OK`)**:
  ```json
  {
    "authorized": true,
    "user": {
      "id": "uuid",
      "email": "admin@quickcart.com",
      "role": "ADMIN"
    }
  }
  ```
- **Errors**: `401 UNAUTHORIZED`, `403 FORBIDDEN`.

#### `POST /api/v1/auth/logout`
- **Access**: Optional Bearer Auth or Body Refresh Token
- **Implementation**: [`src/modules/auth/auth.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/auth/auth.controller.js)
- **Request Body**:
  ```json
  {
    "refreshToken": "7a8f9c1e2d3b4a5f6081..."
  }
  ```
- **Response `data` (`200 OK`)**: `{ "loggedOut": true }`

---

### 3. Categories API

#### `GET /api/v1/categories`
- **Access**: Public (Redis Cached)
- **Implementation**: [`src/modules/categories/categories.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/categories/categories.controller.js)
- **Query Parameters**:
  - `tree` (optional, boolean string, default: `'true'`): When `'true'`, returns top-level categories with nested `children`. When `'false'`, returns flat list.
- **Response `data` (`200 OK`)**:
  ```json
  [
    {
      "id": "e3b0c442-98fc-1c14-9af0-2a3c4d5e6f70",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Cutting-edge consumer electronics.",
      "parentId": null,
      "createdAt": "2026-11-08T12:00:00.000Z",
      "updatedAt": "2026-11-08T12:00:00.000Z",
      "_count": { "products": 12 },
      "children": [
        {
          "id": "f4c1d553-09ad-2d25-0ba1-3b4c5d6e7f81",
          "name": "Laptops",
          "slug": "laptops",
          "description": "Portable computers.",
          "parentId": "e3b0c442-98fc-1c14-9af0-2a3c4d5e6f70",
          "_count": { "products": 5 },
          "children": []
        }
      ]
    }
  ]
  ```

#### `GET /api/v1/categories/:id`
- **Access**: Public
- **Path Parameters**: `id` (UUID)
- **Response `data` (`200 OK`)**: Single category object with `parent`, `children`, and `_count.products`.
- **Errors**: `400 VALIDATION_ERROR` (invalid UUID), `404 NOT_FOUND`.

#### `POST /api/v1/categories`
- **Access**: Admin Only (`role: 'ADMIN'`)
- **Request Body**:
  ```json
  {
    "name": "Wearables",
    "slug": "wearables",
    "description": "Smartwatches and fitness bands",
    "parentId": null
  }
  ```
- **Response `data` (`201 Created`)**: Created category record.
- **Errors**: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 CONFLICT` (slug already exists).

#### `PUT /api/v1/categories/:id`
- **Access**: Admin Only
- **Path Parameters**: `id` (UUID)
- **Request Body**: Partial `{ name?, slug?, description?, parentId? }`
- **Response `data` (`200 OK`)**: Updated category record.

#### `DELETE /api/v1/categories/:id`
- **Access**: Admin Only
- **Path Parameters**: `id` (UUID)
- **Response `data` (`200 OK`)**: `{ "deleted": true, "id": "..." }`
- **Errors**: `400 BAD_REQUEST` (if category still has associated products).

---

### 4. Products & Catalog API

#### `GET /api/v1/products`
- **Access**: Public (Redis Cached for public queries)
- **Implementation**: [`src/modules/products/products.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/products/products.controller.js)
- **Query Parameters**:
  | Parameter | Type | Default | Description |
  | :--- | :--- | :--- | :--- |
  | `page` | integer | `1` | Page number ($\ge 1$) |
  | `limit` | integer | `10` | Page size ($1 \le limit \le 50$) |
  | `search` | string | `undefined` | Case-insensitive match on product name or description |
  | `category` | string | `undefined` | Category UUID or category slug (includes subcategories) |
  | `minPrice` | number | `undefined` | Minimum price filter ($\ge 0$) |
  | `maxPrice` | number | `undefined` | Maximum price filter ($\ge minPrice$) |
  | `sortBy` | string | `'createdAt'` | Sort field: `'createdAt'`, `'price'`, or `'name'` |
  | `order` | string | `'desc'` | Sort direction: `'asc'` or `'desc'` |
  | `isActive` | string | `undefined` | `'true'`, `'false'`, or `'all'` (**ADMIN role only**) |
- **Response Envelope (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Products retrieved successfully",
    "data": [
      {
        "id": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Sony WH-1000XM5 Wireless Headphones",
        "slug": "sony-wh-1000xm5",
        "sku": "SONY-XM5-BLK",
        "description": "Industry-leading noise canceling headphones...",
        "price": "349.99",
        "stock": 50,
        "version": 1,
        "categoryId": "e3b0c442-98fc-1c14-9af0-2a3c4d5e6f70",
        "isActive": true,
        "createdAt": "2026-11-08T12:00:00.000Z",
        "updatedAt": "2026-11-08T12:00:00.000Z",
        "category": {
          "id": "e3b0c442-98fc-1c14-9af0-2a3c4d5e6f70",
          "name": "Audio",
          "slug": "audio"
        },
        "images": [
          {
            "id": "a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
            "productId": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
            "altText": "Sony WH-1000XM5 Wireless Headphones in Black",
            "isPrimary": true,
            "sortOrder": 0
          }
        ]
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

#### `GET /api/v1/products/slug/:slug`
- **Access**: Public (Redis Cached)
- **Path Parameters**: `slug` (string)
- **Response `data` (`200 OK`)**: Single product object with `category` and sorted `images`.
- **Errors**: `404 NOT_FOUND` ("Product not found").

#### `GET /api/v1/products/:id`
- **Access**: Public (Redis Cached)
- **Path Parameters**: `id` (UUID)
- **Response `data` (`200 OK`)**: Single product object with `category` and sorted `images`.
- **Errors**: `400 VALIDATION_ERROR` (invalid UUID), `404 NOT_FOUND`.

#### `POST /api/v1/products`
- **Access**: Admin Only
- **Request Body**:
  ```json
  {
    "name": "Apple Watch Ultra 2",
    "slug": "apple-watch-ultra-2",
    "sku": "AW-ULTRA2-TI",
    "description": "Rugged and capable smartwatch.",
    "price": 799.00,
    "stock": 30,
    "categoryId": "e3b0c442-98fc-1c14-9af0-2a3c4d5e6f70",
    "isActive": true,
    "images": [
      {
        "url": "https://images.unsplash.com/photo-watch",
        "altText": "Apple Watch Ultra 2 Titanium",
        "isPrimary": true,
        "sortOrder": 0
      }
    ]
  }
  ```
- **Response `data` (`201 Created`)**: Created product record.
- **Cache Side Effect**: Automatically flushes all cached product lists via non-blocking Redis `SCAN`.

#### `PUT /api/v1/products/:id`
- **Access**: Admin Only
- **Path Parameters**: `id` (UUID)
- **Request Body**: Partial product update fields.
- **Response `data` (`200 OK`)**: Updated product record.

#### `DELETE /api/v1/products/:id`
- **Access**: Admin Only
- **Path Parameters**: `id` (UUID)
- **Response `data` (`200 OK`)**: `{ "deleted": true, "id": "..." }`

---

### 5. Shopping Cart API

*All cart operations require an active Bearer JWT token.*

#### `GET /api/v1/cart`
- **Access**: Authenticated
- **Implementation**: [`src/modules/cart/cart.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/cart/cart.controller.js)
- **Description**: Returns the caller's active shopping cart with live, server-side authoritative pricing, stock availability flags, and calculated subtotal.
- **Response `data` (`200 OK`)**:
  ```json
  {
    "cartId": "f9a8b7c6-d5e4-3f2a-1b0c-9d8e7f6a5b4c",
    "items": [
      {
        "itemId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "productId": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Sony WH-1000XM5 Wireless Headphones",
        "slug": "sony-wh-1000xm5",
        "sku": "SONY-XM5-BLK",
        "currentPrice": "349.99",
        "quantity": 2,
        "lineTotal": "699.98",
        "availableStock": 50,
        "isActive": true,
        "isAvailable": true,
        "category": { "id": "uuid", "name": "Audio", "slug": "audio" },
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e"
      }
    ],
    "subtotal": "699.98",
    "itemCount": 2,
    "distinctCount": 1
  }
  ```

#### `POST /api/v1/cart/items`
- **Access**: Authenticated
- **Request Body**:
  ```json
  {
    "productId": "b1a2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "quantity": 1
  }
  ```
  *Rules*: `quantity` must be an integer between 1 and 100. If the product is already in the cart, quantities are accumulated.
- **Response `data` (`200 OK`)**: Full updated cart structure (`formatCart`).
- **Errors**: `400 VALIDATION_ERROR`, `404 NOT_FOUND` (product inactive or missing), `409 CONFLICT` (requested quantity exceeds available stock).

#### `PATCH /api/v1/cart/items/:itemId`
- **Access**: Authenticated
- **Path Parameters**: `itemId` (CartItem UUID)
- **Request Body**:
  ```json
  {
    "quantity": 3
  }
  ```
- **Response `data` (`200 OK`)**: Full updated cart structure.
- **Errors**: `404 NOT_FOUND` (item doesn't belong to caller), `409 CONFLICT` (exceeds stock).

#### `DELETE /api/v1/cart/items/:itemId`
- **Access**: Authenticated
- **Path Parameters**: `itemId` (CartItem UUID)
- **Response `data` (`200 OK`)**: Full updated cart structure without the deleted item.

#### `DELETE /api/v1/cart`
- **Access**: Authenticated
- **Response `data` (`200 OK`)**: Empty cart structure (`items: []`, `subtotal: "0.00"`, `itemCount: 0`).

---

### 6. Orders & Checkout API

#### `POST /api/v1/orders/checkout`
- **Access**: Authenticated
- **Implementation**: [`src/modules/orders/orders.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/orders/orders.controller.js)
- **Headers**:
  - `Idempotency-Key: <unique_client_key>` (optional header, recommended)
- **Request Body**:
  ```json
  {
    "shippingAddress": {
      "fullName": "Jane Doe",
      "addressLine1": "100 Market St",
      "addressLine2": "Suite 300",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94105",
      "country": "USA",
      "phone": "+1 415-555-0199"
    },
    "idempotencyKey": "order_checkout_random_key_12345"
  }
  ```
- **Response `data` (`201 Created` or `200 OK` on replay)**:
  ```json
  {
    "order": {
      "id": "3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
      "orderNumber": "ORD-1731067200000-A9Z1K",
      "userId": "c1f7a6b2-8e12-4c6e-9310-8b1a2d5f6e80",
      "status": "PENDING_PAYMENT",
      "subtotal": "699.98",
      "taxAmount": "0.00",
      "shippingAmount": "0.00",
      "totalAmount": "699.98",
      "currency": "USD",
      "idempotencyKey": "order_checkout_random_key_12345",
      "shippingAddress": { ... },
      "itemCount": 2,
      "items": [
        {
          "id": "order-item-uuid",
          "productId": "product-uuid",
          "productName": "Sony WH-1000XM5 Wireless Headphones",
          "productSku": "SONY-XM5-BLK",
          "unitPrice": "349.99",
          "quantity": 2,
          "lineTotal": "699.98",
          "createdAt": "2026-11-08T12:00:00.000Z"
        }
      ],
      "payments": [],
      "createdAt": "2026-11-08T12:00:00.000Z",
      "updatedAt": "2026-11-08T12:00:00.000Z"
    }
  }
  ```
- **Errors**:
  - `400 BAD_REQUEST`: Empty cart or missing required shipping fields.
  - `409 CONFLICT`: Insufficient product stock or inactive product in cart.
  - `409 CONFLICT`: Idempotency key previously used by a different user.

#### `GET /api/v1/orders`
- **Access**: Authenticated
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 10, max: 50)
  - `status` (optional enum: `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `EXPIRED`, `REFUNDED`)
- **Response Envelope (`200 OK`)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Order history retrieved successfully",
    "data": [ /* Array of formatted Order objects */ ],
    "meta": { "page": 1, "limit": 10, "total": 3, "totalPages": 1 }
  }
  ```

#### `GET /api/v1/orders/:id`
- **Access**: Authenticated (Owner or Admin)
- **Path Parameters**: `id` (Order UUID)
- **Response `data` (`200 OK`)**: `{ "order": { ... } }`
- **Errors**: `404 NOT_FOUND` (Returned if order does not exist OR belongs to another customer — IDOR protection).

#### `PATCH /api/v1/orders/:id/cancel`
- **Access**: Authenticated (Owner or Admin)
- **Path Parameters**: `id` (Order UUID)
- **Description**: Cancels an unpaid order (`PENDING_PAYMENT`) and atomically increments product inventory back into stock.
- **Response `data` (`200 OK`)**: `{ "order": { ..., "status": "CANCELLED" } }`
- **Errors**: `400 BAD_REQUEST` (If order is already `PAID`, `EXPIRED`, or `SHIPPED`).

---

### 7. Payments API (Simulated Provider)

#### `POST /api/v1/payments/orders/:orderId/pay`
- **Access**: Authenticated (Owner or Admin)
- **Implementation**: [`src/modules/payments/payments.controller.js`](file:///C:/Users/ASUS/.gemini/antigravity/scratch/quickcart/src/modules/payments/payments.controller.js)
- **Path Parameters**: `orderId` (UUID)
- **Headers**: `Idempotency-Key: <unique_client_key>` (optional header)
- **Request Body**:
  ```json
  {
    "paymentMethod": "SIMULATED_CARD",
    "simulateOutcome": "SUCCESS",
    "idempotencyKey": "pay_idemp_key_12345",
    "releaseInventoryOnFailure": false
  }
  ```
  - `paymentMethod`: `'SIMULATED_CARD' | 'SIMULATED_WALLET' | 'SIMULATED_BANK_TRANSFER' | 'SIMULATED_UPI'` (default: `'SIMULATED_CARD'`)
  - `simulateOutcome`: `'SUCCESS' | 'CARD_DECLINED' | 'INSUFFICIENT_FUNDS' | 'GATEWAY_TIMEOUT'` (default: `'SUCCESS'`)
  - `releaseInventoryOnFailure`: boolean (default: `false`). When `true` and the payment is declined, the order status transitions to `CANCELLED` and inventory is restocked. When `false`, the order remains `PENDING_PAYMENT` allowing retries.
- **Response `data` (`200 OK`)**:
  ```json
  {
    "payment": {
      "id": "payment-uuid",
      "orderId": "order-uuid",
      "paymentIntentId": "pi_sim_1234567890abcdef",
      "idempotencyKey": "pay_idemp_key_12345",
      "provider": "SIMULATED_GATEWAY",
      "status": "SUCCEEDED",
      "amount": "699.98",
      "currency": "USD",
      "gatewayResponse": {
        "success": true,
        "status": "SUCCEEDED",
        "chargeId": "ch_sim_12345",
        "authorizationCode": "AUTH_98765"
      },
      "createdAt": "2026-11-08T12:00:00.000Z",
      "updatedAt": "2026-11-08T12:00:00.000Z"
    },
    "orderStatus": "PAID",
    "isIdempotentReplay": false
  }
  ```
- **Errors**:
  - `400 BAD_REQUEST`: Order already `PAID`, `CANCELLED`, or `EXPIRED`.
  - `402 PAYMENT_REQUIRED`: Card declined or insufficient funds.
  - `404 NOT_FOUND`: Order does not exist or belongs to another user.
  - `409 CONFLICT`: Duplicate idempotency key in-flight or belonging to another user.
  - `500 INTERNAL_ERROR`: `GATEWAY_TIMEOUT` simulated failure.

#### `GET /api/v1/payments/orders/:orderId`
- **Access**: Authenticated
- **Path Parameters**: `orderId` (UUID)
- **Response `data` (`200 OK`)**: Array of all payment attempts for this order.

#### `GET /api/v1/payments/:id`
- **Access**: Authenticated
- **Path Parameters**: `id` (Payment UUID)
- **Response `data` (`200 OK`)**: Single payment record `{ "payment": { ... } }`.
