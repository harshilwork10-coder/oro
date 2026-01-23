# ORO 9 POS System - Complete Technical Documentation

**Version:** 2.0  
**Last Updated:** January 2026  
**Platform:** ORO 9 Multi-Tenant Point of Sale

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Core POS Operations](#4-core-pos-operations)
5. [Payment Processing](#5-payment-processing)
6. [Inventory Management](#6-inventory-management)
7. [Customer & Loyalty](#7-customer--loyalty)
8. [Employee Management](#8-employee-management)
9. [Reporting & Analytics](#9-reporting--analytics)
10. [Marketing & Promotions](#10-marketing--promotions)
11. [Appointments & Services](#11-appointments--services)
12. [Merchant Onboarding](#12-merchant-onboarding)
13. [Security & Authentication](#13-security--authentication)
14. [Technical Infrastructure](#14-technical-infrastructure)
15. [API Reference Summary](#15-api-reference-summary)
16. [Deployment & Operations](#16-deployment--operations)

---

## 1. Executive Summary

**ORO 9** is an enterprise-grade, multi-tenant Point of Sale (POS) platform designed for franchise businesses across multiple verticals including liquor stores, vape shops, salons/barbershops, restaurants, and retail operations.

### Key Differentiators

| Feature | Description |
|---------|-------------|
| **Multi-Tenant Architecture** | Provider → Franchisor → Franchise → Location hierarchy |
| **Dual Pricing Support** | Transparent Cash vs Card pricing with real-time calculations |
| **Offline Mode** | Full POS operations during network outages with auto-sync |
| **PAX Terminal Integration** | Direct TCP/IP communication via secure API proxy |
| **Fair Discount Engine** | Non-stacking, best-offer-first loyalty system |
| **Multi-Business Accounts** | Single login manages multiple legal entities (LLCs) |

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 18, TypeScript, Tailwind CSS |
| **Backend** | Next.js API Routes (serverless) |
| **Database** | SQLite (dev) / PostgreSQL (prod) via Prisma ORM |
| **Authentication** | NextAuth.js with JWT sessions, MFA support |
| **SMS/Email** | Twilio, Resend |
| **Payments** | PAX Terminal (TCP/IP), Offline queuing |
| **Storage** | AWS S3 (file uploads) |
| **Printing** | ORO Print Agent (local ESC/POS) |

---

## 2. System Architecture

### 2.1 Multi-Tenant Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROVIDER (ORO 9 Platform)                          │
│                        Platform Administrator Level                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│   │   FRANCHISOR    │    │   FRANCHISOR    │    │   FRANCHISOR    │        │
│   │   (Brand ABC)   │    │   (Brand XYZ)   │    │   (Owner LLC)   │        │
│   │   Multi-Store   │    │   Single Store  │    │   Multi-Loc     │        │
│   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘        │
│            │                      │                      │                  │
│   ┌────────┴────────┐    ┌────────┴────────┐    ┌───────┴────────┐         │
│   │    FRANCHISE    │    │    FRANCHISE    │    │   FRANCHISE    │         │
│   │   (Store Hub)   │    │   (Main Store)  │    │   (Group 1)    │         │
│   └────────┬────────┘    └─────────────────┘    └───────┬────────┘         │
│            │                                             │                  │
│   ┌────────┴────────┐                           ┌───────┴────────┐         │
│   │    LOCATION     │                           │    LOCATION    │         │
│   │  + Employees    │                           │  + Products    │         │
│   │  + Terminals    │                           │  + Drawer      │         │
│   │  + Inventory    │                           │  + Customers   │         │
│   └─────────────────┘                           └────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Application Structure

```
src/
├── app/
│   ├── api/                 # 88+ API modules (200+ routes)
│   ├── dashboard/           # Employee POS terminal interface
│   ├── provider/            # Platform admin portal
│   ├── franchisor/          # Brand/chain management
│   ├── owner/               # Franchise owner dashboard
│   ├── employee/            # Staff portal
│   ├── kiosk/               # Self-service mode
│   ├── customer-display/    # Customer-facing screen
│   ├── app/                 # Oro Plus customer PWA
│   └── auth/                # Authentication pages
├── lib/
│   ├── prisma.ts            # Database client
│   ├── auth.ts              # NextAuth configuration
│   ├── sms.ts               # Twilio SMS service
│   ├── rateLimit.ts         # Rate limiting utility
│   ├── dualPricing.ts       # Cash/Card price calculations
│   ├── pax-terminal.ts      # PAX terminal protocol
│   ├── offline-db.ts        # IndexedDB wrapper
│   ├── offline-sync.ts      # Sync service
│   └── print-agent.ts       # Receipt printing client
├── components/              # Shared UI components
└── hooks/                   # Custom React hooks
```

### 2.3 Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │ ──▶ │   Next.js   │ ──▶ │  Prisma     │ ──▶ │ PostgreSQL  │
│  (Browser)  │     │   Router    │     │    ORM      │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │           ┌─────────────┐     ┌─────────────┐
       │           │  API Route  │ ──▶ │  External   │
       │           │  (Handler)  │     │  Services   │
       │           └─────────────┘     │ (Twilio,S3) │
       │                               └─────────────┘
       ▼
┌─────────────┐     ┌─────────────┐
│  IndexedDB  │ ◀── │  Offline    │
│  (Local)    │     │   Sync      │
└─────────────┘     └─────────────┘
```

---

## 3. User Roles & Permissions

### 3.1 Role Hierarchy

| Role | Level | Description | Access Scope |
|------|-------|-------------|--------------|
| **PROVIDER** | 1 | ORO 9 platform administrators | Full platform |
| **ADMIN** | 1 | Provider staff | Full platform |
| **FRANCHISOR** | 2 | Brand/chain owner | Own franchises |
| **OWNER** | 3 | Single franchise owner | Own store(s) |
| **MANAGER** | 4 | Store manager | Limited settings |
| **SHIFT_SUPERVISOR** | 5 | Shift supervisors | Approve voids |
| **EMPLOYEE** | 6 | POS operators | Basic operations |

### 3.2 Permission Categories

| Category | Permissions |
|----------|-------------|
| **POS Operations** | `USE_POS`, `PROCESS_REFUNDS`, `APPLY_DISCOUNTS`, `VOID_TRANSACTIONS` |
| **Inventory** | `VIEW_INVENTORY`, `EDIT_INVENTORY`, `RECEIVE_STOCK`, `ADJUST_STOCK` |
| **Staff** | `VIEW_EMPLOYEES`, `ADD_EMPLOYEES`, `EDIT_EMPLOYEES`, `MANAGE_SCHEDULES` |
| **Reports** | `VIEW_REPORTS`, `EXPORT_REPORTS`, `VIEW_FINANCIALS` |
| **Settings** | `EDIT_SETTINGS`, `MANAGE_TERMINALS`, `MANAGE_INTEGRATIONS` |

### 3.3 Scoped Role Assignment (RBAC)

The `UserRoleAssignment` model enables multi-tenant access:

- **Provider-wide**: Platform management for administrators
- **Franchisor-scoped**: Access to client's entire business hierarchy
- **Franchise-scoped**: Access to specific franchise location group
- **Location-scoped**: Access to single storefront

### 3.4 Multi-Business Support

**FranchisorMembership** enables single login across multiple legal entities:

```
User (Identity) ──┬──▶ LLC A (Hair Salon Chain)
                  ├──▶ LLC B (Barbershop)
                  └──▶ LLC C (Spa)
```

Features:
- **Business Switcher**: Dropdown in dashboard header
- **Context Persistence**: Active business tracked via React Context
- **Data Isolation**: API queries filter by `activeFranchisorId`

---

## 4. Core POS Operations

### 4.1 POS Terminal Interface

**Location:** `/dashboard/pos`  
**Verticals:** Salon, Retail, Restaurant

| Feature | Description |
|---------|-------------|
| **Product Menu** | Categorized products/services with search, barcode scan |
| **Cart Management** | Add/remove items, quantity adjustment, modifiers |
| **Quick Items** | "Open Item" services for manual price entry |
| **Customer Selection** | Link transaction to loyalty customer |
| **Split Payments** | Multiple payment methods per transaction |
| **Tips** | Configurable presets (15%, 18%, 20%) |

### 4.2 Customer-Facing Display

**Location:** `/customer-display`

- **500ms Polling**: Real-time cart synchronization with POS terminal
- **Dual Pricing Display**: Side-by-side Cash vs Card totals
- **Tip Selection**: Customer taps preferred tip amount
- **Color Coding**: Green (Cash), Blue (Card) for visual clarity

### 4.3 Shift & Drawer Management

| Feature | Description |
|---------|-------------|
| **Open Shift** | Declare opening cash amount |
| **Cash Drops** | Mid-shift safe deposits |
| **Close Shift** | Count drawer, calculate variance |
| **No Sale** | Open drawer without transaction |

### 4.4 Transaction Types

- **COMPLETED**: Standard successful sale
- **VOIDED**: Cancelled before finalization
- **REFUNDED**: Full or partial return
- **PENDING**: Offline-queued transactions

---

## 5. Payment Processing

### 5.1 Payment Methods

| Method | Description |
|--------|-------------|
| **CASH** | Physical currency, change calculation |
| **CREDIT_CARD** | Via PAX terminal |
| **DEBIT_CARD** | Via PAX terminal (surcharge exempt) |
| **SPLIT** | Multiple methods per transaction |
| **GIFT_CARD** | Alphanumeric code, balance lookup |
| **MEMBERSHIP** | Apply bundled service credits |

### 5.2 PAX Terminal Integration

**Architecture:** API Proxy Pattern (TCP/IP over HTTP)

```
┌────────────┐     ┌─────────────┐     ┌─────────────┐
│    POS     │ ──▶ │  API Proxy  │ ──▶ │    PAX      │
│  Frontend  │     │  /api/pax   │     │  Terminal   │
│  (Base64)  │     │  (TCP/IP)   │     │  (Binary)   │
└────────────┘     └─────────────┘     └─────────────┘
```

**Security Measures:**
- Session authentication required
- Private IP restriction (10.x, 172.16.x, 192.168.x, 127.x only)
- 120-second connection timeout
- Binary protocol with STX/FS/ETX framing

### 5.3 Dual Pricing Model

**Processing Plans:**
- **STANDARD**: No additional fees
- **SURCHARGE**: Credit card fee only (not debit)
- **DUAL_PRICE**: Separate Cash/Card prices displayed

**Model 1 Specification:**
- Tax calculated on final charged price
- Per-item rounding to 2 decimals
- Item-based source of truth

**UI Implementation:**
- Columnar Cash/Card display in cart summary
- Per-line item dual prices
- Color-coded totals (Emerald/Green for Cash, Stone/Blue for Card)

### 5.4 Offline Mode

**Architecture:** Local-First with IndexedDB

| Object Store | Purpose |
|--------------|---------|
| `products` | Local catalog cache |
| `pendingTransactions` | Offline sales queue |
| `settings` | Cached tax/pricing configuration |
| `syncLog` | Audit trail of sync attempts |
| `priceSnapshots` | Conflict detection data |

**Sync Triggers:**
- Automatic: Every 30 seconds (if online)
- Event-driven: On `window.online` event
- Visibility-driven: When tab becomes active

**Card Payment Handling:**
- Queued as `card_pending` status
- Customer digital waiver/signature captured
- Manual processing required when online

---

## 6. Inventory Management

### 6.1 Product Management

| Feature | Description |
|---------|-------------|
| **Product Catalog** | Name, SKU, barcode, price, cost |
| **Categories** | Hierarchical organization with colors/icons |
| **Stock Tracking** | Current levels, low stock thresholds |
| **Variants** | Size, color, flavor options |
| **Tax Configuration** | Taxable flag, override rules |

### 6.2 Stock Operations

- **Adjust Stock**: Manual corrections with reason codes
- **Receive Inventory**: Purchase order receiving
- **Transfer Stock**: Inter-location transfers
- **Count Inventory**: Physical inventory reconciliation

### 6.3 AI SKU Database

**Multi-Source Lookup Engine:**
1. ORO DB (internal catalog)
2. External APIs (UPC databases)

Features:
- Category sanitization heuristics
- Automated pricing suggestions
- Barcode deduplication

### 6.4 Alerts & Reports

| Report | Description |
|--------|-------------|
| **Low Stock** | Items below threshold by location |
| **Dead Stock** | Products unsold for 90+ days |
| **Stock Movement** | Sales velocity analysis |
| **Instant Deals** | Create promotions from dead stock |

---

## 7. Customer & Loyalty

### 7.1 Customer Profiles

| Field | Description |
|-------|-------------|
| **Contact** | Name, email, phone |
| **Loyalty** | Points balance, tier level |
| **History** | Purchase history, visit count, total spent |
| **Waivers** | Digital liability signatures |

### 7.2 Fair Discount System

**Core Philosophy:** Best offer wins, no stacking

| Feature | Description |
|---------|-------------|
| **Best Offer Mode** | Automatically applies highest value discount |
| **Credit Banking** | Unused offers saved for future visits |
| **Expiry Logic** | Configurable 90-day default |
| **Safety Cap** | Maximum 30% discount to protect margins |
| **Always-On Benefits** | Points and VIP perks always apply |

### 7.3 VIP Tier Program

| Tier | Benefits |
|------|----------|
| **Bronze** | 1x points |
| **Silver** | 1.5x points, priority booking |
| **Gold** | 2x points, 10% off services, monthly add-on |
| **Platinum** | 3x points, free premium service, VIP pricing |

### 7.4 Engagement Programs

- **Streak Bonuses**: Multi-month visit rewards
- **Birthday Rewards**: Credits, discounts, or free services
- **Referral Program**: Double-sided rewards
- **Win-Back**: Tiered discounts for lapsed customers (30/60/90 days)
- **Pre-booking Incentive**: 10% off next appointment

### 7.5 Gift Cards & Memberships

| Feature | Description |
|---------|-------------|
| **Gift Cards** | Alphanumeric codes, real-time balance |
| **Memberships** | Recurring monthly plans with bundled services |

---

## 8. Employee Management

### 8.1 Employee Lifecycle

| Stage | Actions |
|-------|---------|
| **Onboarding** | Profile creation, password setup, PIN assignment |
| **Active** | Shift work, POS access, commission tracking |
| **Schedule** | Weekly scheduling, availability management |
| **Offboarding** | Access revocation, final pay calculation |

### 8.2 Worker Types

| Type | Description |
|------|-------------|
| **W2_EMPLOYEE** | Standard staff, hourly/salary + commission |
| **BOOTH_RENTER** | Independent professional, pays chair rent |

### 8.3 Compensation Models

- **Commission Split**: Percentage of service revenue
- **Hourly/Salary**: Fixed pay rates
- **Chair Rental**: Fixed rent paid to salon
- **Custom Pricing**: Booth renters set own service prices

### 8.4 Permission Bits

```
canAddServices      canAddProducts       canManageInventory
canViewReports      canProcessRefunds    canManageSchedule
canManageEmployees
```

### 8.5 Phone-PIN Login

- 4-digit PIN for fast POS switching
- 5 failed attempts → 15-minute lockout
- bcrypt-hashed storage
- Graceful warning on final attempt

---

## 9. Reporting & Analytics

### 9.1 Report Categories

| Category | Reports |
|----------|---------|
| **Sales** | Daily/Weekly/Monthly, trends, payment breakdown |
| **Inventory** | Stock levels, dead stock, movement |
| **Employee** | Performance, hours, commissions |
| **Customer** | Top customers, retention, segments |
| **Financial** | P&L, tax summary, tips |

### 9.2 Oro Pulse Dashboard

Premium analytics module accessible to Franchisors:
- Real-time sales monitoring
- Cross-location comparisons
- Automated intervention alerts
- Predictive forecasting

### 9.3 Automated Interventions

**Scheduler Logic:** Monitors key metrics and triggers owner notifications

| Trigger | Action |
|---------|--------|
| Sales drop >20% | Email alert |
| Inventory low | Restock notification |
| Staff attendance | Absence alert |
| Cash variance | Audit notification |

---

## 10. Marketing & Promotions

### 10.1 Product Promotions

**Endpoint:** `POST /api/marketing/promote`

| Audience | Description |
|----------|-------------|
| **All** | All opted-in customers |
| **VIP** | Top 20% spenders |
| **Category** | Previous buyers of category |

**Rate Limit:** 3 promotions per hour per franchise

### 10.2 Deal Management

| Type | Description |
|------|-------------|
| **PERCENT_OFF** | Percentage discount |
| **FIXED_AMOUNT** | Dollar off |
| **BOGO** | Buy one get one |

### 10.3 Oro Plus App

Customer-facing PWA for deal discovery:
- Store directory by location
- Active deals feed
- Online booking
- Digital loyalty wallet

### 10.4 Manufacturer Rebates

- PDF deal sheet ingestion
- Rebate report generation
- Compliance auditing

---

## 11. Appointments & Services

### 11.1 Service Catalog

| Field | Description |
|-------|-------------|
| **Name** | Service title |
| **Duration** | Minutes |
| **Price** | Standard price |
| **Category** | Service grouping |
| **Resources** | Required rooms/chairs/equipment |

### 11.2 Online Booking

**Public Endpoint:** `POST /api/public/booking/create`

- Available slot calculation
- Staff selection
- Customer information validation
- SMS confirmation

**Rate Limit:** 5 per 5 minutes per IP

### 11.3 Calendar Features

- Day/Week view
- Drag-and-drop rescheduling
- Employee filtering
- Resource blocking

### 11.4 Digital Waivers

**Public Endpoint:** `POST /api/public/waiver`

- Customer signature capture
- Version tracking
- IP address logging
- Consent recording

---

## 12. Merchant Onboarding

### 12.1 Flow Overview

```
1. Magic Link Email → 2. Token Verification → 3. Password Setup
                                                      ↓
4. Terms Acceptance → 5. Business Profile → 6. Document Upload
                                                      ↓
7. Admin Review → 8. Approval → 9. Auto-Provisioning
```

### 12.2 Collected Data

| Category | Fields |
|----------|--------|
| **Identification** | Business Name, Address, Phone, Type |
| **Financial** | SSN, FEIN, Routing #, Account # |
| **Legal** | SS4, EBT status, Driver's License, Voided Check |
| **Branding** | Primary color |

### 12.3 Document Uploads

- PDF, JPG, PNG up to 10MB
- AWS S3 storage: `onboarding/{userId}/`
- Dual auth support (session + magic link)

### 12.4 Auto-Provisioning

Upon approval:
- `Franchise` record created for MULTI_LOCATION_OWNER
- Initial `Location` created
- Owner access granted automatically

### 12.5 Franchisee Invitations

- 8-character temporary password generated
- bcrypt hashed
- Optional auto-location creation
- Invitation email via Resend

---

## 13. Security & Authentication

### 13.1 Authentication Flow

```
1. Login Form → 2. NextAuth API → 3. Credentials Provider
                                        ↓
4. Bcrypt Verify ← 5. Prisma Query ← 6. Database
     ↓
7. JWT Created → 8. Session Stored → 9. MFA Check (if enabled)
                                             ↓
10. TOTP/Backup Verify → 11. Dashboard Redirect
```

### 13.2 Security Headers

| Header | Value |
|--------|-------|
| **CSP** | Restricted script/style sources, allows localhost:9100 |
| **Cache-Control** | `no-store, no-cache, must-revalidate` |
| **X-Frame-Options** | `DENY` |
| **HSTS** | Enabled |
| **X-Content-Type-Options** | `nosniff` |

### 13.3 Multi-Factor Authentication

**TOTP Setup:**
1. Generate secret → QR code
2. 10 backup codes (encrypted)
3. Verify initial token
4. MFA enabled

**Verification:**
- 6-digit TOTP or backup code
- Backup codes consumed on use
- Rate-limited attempts

### 13.4 Approval Status

| Status | Access |
|--------|--------|
| **PENDING** | `/auth/pending-approval` only |
| **REJECTED** | `/auth/pending-approval` only |
| **APPROVED** | Full dashboard access |

PROVIDER, ADMIN, EMPLOYEE, MANAGER bypass approval checks.

### 13.5 IDOR Protection

- Manual ownership verification in sensitive routes
- `[SECURITY] IDOR attempt` logged for violations
- Session-scoped resource access

---

## 14. Technical Infrastructure

### 14.1 Thermal Receipt System

**ORO Print Agent:**
- Local Node.js server at `http://localhost:9100`
- USB printer interface (ESC/POS)
- Local logo storage for offline reliability
- Cash drawer trigger support

**Print Flow:**
```
Checkout → POST /api/pos/transaction → Success Response
                                            ↓
                              Call printReceipt(data)
                                            ↓
                              Print Agent Available?
                             ↙                    ↘
                          YES                      NO
                           ↓                        ↓
                     POST /print              Browser Fallback
                           ↓
                    Physical Receipt
```

### 14.2 Digital Receipts

| Type | Provider |
|------|----------|
| **SMS** | Twilio |
| **Email** | Resend |

**Anti-spam:** Rate limiting per transaction/customer

### 14.3 Database Models

**Core Models (70+, 4000+ lines):**

| Model | Purpose |
|-------|---------|
| `Provider` | Platform root |
| `Franchisor` | Brand/chain owner |
| `Franchise` | Store entity |
| `Location` | Physical shop |
| `User` | All users/employees |
| `Product` | Product catalog |
| `Service` | Service catalog |
| `Transaction` | Sales records |
| `TransactionLineItem` | Line items |
| `Client` | Customer profiles |
| `Appointment` | Bookings |
| `Promotion` | Deals/discounts |
| `DrawerSession` | Shift tracking |
| `FranchiseSettings` | Store configuration |

### 14.4 Key Indexes

```prisma
@@index([franchiseId])   // Most models
@@index([locationId])
@@index([createdAt])     // Transactions
@@index([email])         // Users, Clients
@@index([barcode])       // Products
```

---

## 15. API Reference Summary

### 15.1 Authentication

All APIs (except `/api/public/*`) require session authentication via NextAuth.

```typescript
const session = await getServerSession(authOptions)
if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 15.2 Public APIs (No Auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/public/stores` | GET | Store directory |
| `/api/public/deals` | GET | Active deals feed |
| `/api/public/booking/availability` | GET | Available slots |
| `/api/public/booking/create` | POST | Create booking |
| `/api/public/waiver` | GET/POST | Digital waivers |

### 15.3 Core API Modules

| Module | Routes | Description |
|--------|--------|-------------|
| `/api/pos/*` | 28+ | POS operations, transactions, shifts |
| `/api/products` | CRUD | Product management |
| `/api/inventory/*` | 20+ | Stock operations |
| `/api/clients/*` | CRUD | Customer management |
| `/api/appointments/*` | 5+ | Booking management |
| `/api/employees/*` | 6+ | Staff management |
| `/api/reports/*` | 14+ | Report generation |
| `/api/settings/*` | 9+ | Store settings |
| `/api/admin/*` | 49+ | Provider operations |
| `/api/franchise/*` | 19+ | Franchise operations |
| `/api/pax/*` | 3 | Terminal proxy |
| `/api/marketing/*` | 3 | Promotions |

### 15.4 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/public/booking/create` | 5 per 5 min |
| `/api/public/waiver` | 10 per min |
| `/api/marketing/promote` | 3 per hour |
| MFA verification | Strict rate bucket |

### 15.5 Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Rate Limited |
| 500 | Server Error |

---

## 16. Deployment & Operations

### 16.1 Environment Variables

**Required:**
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret-key"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_BUCKET_NAME="..."
```

**Optional:**
```env
TAXJAR_API_KEY="..."
ENABLE_OFFLINE_MODE="true"
ENABLE_KIOSK_MODE="true"
RESEND_API_KEY="..."
```

### 16.2 Development Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed test data
curl http://localhost:3000/api/test/seed

# Run dev server
npm run dev
```

**Seed Credentials:**
- Provider: `admin@oro9.com` / `password123`

### 16.3 Production Deployment

1. Set up PostgreSQL database
2. Configure all environment variables
3. `npm run build`
4. `npx prisma migrate deploy`
5. Deploy to Vercel/AWS/Docker

### 16.4 Print Agent Installation

```bash
cd print-agent
npm install
npm run build
# Install as Windows service
```

### 16.5 Security Checklist

- [x] Strong `NEXTAUTH_SECRET`
- [x] HTTPS in production
- [x] Rate limiting on public endpoints
- [x] Input validation
- [x] Proper CORS headers
- [x] MFA available for all users
- [x] Session-based API protection
- [x] IDOR verification in sensitive routes

### 16.6 Backup Procedures

**Automated Daily Backup:**
```powershell
.\scripts\backup-database.ps1
```

**Manual Cloud-to-Local:**
```bash
pg_dump -Fc $DATABASE_URL > backup.dump
pg_restore -d local_db backup.dump
```

---

## Appendix A: Business Types

| Type | Features |
|------|----------|
| **LIQUOR_STORE** | Products, inventory, lottery |
| **VAPE_SHOP** | Products, age verification |
| **SALON** | Services, appointments, employees |
| **BARBERSHOP** | Services, walk-ins, commissions |
| **RESTAURANT** | Menu, modifiers, kitchen display |
| **RETAIL** | Products, categories, promotions |

---

## Appendix B: Tax Configuration

**Priority (Highest Wins):**
1. **Item Override**: `taxTreatmentOverride` on Product/Service
2. **Category Rule**: Store-specific `LocationTaxCategoryRule`
3. **Store Default**: Business-wide taxability toggles

**Multi-Tax Support:**
- 5+ overlapping jurisdictions
- Custom labels (High Tax, Food Tax, Low Tax)
- Applicability flags (Products, Services, Food, Alcohol)

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Franchisor** | Business owner/LLC level entity |
| **Franchise** | Store grouping under a franchisor |
| **Location** | Physical storefront |
| **Drawer Session** | Shift with cash accountability |
| **Dual Pricing** | Separate Cash vs Card prices |
| **Magic Link** | Email-based authentication token |
| **FranchisorMembership** | Join table for multi-business access |

---

**Document Version:** 2.0  
**Platform:** ORO 9  
**Last Updated:** January 2026
