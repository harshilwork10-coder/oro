# ORO 9 Franchisor Mode - Technical Pack

**Version:** 1.0  
**Date:** January 16, 2026  
**Status:** GO-LIVE READY

---

## 1. Business Types

| Type | Code | Description |
|------|------|-------------|
| **Brand Franchisor** | `BRAND_FRANCHISOR` | McDonald's-style: Corporate brand owns catalog, grants franchisees |
| **Multi-Location Owner** | `MULTI_LOCATION_OWNER` | Single owner with multiple store locations (default) |

Field: `Franchisor.businessType`

---

## 2. Database Schema

### 2.1 Core Tables

#### `Franchisor` (prisma/schema.prisma:2226)

```prisma
model Franchisor {
  id              String  @id @default(cuid())
  ownerId         String  @unique
  providerId      String?
  name            String?
  
  // Status
  approvalStatus  String  @default("PENDING")  // PENDING, APPROVED, REJECTED
  accountStatus   String  @default("ACTIVE")   // ACTIVE, SUSPENDED, TERMINATED
  
  // Business Type
  businessType    String  @default("MULTI_LOCATION_OWNER")  // BRAND_FRANCHISOR | MULTI_LOCATION_OWNER
  industryType    String  @default("SERVICE")  // SERVICE | RETAIL | RESTAURANT
  
  // Brand Mode (BRAND_FRANCHISOR only)
  brandCode       String? @unique  // e.g., "GREATCLIPS"
  brandSettings   String?          // JSON: { appointmentsEnabled, tipsEnabled, ... }
  
  // Brand Control Locks
  lockPricing     Boolean @default(false)
  lockServices    Boolean @default(false)
  lockCommission  Boolean @default(false)
  lockProducts    Boolean @default(false)
  
  // Relations
  franchises      Franchise[]
  memberships     FranchisorMembership[]
  config          BusinessConfig?
}
```

#### `FranchisorMembership` (Multi-User Access)

```prisma
model FranchisorMembership {
  id           String  @id @default(cuid())
  userId       String
  franchisorId String
  role         String  @default("OWNER")  // OWNER, ADMIN, ACCOUNTANT, VIEWER
  isPrimary    Boolean @default(false)
  
  @@unique([userId, franchisorId])
}
```

#### `BusinessConfig` (Provider-Controlled)

```prisma
model BusinessConfig {
  id              String     @id
  franchisorId    String     @unique
  
  // Feature Toggles (Provider sets these)
  usesCommissions   Boolean @default(true)
  usesInventory     Boolean @default(true)
  usesAppointments  Boolean @default(true)
  usesLoyalty       Boolean @default(true)
  usesGiftCards     Boolean @default(true)
  usesMemberships   Boolean @default(true)
  usesRoyalties     Boolean @default(false)
  usesTipping       Boolean @default(true)
  usesDiscounts     Boolean @default(true)
}
```

### 2.2 Hierarchy

```
Franchisor (Brand/LLC)
    │
    └── Franchise[] (Store Groups)
            │
            └── Location[] (Physical Stores)
                    │
                    ├── User[] (Employees)
                    ├── Station[] (POS Terminals)
                    └── Transaction[]
```

### 2.3 Access Control Tables

#### `UserRoleAssignment` (Scoped RBAC)

```prisma
model UserRoleAssignment {
  id           String  @id
  userId       String
  role         String  // FRANCHISOR, OWNER, MANAGER, EMPLOYEE
  
  // Exactly ONE scope set:
  providerId   String?   // Platform-wide
  franchisorId String?   // Brand-wide
  franchiseId  String?   // Store group
  locationId   String?   // Single store
}
```

---

## 3. User Roles & Permissions

### 3.1 Role Hierarchy for Franchisor Mode

| Role | Scope | Capabilities |
|------|-------|--------------|
| `PROVIDER` | Platform | Full access, manages all Franchisors |
| `FRANCHISOR` | Brand | Brand HQ dashboard, view all locations |
| `FRANCHISEE` | Stores | Operate assigned stores only |
| `OWNER` | Store(s) | Full store access |
| `MANAGER` | Store | Limited settings |
| `EMPLOYEE` | POS | Basic POS operations |

### 3.2 Franchisor-Specific Permissions

**What Franchisors CAN do:**
- View all franchisees and locations
- Access Brand Catalog (global services/products)
- View cross-location reports
- Submit support tickets
- Request new franchisees/locations
- View compliance status

