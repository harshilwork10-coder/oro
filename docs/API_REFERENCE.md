# Oronex API Reference

> Quick reference for all API endpoints

---

## Authentication APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth.js handlers |
| `/api/auth/set-password` | POST | Set password (magic link or logged in) |
| `/api/pos/verify-owner-pin` | POST | Verify PIN for kiosk exit |

---

## POS APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pos/transaction` | POST | Create new transaction |
| `/api/pos/product-lookup` | GET | Lookup product by barcode |
| `/api/pos/customer-lookup` | GET | Lookup customer by phone |
| `/api/pos/shift` | GET/POST | Get/open shift |
| `/api/pos/shift/close` | POST | Close shift with counts |
| `/api/pos/cash-drawer` | POST | Open cash drawer |

---

## Pulse APIs (Mobile Dashboard)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pulse/access` | GET | Check user has Pulse access |
| `/api/pulse/live` | GET | Real-time sales data |
| `/api/pulse/inventory` | GET/POST/PUT | Inventory management |
| `/api/pulse/low-stock` | GET | Low stock alerts by location |
| `/api/pulse/location-access` | GET/PUT | Manage user location access |

---

## Owner APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/owner/reports` | GET | Generate reports |
| `/api/owner/loyalty` | GET/POST/PUT | Loyalty program |
| `/api/owner/transfers` | GET/POST/PUT | Inter-store transfers |
| `/api/owner/notifications` | GET/POST | Customer notifications |

---

## Admin APIs (Provider)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/franchisors` | GET/POST | Manage franchisors |
| `/api/admin/franchisors/[id]/magic-link` | POST | Generate magic link |
| `/api/admin/reset-owner-password` | POST | Reset owner password |
| `/api/admin/licenses` | GET/POST | License management |

---

## Inventory APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET/POST/PUT/DELETE | Product CRUD |
| `/api/categories` | GET/POST/PUT/DELETE | Category CRUD |
| `/api/inventory/import` | POST | Bulk CSV import |

---

## Employee APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/franchise/employees` | GET/POST | Employee management |
| `/api/schedule` | GET/POST/DELETE | Employee scheduling |
| `/api/pos/shift` | GET/POST | Shift management |

---

## Webhook APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/events` | POST | Internal event notifications |

---

## Public APIs (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/booking/create` | POST | Customer booking (rate limited) |
| `/api/public/booking/availability` | GET | Available time slots |
