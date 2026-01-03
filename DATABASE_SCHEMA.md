# Oro POS - Database Schema Reference

This document provides detailed information about the database models.

---

## Overview

- **ORM:** Prisma
- **Dev Database:** SQLite
- **Prod Database:** PostgreSQL
- **Total Models:** 70+
- **Schema Size:** 4,035 lines

---

## Core Models

### Provider

The root tenant - represents the Oro platform itself.

```prisma
model Provider {
  id       String  @id @default(cuid())
  publicId String  @unique
  name     String
  isActive Boolean @default(true)
  
  users       User[]
  franchisors Franchisor[]
}
```

### Franchisor

A brand or chain (e.g., "ABC Liquors" brand).

```prisma
model Franchisor {
  id         String   @id @default(cuid())
  name       String
  providerId String
  email      String?
  phone      String?
  status     String   @default("PENDING")
  
  franchises Franchise[]
  users      User[]
}
```

### Franchise

An individual store/business.

```prisma
model Franchise {
  id           String   @id @default(cuid())
  name         String
  franchisorId String
  isActive     Boolean  @default(true)
  
  locations    Location[]
  users        User[]
  products     Product[]
  categories   Category[]
  transactions Transaction[]
  clients      Client[]
  settings     FranchiseSettings?
}
```

### Location

A physical store location.

```prisma
model Location {
  id          String   @id @default(cuid())
  name        String
  franchiseId String
  address     String?
  phone       String?
  
  // Oro Plus Directory
  showInDirectory    Boolean @default(false)
  publicName         String?
  publicDescription  String?
  businessType       String?
  latitude           Float?
  longitude          Float?
  operatingHours     String? // JSON
  
  // Terminal
  paxTerminalIP   String?
  paxTerminalPort String?
  
  users        User[]
  transactions Transaction[]
  appointments Appointment[]
}
```

### User

All system users (employees, owners, admins).

```prisma
model User {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique
  password    String
  pin         String?  // 4-digit PIN for quick access
  role        String   // PROVIDER, ADMIN, OWNER, MANAGER, etc.
  
  franchiseId String?
  locationId  String?
  
  // Permissions (JSON object)
  permissions String?
  
  transactions Transaction[]
  shifts       DrawerSession[]
  appointments Appointment[]
}
```

### Product

Product catalog items.

```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  sku         String?
  barcode     String?
  price       Decimal
  cost        Decimal?
  
  stock              Int     @default(0)
  lowStockThreshold  Int     @default(10)
  trackInventory     Boolean @default(true)
  
  categoryId  String?
  franchiseId String
  
  taxable     Boolean @default(true)
  isActive    Boolean @default(true)
  
  lineItems   TransactionLineItem[]
  promotions  PromotionItem[]
}
```

### Category

Product categories.

```prisma
model Category {
  id          String   @id @default(cuid())
  name        String
  color       String?
  icon        String?
  sortOrder   Int      @default(0)
  franchiseId String
  
  products Product[]
}
```

### Transaction

Sales transactions.

```prisma
model Transaction {
  id            String   @id @default(cuid())
  receiptNumber String?
  
  subtotal      Decimal
  tax           Decimal
  tipAmount     Decimal  @default(0)
  discount      Decimal  @default(0)
  total         Decimal
  
  paymentMethod String   // CASH, CREDIT_CARD, etc.
  status        String   @default("COMPLETED")
  
  cashReceived  Decimal?
  changeGiven   Decimal?
  
  clientId      String?
  employeeId    String
  locationId    String
  franchiseId   String
  
  lineItems TransactionLineItem[]
  
  createdAt DateTime @default(now())
}
```

### TransactionLineItem

Individual items in a transaction.

```prisma
model TransactionLineItem {
  id            String   @id @default(cuid())
  transactionId String
  
  productId     String?
  serviceId     String?
  
  name          String   // Snapshot of product name
  quantity      Int
  unitPrice     Decimal
  discount      Decimal  @default(0)
  total         Decimal
  
  createdAt     DateTime @default(now())
}
```

### Client

Customer records.

```prisma
model Client {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  email       String?
  phone       String?
  
  // Loyalty
  points           Int     @default(0)
  membershipTier   String  @default("BRONZE")
  liabilitySigned  Boolean @default(false)
  
  franchiseId String
  
  transactions  Transaction[]
  appointments  Appointment[]
  waivers       ClientWaiver[]
}
```

### Service (for salons/service businesses)

Service catalog.