**What Franchisors CANNOT do (Provider-controlled):**
- Edit BusinessConfig feature toggles
- Directly add stores (must submit request)
- Access POS operations
- Modify system pricing (if `lockPricing=true`)

---

## 4. UI Screens

### 4.1 Route Structure

**Base Path:** `/franchisor`  
**Layout:** `src/app/franchisor/layout.tsx`

| Route | Page | Purpose |
|-------|------|---------|
| `/franchisor` | `page.tsx` | Redirect to home |
| `/franchisor/home` | `home/page.tsx` | Brand HQ Dashboard |
| `/franchisor/franchisees` | `franchisees/page.tsx` | Franchisee list |
| `/franchisor/franchisees/[id]` | `franchisees/[id]/page.tsx` | Franchisee detail |
| `/franchisor/locations` | `locations/page.tsx` | All locations |
| `/franchisor/locations/[id]` | `locations/[id]/page.tsx` | Location detail |
| `/franchisor/catalog` | `catalog/page.tsx` | Brand services/products |
| `/franchisor/reports` | `reports/page.tsx` | Cross-location reports |
| `/franchisor/support` | `support/page.tsx` | Support tickets |
| `/franchisor/requests` | `requests/page.tsx` | Onboarding requests |
| `/franchisor/requests/new` | `requests/new/page.tsx` | New request form |
| `/franchisor/users` | `users/page.tsx` | User management |

### 4.2 Layout Sidebar (8 Items)

```typescript
const FRANCHISOR_SIDEBAR = [
    { name: 'Home', href: '/franchisor/home', icon: Home },
    { name: 'Franchisees', href: '/franchisor/franchisees', icon: Users },
    { name: 'Locations', href: '/franchisor/locations', icon: MapPin },
    { name: 'Brand Catalog', href: '/franchisor/catalog', icon: Package },
    { name: 'Reports', href: '/franchisor/reports', icon: BarChart3 },
    { name: 'Support', href: '/franchisor/support', icon: Ticket },
    { name: 'Requests', href: '/franchisor/requests', icon: FileText },
    { name: 'Users', href: '/franchisor/users', icon: User },
];
```

### 4.3 Home Dashboard KPIs

**Row 1 - Overview:**
- Total Franchisees
- Total Locations
- Open Tickets
- Pending Requests

**Row 2 - Operations:**
- Locations Offline
- High Ticket Volume
- Compliance Issues
- Recently Activated

**Panels:**
- "Needs Attention" list (offline, tickets, compliance, onboarding)
- "Recent Requests" list with status badges

### 4.4 Quick Actions Menu

```typescript
const NEW_MENU_ITEMS = [
    { name: 'New Ticket', href: '/franchisor/support?action=new' },
    { name: 'New Onboarding Request', href: '/franchisor/requests/new' },
    { name: 'Request Device Change', href: '/franchisor/support?action=device-change' },
];
```

---

## 5. API Endpoints

### 5.1 Franchisor APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/franchisors` | PROVIDER | List all franchisors |
| `GET` | `/api/franchisors/[id]` | PROVIDER | Get franchisor details |
| `PATCH` | `/api/franchisors/[id]` | PROVIDER | Update franchisor |
| `DELETE` | `/api/franchisors/[id]` | PROVIDER | Delete franchisor (cascades) |
| `PATCH` | `/api/franchisors/update-docs` | FRANCHISOR | Upload documents |

### 5.2 Key API Files

| File | Purpose |
|------|---------|
| `src/app/api/franchisors/route.ts` | GET all (Provider only) |
| `src/app/api/franchisors/[id]/route.ts` | PATCH/DELETE single |
| `src/app/api/franchisors/update-docs/route.ts` | Document uploads |

### 5.3 API Response: GET /api/franchisors

