# Oro POS - Developer Guide

Welcome to the Oro POS codebase! This guide explains every file and folder so new developers can understand the project quickly.

---

## 📁 Project Structure Overview

```
franchise-pos-system/
├── src/                    # Source code (main development folder)
│   ├── app/               # Next.js App Router (pages & APIs)
│   ├── components/        # Reusable React components
│   ├── lib/               # Utilities, services, helpers
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React context providers
│   ├── types/             # TypeScript type definitions
│   └── middleware.ts      # Next.js middleware (auth routing)
├── prisma/                 # Database schema & migrations
├── public/                 # Static assets (images, icons)
├── scripts/                # Utility scripts
└── [config files]          # Configuration files
```

---

## 📁 Root Configuration Files

| File | Purpose | When to Edit |
|------|---------|--------------|
| `package.json` | Dependencies & npm scripts | Adding new packages |
| `tsconfig.json` | TypeScript configuration | Rarely |
| `tailwind.config.ts` | Tailwind CSS theme | Custom colors/spacing |
| `next.config.ts` | Next.js settings | API rewrites, env vars |
| `eslint.config.mjs` | Linting rules | Code style changes |
| `postcss.config.js` | CSS processing | Rarely |
| `.env` | Environment variables | Local config |
| `.env.example` | Template for .env | Document new env vars |

---

## 📁 `/src/app/` - Pages & APIs

This is the **Next.js App Router**. Each folder = a route.

### Page Routes

| Path | Folder | Description |
|------|--------|-------------|
| `/` | `page.tsx` | Landing/redirect page |
| `/login` | `login/` | User login page |
| `/dashboard/*` | `dashboard/` | Main owner/employee dashboard |
| `/provider/*` | `provider/` | Platform admin portal |
| `/franchisor/*` | `franchisor/` | Franchisor management |
| `/owner/*` | `owner/` | Franchise owner portal |
| `/employee/*` | `employee/` | Employee-specific pages |
| `/kiosk/*` | `kiosk/` | Self-service kiosk mode |
| `/customer-display` | `customer-display/` | Customer-facing screen |
| `/app/*` | `app/` | Oro Plus customer PWA |
| `/offline` | `offline/` | Offline mode fallback |

### Dashboard Routes (`/dashboard/`)

| Route | Purpose |
|-------|---------|
| `/dashboard/pos` | Main POS interface |
| `/dashboard/inventory` | Product management |
| `/dashboard/clients` | Customer management |
| `/dashboard/appointments` | Booking calendar |
| `/dashboard/employees` | Staff management |
| `/dashboard/reports/*` | Various reports |
| `/dashboard/settings/*` | Store settings |
| `/dashboard/marketing/promote` | Product promotion tool |

### API Routes (`/api/`)

All backend logic lives here. Each `route.ts` file handles HTTP requests.

| API Folder | Purpose | Key File |
|------------|---------|----------|
| `api/auth/` | Authentication | Login, logout, password reset |
| `api/pos/` | POS operations | Transactions, shifts, receipts |
| `api/products/` | Product CRUD | Create, update, delete products |
| `api/inventory/` | Stock management | Adjustments, low stock |
| `api/clients/` | Customer data | CRUD, loyalty |
| `api/appointments/` | Booking system | Create, update, cancel |
| `api/employees/` | Staff management | CRUD, permissions |
| `api/reports/` | Report generation | Sales, inventory, analytics |
| `api/settings/` | Store config | Franchise settings |
| `api/admin/` | Provider admin | Manage all franchises |
| `api/franchise/` | Franchise ops | Owner-level operations |
| `api/public/` | Public APIs | No auth required |
| `api/marketing/` | Marketing tools | Promotions, SMS |

---

## 📁 `/src/lib/` - Utilities & Services

Core business logic and integrations.

| File | Purpose | Key Functions |
|------|---------|---------------|
| **`prisma.ts`** | Database client | `prisma` - Singleton Prisma instance |
| **`auth.ts`** | NextAuth config | `authOptions` - Session, JWT, callbacks |
| **`sms.ts`** | Twilio SMS | `sendSMS()`, `sendBookingRequestSMS()` |
| **`rateLimit.ts`** | API rate limiting | `checkRateLimit()`, `isValidEmail()` |
| **`permissions.ts`** | User permissions | `hasPermission()`, `checkRole()` |
| **`receipt-generator.ts`** | Print receipts | Generate ESC/POS commands |
| **`print-agent.ts`** | Printer communication | Send to receipt printer |
| **`offline-db.ts`** | IndexedDB for offline | Store transactions locally |
| **`offline-sync.ts`** | Sync offline data | Upload when back online |
| **`s3.ts`** | AWS S3 uploads | `uploadToS3()` |
| **`email.ts`** | Email sending | `sendEmail()` |
| **`dualPricing.ts`** | Cash/card pricing | Calculate surcharges |
| **`commissionCalculator.ts`** | Staff commissions | Calculate payouts |
| **`auditLog.ts`** | Activity logging | `createAuditLog()` |

### PAX Terminal (`/lib/pax/`)
| File | Purpose |
|------|---------|
| `pax-terminal.ts` | PAX payment terminal integration |

### Security (`/lib/security/`)
| File | Purpose |
|------|---------|
| `sanitize.ts` | Input sanitization |
| `validation.ts` | Input validation |
| `encryption.ts` | Data encryption |

---