```prisma
model Service {
  id          String   @id @default(cuid())
  name        String
  description String?
  duration    Int      // Minutes
  price       Decimal
  
  categoryId  String?
  franchiseId String
  
  appointments Appointment[]
}
```

### Appointment

Booking records.

```prisma
model Appointment {
  id          String   @id @default(cuid())
  
  clientId    String
  employeeId  String
  serviceId   String
  locationId  String
  
  startTime   DateTime
  endTime     DateTime
  status      String   @default("SCHEDULED")
  notes       String?
  
  createdAt   DateTime @default(now())
}
```

### Promotion

Deals and discounts.

```prisma
model Promotion {
  id          String   @id @default(cuid())
  name        String
  description String?
  
  type          String   // PERCENT_OFF, FIXED_AMOUNT, BOGO
  discountType  String   // PERCENT, FIXED
  discountValue Decimal
  
  startDate   DateTime?
  endDate     DateTime?
  isActive    Boolean  @default(true)
  priority    Int      @default(0)
  
  franchiseId String
  
  qualifyingItems PromotionItem[]
}
```

### DrawerSession

Cash drawer / shift sessions.

```prisma
model DrawerSession {
  id          String   @id @default(cuid())
  
  employeeId  String
  locationId  String
  
  openedAt    DateTime @default(now())
  closedAt    DateTime?
  
  openingAmount Decimal
  closingAmount Decimal?
  expectedAmount Decimal?
  variance      Decimal?
  
  transactions Transaction[]
}
```

---

## Supporting Models

### FranchiseSettings

Store-level settings.

```prisma
model FranchiseSettings {
  id             String @id @default(cuid())
  franchiseId    String @unique
  
  storeDisplayName  String?
  storeLogo         String?
  
  taxRate           Float  @default(0)
  tipEnabled        Boolean @default(true)
  tipPresets        String? // JSON: [15, 18, 20]
  
  cardSurchargeEnabled  Boolean @default(false)
  cardSurchargePercent  Float   @default(0)
  
  loyaltyPointsPerDollar Int @default(1)
  loyaltyRedemptionValue Float @default(0.01)
}
```

### SmsCredits

SMS credit tracking.

```prisma
model SmsCredits {
  id              String @id @default(cuid())
  franchiseId     String @unique
  creditsRemaining Int   @default(0)
  
  logs SmsLog[]
}
```

### SmsLog

SMS message history.

```prisma
model SmsLog {
  id          String   @id @default(cuid())
  smsCreditsId String
  
  toPhone     String
  message     String
  status      String   // SENT, FAILED
  messageId   String?  // Twilio message ID
  
  createdAt   DateTime @default(now())
}
```

### ClientWaiver

Signed digital waivers.

```prisma
model ClientWaiver {
  id            String   @id @default(cuid())
  franchiseId   String
  clientId      String?
  
  customerName  String
  customerEmail String
  signatureName String
  signatureDate DateTime
  
  waiverText    String
  waiverVersion String
  
  ipAddress     String
  userAgent     String
  consentGiven  Boolean @default(true)
}
```

---

## Indexes

Key indexes for performance:

```prisma
@@index([franchiseId])   // On most models
@@index([locationId])
@@index([createdAt])     // On Transaction
@@index([email])         // On User, Client
@@index([barcode])       // On Product
```

---

## Relationships Diagram

```
Provider
    │
    └──→ Franchisor (1:N)
            │
            └──→ Franchise (1:N)
                    │
                    ├──→ Location (1:N)
                    │       │
                    │       ├──→ User (1:N)
                    │       ├──→ Transaction (1:N)
                    │       │       └──→ TransactionLineItem (1:N)
                    │       ├──→ Appointment (1:N)
                    │       └──→ DrawerSession (1:N)
                    │
                    ├──→ Product (1:N)
                    │       └──→ Category (N:1)
                    │
                    ├──→ Client (1:N)
                    │       ├──→ Transaction (1:N)
                    │       └──→ Appointment (1:N)
                    │
                    ├──→ Promotion (1:N)
                    │
                    └──→ FranchiseSettings (1:1)
```

---

## Migrations

### Running Migrations

```bash
# Development (auto-sync)
npx prisma db push

# Production
npx prisma migrate dev --name migration_name
npx prisma migrate deploy
```

### Seeding

```bash
# Development only
curl http://localhost:3000/api/test/seed
```

Creates:
- Provider user: `provider@oronex.com` / `password123`