```json
{
  "data": [{
    "id": "clx...",
    "ownerId": "clx...",
    "name": "Great Clips Corporate",
    "approvalStatus": "APPROVED",
    "accountStatus": "ACTIVE",
    "businessType": "BRAND_FRANCHISOR",
    "owner": {
      "name": "John Smith",
      "email": "john@greatclips.com"
    },
    "franchises": [{
      "id": "clx...",
      "name": "Great Clips Texas",
      "locations": [{
        "id": "clx...",
        "name": "Austin Downtown",
        "address": "123 Main St"
      }]
    }],
    "_count": { "franchises": 5 }
  }],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## 6. Brand Control Locks

When `businessType = BRAND_FRANCHISOR`:

| Lock | Effect |
|------|--------|
| `lockPricing` | Locations cannot change service/product prices |
| `lockServices` | Locations cannot add/edit services |
| `lockCommission` | Locations cannot change commission rules |
| `lockProducts` | Locations cannot add/edit products |

---

## 7. Onboarding Flow

### 7.1 New Franchisee Request

```
Franchisor submits request → Provider reviews → Approval → 
→ Magic Link sent → Franchisee sets password → Documents uploaded →
→ Provider verifies docs → Location provisioned → GO LIVE
```

### 7.2 Request Statuses

| Status | Description |
|--------|-------------|
| `SUBMITTED` | Initial request received |
| `IN_REVIEW` | Provider reviewing |
| `WAITING_DOCS` | Pending document upload |
| `APPROVED` | Ready for activation |
| `SHIPPED` | Hardware shipped |
| `ACTIVE` | Live and operational |
| `REJECTED` | Denied |

---

## 8. Global Catalog (Brand Mode)

For `BRAND_FRANCHISOR` types:

### 8.1 GlobalService

```prisma
model GlobalService {
  id           String     @id
  franchisorId String
  name         String
  price        Decimal
  duration     Int
  // Synced to all franchise locations
}
```

### 8.2 GlobalProduct

```prisma
model GlobalProduct {
  id           String     @id
  franchisorId String
  name         String
  sku          String
  price        Decimal
  // Synced to all franchise locations
}
```

---

## 9. Multi-User Access

### 9.1 Adding Users to a Brand

```sql
INSERT INTO FranchisorMembership (userId, franchisorId, role, isPrimary)
VALUES ('user_123', 'franchisor_456', 'ADMIN', false);
```

### 9.2 Roles within FranchisorMembership

| Role | Access Level |
|------|--------------|
| `OWNER` | Full access, billing, legal |
| `ADMIN` | Full operational access |
| `ACCOUNTANT` | Financial reports only |
| `VIEWER` | Read-only dashboard |

---

## 10. Cascade Delete Rules

When a Franchisor is deleted:

```
Franchisor (deleted)
    ├── FranchisorMemberships (CASCADE)
    ├── UserRoleAssignments (CASCADE)
    ├── BusinessConfig (CASCADE)
    ├── Franchises (CASCADE)
    │       └── Locations (CASCADE)
    │               ├── Users (location unset)
    │               ├── Transactions (kept for legal)
    │               └── Stations (CASCADE)
    ├── GlobalServices (CASCADE)
    └── GlobalProducts (CASCADE)