## 📁 `/src/components/` - UI Components

Reusable React components organized by feature.

### Component Folders

| Folder | Contains |
|--------|----------|
| `components/pos/` | POS-specific components (cart, menu, payment) |
| `components/modals/` | Modal dialogs (confirm, edit, etc.) |
| `components/dashboard/` | Dashboard widgets and cards |
| `components/layout/` | Page layouts, navigation |
| `components/ui/` | Basic UI elements (buttons, inputs) |
| `components/kiosk/` | Self-service kiosk UI |
| `components/appointments/` | Calendar, booking forms |
| `components/employees/` | Staff management UI |
| `components/reports/` | Report visualizations |

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Sidebar.tsx` | `layout/` | Main navigation sidebar |
| `Header.tsx` | `layout/` | Top header bar |
| `ProductGrid.tsx` | `pos/` | Product menu grid |
| `Cart.tsx` | `pos/` | Shopping cart |
| `PaymentModal.tsx` | `modals/` | Payment processing |
| `TransactionActionsModal.tsx` | `modals/` | Refund, void actions |
| `CustomerDisplay.tsx` | `pos/` | Customer-facing screen |

---

## 📁 `/src/hooks/` - Custom Hooks

| Hook | Purpose |
|------|---------|
| `useBusinessConfig.ts` | Fetch franchise settings |
| `useFullscreen.ts` | Toggle fullscreen mode |

---

## 📁 `/src/contexts/` - React Contexts

| Context | Purpose |
|---------|---------|
| `SoundContext.tsx` | Audio feedback settings |

---

## 📁 `/src/middleware.ts` - Request Middleware

Runs on every request. Handles:
- Authentication redirects
- Role-based access control
- Protected route enforcement

```typescript
// Example: Redirect unauthenticated users to login
if (!session && path.startsWith('/dashboard')) {
    return redirect('/login')
}
```

---

## 📁 `/prisma/` - Database

| File | Purpose |
|------|---------|
| `schema.prisma` | Database models (4000+ lines) |
| `dev.db` | SQLite database file (dev only) |
| `migrations/` | Database migrations |

### Key Commands
```bash
npx prisma generate  # Generate Prisma client
npx prisma db push   # Sync schema to database
npx prisma studio    # Visual database browser
```

---

## 📁 `/public/` - Static Assets

| Folder | Contains |
|--------|----------|
| `icons/` | PWA icons (192x192, 512x512) |
| `app/` | Oro Plus customer app assets |
| `manifest.json` | PWA manifest |
| `sw.js` | Service worker (offline) |

---

## 📁 `/scripts/` - Utility Scripts

Development and maintenance scripts.

| Script | Purpose |
|--------|---------|
| `seed.ts` | Seed database with test data |
| `migrate.ts` | Run database migrations |
| `cleanup.ts` | Clean old data |

---

## 🔑 Key Files for New Developers

**Start here to understand the codebase:**

1. **`src/lib/auth.ts`** - How authentication works
2. **`src/lib/prisma.ts`** - Database connection
3. **`prisma/schema.prisma`** - All database models
4. **`src/app/dashboard/pos/page.tsx`** - Main POS page
5. **`src/app/api/pos/transaction/route.ts`** - Transaction creation
6. **`src/middleware.ts`** - Route protection

---

## 🏗️ Common Patterns

### API Pattern
```typescript
// src/app/api/[resource]/route.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    // 1. Check auth
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 2. Query database
    const data = await prisma.model.findMany({
        where: { franchiseId: session.user.franchiseId }
    })
    
    // 3. Return response
    return NextResponse.json(data)
}
```

### Page Pattern
```typescript
// src/app/dashboard/[feature]/page.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function FeaturePage() {
    const { data: session } = useSession()
    const [data, setData] = useState([])
    
    useEffect(() => {
        fetch('/api/feature')
            .then(r => r.json())
            .then(setData)
    }, [])
    
    return <div>{/* UI */}</div>
}
```

### Component Pattern
```typescript
// src/components/feature/FeatureCard.tsx
interface FeatureCardProps {
    title: string
    value: number
    onClick?: () => void
}

export function FeatureCard({ title, value, onClick }: FeatureCardProps) {
    return (
        <div className="bg-gray-800 p-4 rounded-lg" onClick={onClick}>
            <h3>{title}</h3>
            <p>{value}</p>
        </div>
    )
}
```

---

## 🚀 Development Workflow

### 1. Start Development
```bash
npm run dev          # Start dev server on localhost:3000
```

### 2. Make Changes
- Edit files in `src/`
- Hot reload updates automatically

### 3. Database Changes
```bash
# After editing schema.prisma:
npx prisma db push   # Sync changes
npx prisma generate  # Regenerate client
```

### 4. Test Locally
- Login: `provider@oronex.com` / `password123`
- Access: `http://localhost:3000/dashboard`

### 5. Commit & Push
```bash
git add -A
git commit -m "feat/fix: Description"
git push
```

---

## 📞 Need Help?

1. Check the other documentation files:
   - `SYSTEM_DOCUMENTATION.md` - Architecture overview
   - `API_REFERENCE.md` - API endpoint details
   - `DATABASE_SCHEMA.md` - Database models

2. Search the codebase for examples:
   - Use Ctrl+Shift+F to find similar patterns

3. Check component usage:
   - Search for import statements to see how components are used

---

**Welcome to the team! 🎉**
