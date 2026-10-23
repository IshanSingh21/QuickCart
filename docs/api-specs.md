# QuickCart REST API Specification & Contract

## 1. Global API Standards

- **Base URL:** `/api/v1`
- **Content-Type:** `application/json`
- **Authentication Header:** `Authorization: Bearer <jwt_access_token>`
- **Idempotency Header:** `Idempotency-Key: <uuid_v4>` (Mandatory on state-mutating requests: `/orders/checkout`, `/payments/*`)

---

## 2. Standardized JSON Envelope Format

All responses follow a predictable JSON contract across the entire API.

### Success Response Envelope
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 54,
    "totalPages": 6
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "price",
        "message": "Price must be a positive decimal number"
      }
    ]
  }
}
```

### Standard HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or malformed payload.
- `401 Unauthorized`: Missing, expired, or invalid JWT access token.
- `403 Forbidden`: Authenticated user lacks permission (RBAC).
- `404 Not Found`: Target resource does not exist.
- `409 Conflict`: Business rule conflict (e.g., out-of-stock race condition, duplicate unique email, concurrent idempotency lock).
- `422 Unprocessable Entity`: Semantic logic violation.
- `429 Too Many Requests`: Rate limit quota exceeded.
- `500 Internal Server Error`: Unhandled server exception.

---

## 3. Authentication & User Management Endpoints (`/api/v1/auth`)

### 3.1 Register User
- **Method & Route:** `POST /api/v1/auth/register`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "StrongPassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "c1f7b8d0-23a4-4f51-b8d2-5a9d82f7c001",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CUSTOMER",
      "createdAt": "2026-10-23T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
      "refreshToken": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "expiresIn": 900
    }
  }
}
```

### 3.2 Login
- **Method & Route:** `POST /api/v1/auth/login`
- **Access:** Public
- **Request Body:**
```json
{
  "email": "customer@example.com",
  "password": "StrongPassword123!"
}
```
- **Response (200 OK):** Same tokens and user object envelope as register.