```

---

## 11. Security Rules

### 11.1 Route Protection

```typescript
// middleware.ts checks:
if (pathname.startsWith('/franchisor')) {
  if (!session) redirect('/login')
  if (session.user.role !== 'FRANCHISOR') redirect('/dashboard')
}
```

### 11.2 API Authorization

```typescript
// All /api/franchisors/* routes require:
const session = await getServerSession(authOptions)
if (session.user.role !== 'PROVIDER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 11.3 Franchisor Self-Access

Franchisors access their own data via session:
- `session.user.franchisorId` → scope all queries

---

## 12. Status Badges

### 12.1 Account Status

| Status | Color | Meaning |
|--------|-------|---------|
| `active` | 🟢 Emerald | Fully operational |
| `onboarding` | 🟡 Amber | Setup in progress |
| `suspended` | 🔴 Red | Account suspended |

### 12.2 Location Badges

| Badge | Color | Meaning |
|-------|-------|---------|
| `offline` | 🔴 Red | POS terminal offline |
| `tickets` | 🟡 Amber | Open support tickets |
| `compliance` | 🟣 Purple | Compliance issue |
| `onboarding` | 🔵 Blue | Setup in progress |

---

## 13. File Reference

### 13.1 UI Components

| File | Purpose |
|------|---------|
| `src/app/franchisor/layout.tsx` | Shell with sidebar/topbar |
| `src/app/franchisor/home/page.tsx` | Brand HQ dashboard |
| `src/app/franchisor/franchisees/page.tsx` | Franchisee table |
| `src/app/franchisor/locations/page.tsx` | Location table |
| `src/app/franchisor/catalog/page.tsx` | Global services/products |
| `src/app/franchisor/reports/page.tsx` | Cross-location reports |
| `src/app/franchisor/support/page.tsx` | Support tickets |
| `src/app/franchisor/requests/page.tsx` | Onboarding requests |
| `src/app/franchisor/users/page.tsx` | User management |

### 13.2 API Routes

| File | Methods |
|------|---------|
| `src/app/api/franchisors/route.ts` | GET |
| `src/app/api/franchisors/[id]/route.ts` | PATCH, DELETE |
| `src/app/api/franchisors/update-docs/route.ts` | POST |

### 13.3 Database

| File | Line | Model |
|------|------|-------|
| `prisma/schema.prisma` | 117 | FranchisorMembership |
| `prisma/schema.prisma` | 2226 | Franchisor |
| `prisma/schema.prisma` | 2328 | BusinessConfig |
| `prisma/schema.prisma` | 88 | UserRoleAssignment |

---

## 14. Testing Login

**Franchisor Test Account:**
- Email: Check seed data for FRANCHISOR role user
- Role: `FRANCHISOR`
- Dashboard: `/franchisor/home`

---

## 15. Workflows

### 15.1 Franchisor Login Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRANCHISOR LOGIN WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐
     │  /login  │
     └────┬─────┘
          │
          ▼
    ┌───────────────┐
    │ Enter Email & │
    │   Password    │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐     NO     ┌─────────────────┐
    │ Credentials   ├───────────►│ Show Error Msg  │
    │   Valid?      │            └─────────────────┘
    └───────┬───────┘
            │ YES
            ▼
    ┌───────────────┐     YES    ┌─────────────────┐
    │ MFA Enabled?  ├───────────►│ Enter TOTP/Code │
    └───────┬───────┘            └────────┬────────┘
            │ NO                          │
            │◄────────────────────────────┘
            ▼
    ┌───────────────┐
    │ Check Role    │
    └───────┬───────┘
            │
    ┌───────┴───────┬─────────────────┐
    │               │                 │
    ▼               ▼                 ▼
┌────────┐   ┌────────────┐   ┌────────────────┐
│PROVIDER│   │ FRANCHISOR │   │ OWNER/EMPLOYEE │
└───┬────┘   └─────┬──────┘   └───────┬────────┘
    │              │                  │
    ▼              ▼                  ▼
┌─────────┐  ┌───────────────┐  ┌─────────────┐
│/provider│  │/franchisor    │  │ /dashboard  │
│/clients │  │/home          │  │ /pos        │
└─────────┘  └───────────────┘  └─────────────┘
```

---

### 15.2 New Franchisee Onboarding Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      NEW FRANCHISEE ONBOARDING WORKFLOW                     │
└─────────────────────────────────────────────────────────────────────────────┘

FRANCHISOR                          PROVIDER                         FRANCHISEE
─────────────────────────────────────────────────────────────────────────────────

┌───────────────────┐
│ /franchisor/      │
│ requests/new      │
│                   │
│ Fill form:        │
│ • Business name   │
│ • Owner email     │
│ • Location count  │
│ • Industry type   │
└────────┬──────────┘
         │
         │ POST /api/onboarding/request
         ▼
                                ┌───────────────────┐
                                │ Request appears   │
                                │ in Provider queue │
                                │                   │
                                │ /provider/clients │
                                │ /onboarding       │
                                └────────┬──────────┘
                                         │
                                         │ Review & Approve
                                         ▼
                                ┌───────────────────┐
                                │ Generate Magic    │
                                │ Link Token        │
                                │                   │
                                │ POST /api/auth/   │
                                │ magic-link/send   │
                                └────────┬──────────┘
                                         │
                                         │ Email sent
                                         ▼
                                                                ┌───────────────────┐
                                                                │ Click Magic Link  │
                                                                │                   │
                                                                │ /auth/magic-link/ │
                                                                │ verify?token=xxx  │
                                                                └────────┬──────────┘
                                                                         │
                                                                         ▼
                                                                ┌───────────────────┐
                                                                │ Set Password      │
                                                                │ Accept Terms      │
                                                                │                   │
                                                                │ /onboarding/      │
                                                                │ security          │
                                                                └────────┬──────────┘
                                                                         │
                                                                         ▼
                                                                ┌───────────────────┐
                                                                │ Business Profile  │
                                                                │ • Business Name   │
                                                                │ • Address         │
                                                                │ • SSN/FEIN        │
                                                                │ • Bank Account    │
                                                                │                   │
                                                                │ /onboarding/      │
                                                                │ business          │
                                                                └────────┬──────────┘
                                                                         │
                                                                         ▼
                                                                ┌───────────────────┐
                                                                │ Upload Documents  │
                                                                │ • Voided Check    │
                                                                │ • Driver License  │
                                                                │ • FEIN Letter     │
                                                                │                   │
                                                                │ /onboarding/      │
                                                                │ documents         │
                                                                └────────┬──────────┘
                                                                         │
                                                                         │ Sets approvalStatus = PENDING
                                                                         ▼
                                ┌───────────────────┐
                                │ Verify Documents  │
                                │                   │
                                │ PATCH /api/admin/ │
                                │ franchisors/      │
                                │ [id]/approve      │
                                └────────┬──────────┘
                                         │
                                         │ approvalStatus = APPROVED
                                         │ Auto-creates Franchise + Location
                                         ▼
                                ┌───────────────────┐
                                │ Ship Hardware     │
                                │ (POS Terminal)    │
                                │                   │
                                │ Status: SHIPPED   │
                                └────────┬──────────┘
                                         │
                                         ▼
                                                                ┌───────────────────┐
                                                                │ Receive Hardware  │
                                                                │ Enter Setup Code  │
                                                                │                   │
                                                                │ Status: ACTIVE    │
                                                                └───────────────────┘
                                                                         │
                                                                         ▼
                                                                    ✅ GO LIVE
```

---

### 15.3 Add Location Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADD LOCATION WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

FRANCHISEE                          FRANCHISOR                       PROVIDER
─────────────────────────────────────────────────────────────────────────────────

┌───────────────────┐
│ /owner/locations  │
│                   │
│ Click "Request    │
│ New Location"     │
└────────┬──────────┘
         │
         │ POST /api/expansion/request
         ▼
                                ┌───────────────────┐
                                │ /franchisor/      │
                                │ requests          │
                                │                   │
                                │ Review request:   │
                                │ • Proposed addr   │
                                │ • Market data     │
                                │ • Financials      │
                                └────────┬──────────┘
                                         │
                          ┌──────────────┴──────────────┐
                          │                             │
                          ▼                             ▼
                   ┌────────────┐               ┌────────────┐
                   │  APPROVE   │               │  REJECT    │
                   └─────┬──────┘               └─────┬──────┘
                         │                            │
                         │                            ▼
                         │                     ┌────────────────┐
                         │                     │ Email sent     │
                         │                     │ with reason    │
                         │                     └────────────────┘
                         ▼
                                                                ┌───────────────────┐
                                                                │ Device request    │
                                                                │ created           │
                                                                │                   │
                                                                │ POST /api/admin/  │
                                                                │ onboarding/device │
                                                                └────────┬──────────┘
                                                                         │
                                                                         ▼
                                                                ┌───────────────────┐
                                                                │ Ship POS          │
                                                                │ Terminal          │
                                                                │                   │
                                                                │ Status: SHIPPED   │
                                                                └────────┬──────────┘
                                                                         │
                                                                         ▼
┌───────────────────┐
│ Pair Terminal     │
│ Enter Setup Code  │
│ from Location.    │
│ setupCode         │
│                   │
│ /dashboard/       │
│ settings/terminal │
└────────┬──────────┘
         │
         ▼
    ✅ Location ACTIVE
```

---

### 15.4 Support Ticket Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SUPPORT TICKET WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

FRANCHISEE/FRANCHISOR                                            PROVIDER OPS
─────────────────────────────────────────────────────────────────────────────────

┌───────────────────┐
│ /franchisor/      │
│ support?action=new│
│                   │
│ Create Ticket:    │
│ • Subject         │
│ • Category        │
│ • Priority        │
│ • Description     │
│ • Location (opt)  │
└────────┬──────────┘
         │
         │ POST /api/tickets
         │
         │ Status: OPEN
         ▼
                                                                ┌───────────────────┐
                                                                │ /provider/ops/    │
                                                                │ tickets           │
                                                                │                   │
                                                                │ Auto-assign based │
                                                                │ on category       │
                                                                └────────┬──────────┘
                                                                         │
                                                                         │ Status: IN_PROGRESS
                                                                         ▼
                                                                ┌───────────────────┐
                                                                │ Work on issue     │
                                                                │                   │
                                                                │ Add internal      │
                                                                │ notes / messages  │
                                                                └────────┬──────────┘
                                                                         │
                                              ┌──────────────────────────┴──────────┐
                                              │                                     │
                                              ▼                                     ▼
                                    ┌─────────────────┐                 ┌─────────────────┐
                                    │ Needs more info │                 │ Issue resolved  │
                                    │                 │                 │                 │
                                    │ Status:         │                 │ Status:         │
                                    │ WAITING_ON_USER │                 │ RESOLVED        │
                                    └───────┬─────────┘                 └────────┬────────┘
                                            │                                    │
                                            ▼                                    │
┌───────────────────┐                                                            │
│ Reply to ticket   │                                                            │
│                   │                                                            │
│ Status:           │                                                            │
│ IN_PROGRESS       │                                                            │
└───────────────────┘                                                            │
                                                                                 ▼
                                                                ┌───────────────────┐
                                                                │ Auto-close after  │
                                                                │ 7 days if no      │
                                                                │ response          │
                                                                │                   │
                                                                │ Status: CLOSED    │
                                                                └───────────────────┘
```

---

### 15.5 Daily Franchisor Operations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DAILY FRANCHISOR OPERATIONS WORKFLOW                     │
└─────────────────────────────────────────────────────────────────────────────┘

MORNING                          MIDDAY                           END OF DAY
─────────────────────────────────────────────────────────────────────────────────

┌───────────────────┐
│ Login to          │
│ /franchisor/home  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ CHECK KPIs        │     │ MONITOR           │     │ REVIEW            │
│                   │     │                   │     │                   │
│ • Offline locs    │     │ • Real-time sales │     │ • Daily sales     │
│ • Open tickets    │     │ • Active alerts   │     │ • Top locations   │
│ • Pending reqs    │     │ • Staff issues    │     │ • Compliance      │
└────────┬──────────┘     └─────────┬─────────┘     └─────────┬─────────┘
         │                          │                         │
         ▼                          ▼                         ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│ TRIAGE            │     │ RESOLVE           │     │ REPORT            │
│                   │     │                   │     │                   │
│ /franchisor/      │     │ /franchisor/      │     │ /franchisor/      │
│ locations?filter= │     │ support           │     │ reports           │
│ issues            │     │                   │     │                   │
│                   │     │ Reply to tickets  │     │ Export weekly     │
│ Click into red    │     │ Escalate to       │     │ P&L by location   │
│ flagged locations │     │ Provider if needed│     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
```

---

### 15.6 Brand Catalog Sync Workflow (BRAND_FRANCHISOR only)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BRAND CATALOG SYNC WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

FRANCHISOR HQ                                              ALL LOCATIONS
─────────────────────────────────────────────────────────────────────────────────

┌───────────────────┐
│ /franchisor/      │
│ catalog           │
│                   │
│ Add/Edit Global   │
│ Service:          │
│ • "Haircut"       │
│ • $25.00          │
│ • 30 min          │
└────────┬──────────┘
         │
         │ POST /api/franchisor/catalog/services
         ▼
┌───────────────────┐
│ GlobalService     │
│ record created    │
│                   │
│ If lockPricing    │
│ = true, price     │
│ cannot be         │
│ overridden        │
└────────┬──────────┘
         │
         │ Sync triggered (background job)
         ▼
                                                        ┌───────────────────┐
                                                        │ Service appears   │
                                                        │ at ALL franchise  │
                                                        │ locations         │
                                                        │                   │
                                                        │ /dashboard/pos    │
                                                        │ menu shows new    │
                                                        │ "Haircut" service │
                                                        └───────────────────┘


OVERRIDE BEHAVIOR (if lockPricing = false):
─────────────────────────────────────────────────────────────────────────────────

Location Owner at /owner/catalog:
┌───────────────────┐
│ Override price    │
│ for this location │
│                   │
│ "Haircut" = $30   │
│ (local override)  │
└───────────────────┘
         │
         ▼
┌───────────────────┐
│ LocationItemOver- │
│ ride record       │
│                   │
│ Global: $25       │
│ Local:  $30       │
└───────────────────┘
```

---

**Document End**  
**Prepared for:** Go-Live Team  
**Classification:** Internal Technical Reference
