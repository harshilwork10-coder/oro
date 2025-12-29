# Oro POS System - Full Technical Documentation

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Modules](#core-modules)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Environment Configuration](#environment-configuration)
8. [Deployment Guide](#deployment-guide)

---

## System Overview

**Oro** is a comprehensive multi-tenant Point of Sale (POS) system designed for franchise businesses. It supports liquor stores, vape shops, salons, restaurants, and retail operations.

### Key Features

| Category | Features |
|----------|----------|
| **POS** | Product catalog, cart, payments (cash, card, split), tips, receipts |
| **Payments** | PAX terminal integration, offline mode, card surcharge |
| **Inventory** | Stock tracking, low stock alerts, dead stock reports, deal creation |
| **Loyalty** | Points system, customer profiles, membership tiers |
| **Marketing** | SMS campaigns, product promotions, Oro Plus customer app |
| **Appointments** | Booking, calendar, employee scheduling, waivers |
| **Reports** | Sales, inventory, employee, customer analytics |
| **Multi-Location** | Franchise hierarchy, location-specific settings |

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 18, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (serverless) |
| **Database** | SQLite (dev) / PostgreSQL (prod) via Prisma ORM |
| **Authentication** | NextAuth.js with JWT sessions |
| **SMS** | Twilio API |
| **Payments** | PAX Terminal (TCP/IP) |
| **Storage** | AWS S3 (file uploads) |

---

## Architecture

### Multi-Tenant Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                       PROVIDER (Oro)                            │
│                    Platform Administrator                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────────┐    ┌───────────────┐    ┌───────────────┐  │
│   │  FRANCHISOR   │    │  FRANCHISOR   │    │  FRANCHISOR   │  │
│   │  (Brand ABC)  │    │  (Brand XYZ)  │    │  (Brand 123)  │  │
│   └───────┬───────┘    └───────┬───────┘    └───────────────┘  │
│           │                    │                                │
│   ┌───────┴───────┐    ┌──────┴───────┐                        │
│   │   FRANCHISE   │    │  FRANCHISE   │  (Store Owners)        │
│   │   (Store 1)   │    │  (Store 2)   │                        │
│   └───────┬───────┘    └──────────────┘                        │
│           │                                                     │
│   ┌───────┴───────┐                                            │
│   │   LOCATION    │    (Physical Location)                     │
│   │  + Employees  │                                            │
│   │  + Products   │                                            │
│   │  + POS        │                                            │
│   └───────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Application Structure

```
src/
├── app/
│   ├── api/                 # 81 API modules (137 routes)
│   ├── dashboard/           # Owner/Employee dashboard
│   ├── provider/            # Platform admin portal
│   ├── franchisor/          # Franchisor management
│   ├── owner/               # Franchise owner portal
│   ├── employee/            # Employee portal
│   ├── kiosk/               # Self-service kiosk mode
│   ├── customer-display/    # Customer-facing screen
│   ├── app/                 # Oro Plus customer PWA
│   └── auth/                # Login/authentication pages
├── lib/
│   ├── prisma.ts            # Database client
│   ├── auth.ts              # NextAuth configuration
│   ├── sms.ts               # Twilio SMS service
│   ├── rateLimit.ts         # Rate limiting utility
│   └── pax.ts               # PAX terminal client
└── components/              # Shared UI components
```

---

## User Roles & Permissions

### Role Hierarchy

| Role | Level | Access |
|------|-------|--------|
| **PROVIDER** | 1 | Full platform access, manage all franchisors |
| **ADMIN** | 1 | Provider admin staff |
| **FRANCHISOR** | 2 | Manage own franchises/locations |
| **OWNER** | 3 | Franchise owner, full store access |
| **MANAGER** | 4 | Store manager, limited settings |
| **SHIFT_SUPERVISOR** | 5 | Supervise shifts, approve voids |
| **EMPLOYEE** | 6 | POS access, basic operations |

### Permission Categories

| Category | Permissions |
|----------|-------------|
| **POS** | `USE_POS`, `PROCESS_REFUNDS`, `APPLY_DISCOUNTS`, `VOID_TRANSACTIONS` |
| **INVENTORY** | `VIEW_INVENTORY`, `EDIT_INVENTORY`, `RECEIVE_STOCK`, `ADJUST_STOCK` |
| **EMPLOYEES** | `VIEW_EMPLOYEES`, `ADD_EMPLOYEES`, `EDIT_EMPLOYEES`, `MANAGE_SCHEDULES` |
| **REPORTS** | `VIEW_REPORTS`, `EXPORT_REPORTS`, `VIEW_FINANCIALS` |
| **SETTINGS** | `EDIT_SETTINGS`, `MANAGE_TERMINALS`, `MANAGE_INTEGRATIONS` |

---

## Core Modules

### 1. Point of Sale (POS)

**Location:** `/dashboard/pos`  
**APIs:** `/api/pos/*`

| Feature | Description |
|---------|-------------|
| Product Menu | Categorized products with search, barcode scan |
| Cart | Add/remove items, quantity, discounts, promotions |
| Payments | Cash, card (PAX), split payments, tips |
| Receipts | Print, SMS, email options |
| Customer Display | Secondary screen for customer-facing cart |
| Offline Mode | Queue transactions when offline, sync on reconnect |

### 2. Inventory Management

**Location:** `/dashboard/inventory`  
**APIs:** `/api/inventory/*`

| Feature | Description |
|---------|-------------|
| Products | CRUD operations, categories, variants |
| Stock Tracking | Current stock, low stock alerts |
| Purchase Orders | Create, receive, adjust stock |
| Dead Stock Report | Identify unsold products, create instant deals |
| UPC Import | Bulk import products via UPC database |

### 3. Customer / Loyalty

**Location:** `/dashboard/clients`  
**APIs:** `/api/clients/*`, `/api/loyalty/*`

| Feature | Description |
|---------|-------------|
| Customer Profiles | Name, email, phone, purchase history |
| Loyalty Points | Earn/redeem points, tier levels |
| Memberships | Recurring memberships with benefits |
| Waivers | Digital liability waivers |

### 4. Marketing

**Location:** `/dashboard/marketing/promote`  
**APIs:** `/api/marketing/*`, `/api/share/*`

| Feature | Description |
|---------|-------------|
| Product Promotion | Select product → notify customers via SMS |
| Audience Targeting | All customers, VIP (top 20%), category buyers |
| Share My Store | Send store link to loyalty customers |
| Oro Plus App | Customer-facing PWA for deal discovery |

### 5. Appointments (Service Businesses)

**Location:** `/dashboard/appointments`  
**APIs:** `/api/appointments/*`

| Feature | Description |
|---------|-------------|
| Booking | Online booking, staff selection |
| Calendar | Day/week view, drag-and-drop |
| Services | Duration, pricing, categories |
| Resources | Rooms, chairs, equipment booking |
| Reminders | SMS appointment reminders |

### 6. Employee Management

**Location:** `/dashboard/employees`  
**APIs:** `/api/employees/*`, `/api/franchise/employees/*`

| Feature | Description |
|---------|-------------|
| Employee Profiles | Name, contact, role, permissions |
| Time Tracking | Shifts, clock in/out |
| Schedules | Weekly schedule management |
| Commissions | Commission tracking for sales |
| PIN Access | Quick PIN login for POS |

### 7. Reports & Analytics

**Location:** `/dashboard/reports`  
**APIs:** `/api/reports/*`

| Category | Reports |
|----------|---------|
| **Sales** | Daily, weekly, monthly sales, trends |
| **Inventory** | Stock levels, dead stock, movement |
| **Employee** | Performance, hours, commissions |
| **Customer** | Top customers, retention, segments |
| **Advanced** | Benchmarking, forecasting |

### 8. Settings

**Location:** `/dashboard/settings`  
**APIs:** `/api/settings/*`

| Setting | Description |
|---------|-------------|
| Store Info | Name, address, hours, branding |
| Tax | Tax rates, TaxJar integration |
| Terminals | PAX terminal configuration |
| Printers | Receipt printer setup |
| Directory | Oro Plus opt-in, public profile |

---

## API Reference

### Authentication

All APIs (except `/api/public/*`) require authentication via NextAuth session.

```typescript
// Pattern used in all protected APIs
const session = await getServerSession(authOptions)
if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Public APIs (No Auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/stores` | GET | List stores for Oro Plus app |
| `/api/public/deals` | GET | Active deals feed |
| `/api/public/booking/availability` | GET | Available appointment slots |
| `/api/public/booking/create` | POST | Create booking (rate limited) |
| `/api/public/waiver` | GET/POST | Get/sign digital waiver |

### Core APIs

| Module | Endpoints | Description |
|--------|-----------|-------------|
| `/api/pos/*` | 28 | POS operations, transactions, shifts |
| `/api/products` | 1 | Product CRUD |
| `/api/inventory/*` | 20 | Stock management |
| `/api/clients/*` | 4 | Customer management |
| `/api/appointments/*` | 5 | Booking management |
| `/api/employees/*` | 6 | Employee management |
| `/api/reports/*` | 14 | Report generation |
| `/api/settings/*` | 9 | Store settings |
| `/api/admin/*` | 49 | Provider admin operations |
| `/api/franchise/*` | 19 | Franchise operations |
| `/api/promotions/*` | 3 | Deal/promotion management |

### Rate Limiting

Public endpoints use the rate limiting utility:

```typescript
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rateLimit'

const rateLimit = checkRateLimit(getRateLimitKey(request), RATE_LIMITS.booking)
if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

---

## Database Schema

### Core Models (4035 lines)

| Model | Description | Key Fields |
|-------|-------------|------------|
| `Provider` | Platform root | id, name |
| `Franchisor` | Brand/chain owner | id, name, providerId |
| `Franchise` | Individual store | id, name, franchisorId, settings |
| `Location` | Physical location | id, address, latitude, longitude |
| `User` | All users | id, email, role, franchiseId |
| `Product` | Product catalog | id, name, price, sku, stock, categoryId |
| `Transaction` | Sales transactions | id, total, paymentMethod, items |
| `TransactionLineItem` | Transaction items | id, transactionId, productId, quantity |
| `Client` | Customers | id, firstName, lastName, email, phone, points |
| `Appointment` | Bookings | id, clientId, serviceId, startTime |
| `Service` | Service catalog | id, name, duration, price |
| `Promotion` | Deals/discounts | id, name, discountType, discountValue |

### Relationships

```
Provider (1) ──→ (N) Franchisor ──→ (N) Franchise ──→ (N) Location
                                          │
                                          ├──→ (N) User (employees)
                                          ├──→ (N) Product
                                          ├──→ (N) Transaction
                                          ├──→ (N) Client
                                          └──→ (N) Appointment
```

---

## Environment Configuration

### Required Variables

```env
# Database
DATABASE_URL="file:./dev.db"           # SQLite (dev)
# DATABASE_URL="postgresql://..."      # PostgreSQL (prod)

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Twilio SMS
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."

# AWS S3 (file uploads)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_BUCKET_NAME="..."
AWS_REGION="us-east-1"

# App URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### Optional Variables

```env
# Tax
TAXJAR_API_KEY="..."

# Feature Flags
ENABLE_OFFLINE_MODE="true"
ENABLE_KIOSK_MODE="true"
```

---

## Deployment Guide

### Local Development

```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Seed test data
curl http://localhost:3000/api/test/seed

# Run dev server
npm run dev
```

### Production Deployment

1. **Database**: Set up PostgreSQL and update `DATABASE_URL`
2. **Environment**: Configure all required env variables
3. **Build**: `npm run build`
4. **Deploy**: Deploy to Vercel, AWS, or your platform
5. **Migrate**: `npx prisma migrate deploy`

### Security Checklist

- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Use HTTPS in production
- [ ] Configure proper CORS headers
- [ ] Remove `/api/test/seed` access in production (auto-blocked)
- [ ] Set up rate limiting on public endpoints ✅
- [ ] Enable input validation ✅

---

## Support

For technical support: Contact your system administrator

**Documentation Version:** 1.0  
**Last Updated:** December 2024
