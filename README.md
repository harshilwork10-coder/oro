# 🔒 Oro POS System

> **⚠️ PROPRIETARY SOFTWARE - ALL RIGHTS RESERVED**

This software is the exclusive property of Oro POS Systems. Unauthorized copying, distribution, or use is strictly prohibited. See [LICENSE](./LICENSE) for details.

---

## About

Oro POS is a comprehensive multi-tenant Point of Sale system designed for franchise businesses including liquor stores, vape shops, salons, and retail operations.

## Features

- 🛒 **Point of Sale** - Fast checkout with barcode scanning
- 💳 **Payment Integration** - PAX terminal, cash, split payments
- 📦 **Inventory Management** - Stock tracking, low stock alerts
- 👥 **Customer Loyalty** - Points, memberships, tiers
- 📱 **Oro Plus App** - Customer-facing PWA
- 📊 **Reports & Analytics** - Sales, inventory, employee reports
- 🏢 **Multi-Location** - Franchise hierarchy support
- 📧 **Marketing** - SMS campaigns, product promotions

## Documentation

| Document | Description |
|----------|-------------|
| [SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md) | Architecture & overview |
| [API_REFERENCE.md](./API_REFERENCE.md) | API endpoint details |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Database models |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Developer onboarding |

## Quick Start (Authorized Users Only)

```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Access at: http://localhost:3000

## Tech Stack

- **Frontend:** Next.js 16, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Prisma ORM (SQLite/PostgreSQL)
- **Auth:** NextAuth.js
- **SMS:** Twilio
- **Payments:** PAX Terminal

---

## ⚖️ Legal

**© 2024 Oro POS Systems. All Rights Reserved.**

This software contains proprietary trade secrets and confidential information. 
Any unauthorized access, use, reproduction, or distribution is prohibited and 
may result in civil and criminal penalties.

See [LICENSE](./LICENSE) for full terms.
