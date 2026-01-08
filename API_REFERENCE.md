# Oro POS - Detailed API Reference

This document provides detailed specifications for all API endpoints.

---

## Table of Contents

1. [POS APIs](#pos-apis)
2. [Inventory APIs](#inventory-apis)
3. [Client APIs](#client-apis)
4. [Marketing APIs](#marketing-apis)
5. [Reports APIs](#reports-apis)
6. [Settings APIs](#settings-apis)
7. [Public APIs](#public-apis)

---

## POS APIs

Base path: `/api/pos`

### GET /api/pos/menu

Get product menu for POS.

**Response:**
```json
{
  "categories": [...],
  "products": [...],
  "services": [...]
}
```

### POST /api/pos/transaction

Create a new transaction.

**Request:**
```json
{
  "items": [
    { "productId": "...", "quantity": 2, "price": 9.99 }
  ],
  "paymentMethod": "CASH|CREDIT_CARD|DEBIT_CARD|SPLIT",
  "tipAmount": 5.00,
  "clientId": "optional",
  "cashReceived": 50.00
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "...",
  "receiptNumber": "1234",
  "total": 25.98,
  "change": 24.02
}
```

### POST /api/pos/shift

Open or close a shift.

**Request:**
```json
{
  "action": "open|close",
  "amount": 100.00,
  "locationId": "optional"
}
```

### POST /api/pos/sms-receipt

Send receipt via SMS.

**Request:**
```json
{
  "transactionId": "...",
  "phone": "+15551234567"
}
```

### POST /api/pos/verify-owner-pin

Verify owner/manager PIN for protected actions.

**Request:**
```json
{
  "pin": "1234"
}
```

### POST /api/pos/transaction/[id]/void

Void a transaction.

**Request:**
```json
{
  "reason": "Customer requested refund"
}
```

### POST /api/pos/transaction/[id]/refund

Process a refund.

**Request:**
```json
{
  "items": [{ "lineItemId": "...", "quantity": 1 }],
  "reason": "Defective product"
}
```

---

## Inventory APIs

Base path: `/api/inventory`, `/api/products`

### GET /api/products

List products with pagination and filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results (default: 50) |
| `offset` | number | Pagination offset |
| `search` | string | Search by name/SKU |
| `categoryId` | string | Filter by category |
| `lowStock` | boolean | Only low stock items |

### POST /api/products

Create a new product.

**Request:**
```json
{
  "name": "Product Name",
  "sku": "SKU123",
  "barcode": "123456789012",
  "price": 9.99,
  "cost": 5.00,
  "stock": 100,
  "lowStockThreshold": 10,
  "categoryId": "...",
  "taxable": true
}
```

### PUT /api/products/[id]

Update product.

### DELETE /api/products/[id]

Delete product.

### GET /api/inventory/low-stock

Get products below threshold.

### POST /api/inventory/adjust

Adjust stock levels.

**Request:**
```json
{
  "productId": "...",
  "adjustment": -5,
  "reason": "Damaged goods"
}
```

### GET /api/reports/dead-stock

Get dead stock report.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | number | 90 | Days without sale to consider dead |

**Response:**
```json
{
  "products": [
    {
      "id": "...",
      "name": "Product",
      "stock": 50,
      "lastSoldAt": "2024-01-15",
      "daysSinceLastSale": 120,
      "valueAtRisk": 250.00
    }
  ],
  "totalValueAtRisk": 1500.00,
  "totalDeadProducts": 15
}
```

### POST /api/reports/dead-stock/deals

Create instant deals from dead stock.

**Request:**
```json
{
  "productIds": ["id1", "id2"],
  "discountPercent": 25,
  "duration": 7
}
```

---

## Client APIs

Base path: `/api/clients`

### GET /api/clients

List customers with pagination.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results |
| `search` | string | Search name/email/phone |

**Response:**
```json
{
  "clients": [
    {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+15551234567",
      "points": 500,
      "totalSpent": 1250.00,
      "visitCount": 15
    }
  ]
}
```

### POST /api/clients

Create new customer.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+15551234567",
  "franchiseId": "..."
}
```

### GET /api/clients/[id]

Get customer details with history.

### PUT /api/clients/[id]

Update customer.

### GET /api/loyalty/balance

Get customer loyalty balance.

### POST /api/loyalty/earn

Add loyalty points.

### POST /api/loyalty/redeem

Redeem loyalty points.

---

## Marketing APIs

Base path: `/api/marketing`

### GET /api/marketing/promote?productId=...

Get audience counts for promotion.

**Response:**
```json
{
  "all": 847,
  "vip": 169,
  "category": 156,
  "hasCategory": true,
  "creditsRemaining": 500
}
```

### POST /api/marketing/promote

Send product promotion via SMS.

**Request:**
```json
{
  "productId": "...",
  "productName": "Blanton's Bourbon",
  "audience": "all|vip|category",
  "customMessage": "Optional custom message"
}
```

**Response:**
```json
{
  "success": true,
  "sentCount": 156,
  "failedCount": 0,
  "wasLimited": false
}
```

**Rate Limit:** 3 promotions per hour per franchise

### POST /api/share/store

Send store link to customer.

**Request:**
```json
{
  "phone": "+15551234567",
  "customerName": "John"
}
```

---

## Reports APIs

Base path: `/api/reports`

### GET /api/reports/sales

Sales report with date range.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO date | Start of range |
| `endDate` | ISO date | End of range |
| `groupBy` | string | day/week/month |

### GET /api/reports/inventory

Inventory summary report.

### GET /api/reports/employees

Employee performance report.

### GET /api/reports/customers

Customer analytics report.

### GET /api/reports/dead-stock

Dead stock analysis (see Inventory APIs).

---

## Settings APIs

Base path: `/api/settings`

### GET /api/settings/franchise

Get franchise settings.

### PUT /api/settings/franchise

Update franchise settings.

**Request:**
```json
{
  "name": "Store Name",
  "address": "123 Main St",
  "phone": "+15551234567",
  "taxRate": 8.25,
  "tipEnabled": true,
  "tipPresets": [15, 18, 20],
  "cardSurchargeEnabled": false,
  "cardSurchargePercent": 3.5
}
```

### GET /api/settings/directory

Get Oro Plus directory settings.

### PUT /api/settings/directory

Update directory settings.

**Request:**
```json
{
  "showInDirectory": true,
  "publicName": "Joe's Liquor",
  "publicDescription": "Premium spirits...",
  "businessType": "LIQUOR_STORE",
  "latitude": 29.7604,
  "longitude": -95.3698
}
```

### GET /api/settings/terminals

Get PAX terminal configuration.

### PUT /api/settings/terminals

Update terminal settings.

---

## Public APIs

**No authentication required.** Rate limited.

### GET /api/public/stores

Get stores for Oro Plus app.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | User latitude |
| `lng` | number | User longitude |
| `radius` | number | Search radius (miles) |
| `type` | string | Business type filter |

**Response:**
```json
{
  "stores": [
    {
      "id": "...",
      "name": "Joe's Liquor",
      "address": "123 Main St",
      "distance": 2.5,
      "dealsCount": 3,
      "type": "LIQUOR_STORE"
    }
  ]
}
```

### GET /api/public/deals

Get active deals feed.

**Query Parameters:** Same as `/stores`

**Response:**
```json
{
  "deals": [
    {
      "id": "...",
      "name": "Weekend Special",
      "discountValue": 20,
      "discountType": "PERCENT",
      "store": { "name": "...", "distance": 2.5 },
      "products": [{ "name": "...", "salePrice": 15.99 }]
    }
  ]
}
```

### POST /api/public/booking/create

Create appointment booking.

**Rate Limit:** 5 per 5 minutes per IP

**Request:**
```json
{
  "locationId": "...",
  "serviceId": "...",
  "dateTime": "2024-12-30T14:00:00Z",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+15551234567",
  "notes": "Optional notes"
}
```

**Validation:**
- Email format validated
- Phone format validated (10-15 digits)
- All text sanitized
- FranchiseId verified from location

### POST /api/public/waiver

Sign digital waiver.

**Rate Limit:** 10 per minute per IP

**Request:**
```json
{
  "franchiseId": "...",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "signatureName": "John Doe"
}
```

---

## Error Responses

All APIs return consistent error format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE" // optional
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not logged in) |
| 403 | Forbidden (no permission) |
| 404 | Not Found |
| 409 | Conflict (e.g., time slot taken) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Rate Limiting

Rate limits are applied per IP address for public endpoints:

| Endpoint | Limit |
|----------|-------|
| `/api/public/booking/create` | 5 per 5 min |
| `/api/public/waiver` | 10 per min |
| `/api/marketing/promote` | 3 per hour |

When rate limited, response includes:

```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 120
}
```

Header: `Retry-After: 120`