### 3.3 Refresh Token Rotation
- **Method & Route:** `POST /api/v1/auth/refresh-token`
- **Access:** Public
- **Request Body:**
```json
{
  "refreshToken": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
- **Response (200 OK):** New access token and rotated refresh token.

### 3.4 Logout
- **Method & Route:** `POST /api/v1/auth/logout`
- **Access:** Authenticated (Bearer Token)
- **Request Body:**
```json
{
  "refreshToken": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```
- **Response (200 OK):** `{ "success": true, "message": "Successfully logged out" }`

### 3.5 Get Profile
- **Method & Route:** `GET /api/v1/auth/me`
- **Access:** Authenticated (Bearer Token)

---

## 4. Product Catalog & Categories Endpoints

### 4.1 List Categories (Hierarchical Tree)
- **Method & Route:** `GET /api/v1/categories`
- **Access:** Public (Cached in Redis)
- **Response (200 OK):** Returns nested array of categories with subcategories.

### 4.2 List Products (Filtering, Search & Pagination)
- **Method & Route:** `GET /api/v1/products`
- **Access:** Public (Cached in Redis by query hash)
- **Query Parameters:**
  - `search`: String (Full-text search on title/description)
  - `category`: String (Slug or UUID)
  - `minPrice`: Decimal
  - `maxPrice`: Decimal
  - `sortBy`: `price` | `createdAt` | `name` (Default: `createdAt`)
  - `order`: `asc` | `desc` (Default: `desc`)
  - `page`: Integer (Default: 1)
  - `limit`: Integer (Default: 10, Max: 50)
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "p001-uuid",
      "name": "Wireless Noise-Cancelling Headphones",
      "slug": "wireless-noise-cancelling-headphones",
      "sku": "WH-1000XM5-BLK",
      "price": "299.99",
      "stock": 42,
      "category": {
        "id": "cat-uuid",
        "name": "Audio",
        "slug": "audio"
      },
      "images": [
        { "url": "https://cdn.quickcart.com/wh5.jpg", "isPrimary": true }
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

### 4.3 Get Product Details by Slug or ID
- **Method & Route:** `GET /api/v1/products/:id` or `GET /api/v1/products/slug/:slug`
- **Access:** Public (Cached in Redis)

### 4.4 Create / Update / Delete Product
- **Method & Route:** `POST /api/v1/products` | `PUT /api/v1/products/:id` | `DELETE /api/v1/products/:id`
- **Access:** Admin only (`role === 'ADMIN'`)
- *Invalidates relevant Redis product and catalog cache keys.*

---

## 5. Shopping Cart Endpoints (`/api/v1/cart`)

### 5.1 Get Current User Cart
- **Method & Route:** `GET /api/v1/cart`
- **Access:** Authenticated Customer
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "cartId": "cart-uuid",
    "items": [
      {
        "itemId": "cart-item-uuid",
        "productId": "p001-uuid",
        "name": "Wireless Noise-Cancelling Headphones",
        "sku": "WH-1000XM5-BLK",
        "currentPrice": "299.99",
        "quantity": 2,
        "lineTotal": "599.98",
        "availableStock": 42
      }
    ],
    "subtotal": "599.98",
    "itemCount": 2
  }
}
```

### 5.2 Add Item to Cart
- **Method & Route:** `POST /api/v1/cart/items`
- **Access:** Authenticated Customer
- **Request Body:**
```json
{
  "productId": "p001-uuid",
  "quantity": 2
}
```
*(Notice: Price is NEVER provided by client)*

### 5.3 Update Item Quantity
- **Method & Route:** `PATCH /api/v1/cart/items/:itemId`
- **Access:** Authenticated Customer
- **Request Body:** `{ "quantity": 3 }`

### 5.4 Remove Item / Clear Cart
- **Method & Route:** `DELETE /api/v1/cart/items/:itemId` | `DELETE /api/v1/cart`
- **Access:** Authenticated Customer

---

## 6. Orders & Checkout Endpoints (`/api/v1/orders`)

### 6.1 Checkout Cart (Atomic Order Creation & Inventory Hold)
- **Method & Route:** `POST /api/v1/orders/checkout`
- **Access:** Authenticated Customer
- **Mandatory Header:** `Idempotency-Key: 7b2c5890-48e2-45e0-82a1-127392a83e01`
- **Request Body:**
```json
{
  "shippingAddress": {
    "fullName": "Jane Doe",
    "addressLine1": "123 Market St",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "country": "US"
  }
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Order created successfully. Complete payment within 15 minutes.",
  "data": {
    "order": {
      "id": "ord-uuid",
      "orderNumber": "ORD-20261023-A98F",
      "status": "PENDING_PAYMENT",
      "subtotal": "599.98",
      "taxAmount": "48.00",
      "shippingAmount": "0.00",
      "totalAmount": "647.98",
      "currency": "USD",
      "expiresAt": "2026-10-23T12:15:00.000Z",
      "items": [
        {
          "productId": "p001-uuid",
          "productName": "Wireless Noise-Cancelling Headphones",
          "quantity": 2,
          "unitPrice": "299.99",
          "lineTotal": "599.98"
        }
      ]
    }
  }
}
```

### 6.2 List User Orders
- **Method & Route:** `GET /api/v1/orders`
- **Access:** Authenticated Customer (Scoped to `req.user.id`)

### 6.3 Get Order by ID
- **Method & Route:** `GET /api/v1/orders/:id`
- **Access:** Authenticated Customer (Ownership verified) or Admin

---

## 7. Simulated Payments Endpoints (`/api/v1/payments`)

### 7.1 Process Simulated Payment
- **Method & Route:** `POST /api/v1/payments/orders/:orderId/pay`
- **Access:** Authenticated Customer
- **Mandatory Header:** `Idempotency-Key: e4a32981-9f20-412e-9d21-f09238914022`
- **Request Body:**
```json
{
  "paymentMethod": "SIMULATED_CARD",
  "cardNumberLast4": "4242",
  "simulateStatus": "SUCCESS"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment confirmed and order marked as PAID",
  "data": {
    "payment": {
      "id": "pay-uuid",
      "orderId": "ord-uuid",
      "paymentIntentId": "pi_simulated_982348234",
      "status": "SUCCEEDED",
      "amount": "647.98",
      "currency": "USD"
    },
    "orderStatus": "PAID"
  }
}
```

---

## 8. System Healthcheck (`/health`)

- **Method & Route:** `GET /health`
- **Access:** Public
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-23T12:00:00.000Z",
  "uptime": 1420.5,
  "database": {
    "status": "connected",
    "latencyMs": 3.2
  },
  "redis": {
    "status": "connected",
    "latencyMs": 0.8
  },
  "version": "0.1.0"
}
```
