# System Architecture Documentation

## Overview
This document explains the architectural decisions and design patterns used in the Aura Franchise POS System.

## Design Principles

### 1. Separation of Concerns
- **Presentation Layer**: React components in `/src/components`
- **Business Logic**: API routes in `/src/app/api`
- **Data Layer**: Prisma ORM with PostgreSQL

### 2. Type Safety
- Full TypeScript implementation
- Prisma generates type-safe database client
- Strict TypeScript configuration

### 3. Modularity
- Reusable components
- Consistent API patterns
- DRY (Don't Repeat Yourself) principles

## Technology Choices & Rationale

### Next.js 14 (App Router)
**Why?**
- Server-side rendering for better SEO
- API routes for backend logic
- File-based routing (intuitive structure)
- Built-in optimization (images, fonts)
- React Server Components for performance

**Alternative Considered**: Create React App (CRA)
**Decision**: Next.js provides more features out-of-the-box

### TypeScript
**Why?**
- Catch errors at compile time
- Better IDE autocomplete
- Self-documenting code
- Easier refactoring

**Alternative Considered**: JavaScript
**Decision**: TypeScript scales better for large codebases

### Prisma ORM
**Why?**
- Type-safe database queries
- Automatic migrations
- Developer-friendly syntax
- Great performance

**Alternative Considered**: Raw SQL, TypeORM
**Decision**: Prisma offers best developer experience

### NextAuth.js
**Why?**
- Industry-standard authentication
- Multiple providers support
- JWT/Session management
- Security best practices built-in

**Alternative Considered**: Custom auth, Auth0
**Decision**: NextAuth is free and flexible

## Data Flow

### User Request Flow
```
1. User Request → 2. Next.js Router → 3. Page Component
                                           ↓
4. Client-side State ← 5. API Route ← 6. Prisma Client ← 7. PostgreSQL
```

### Authentication Flow
```
1. Login Form → 2. NextAuth API → 3. Credentials Provider
                                        ↓
4. Bcrypt Verify ← 5. Prisma Query ← 6. Database
     ↓
7. JWT Created → 8. Session Stored → 9. Redirect to Dashboard
```

## Database Design

### Normalization
- 3rd Normal Form (3NF)
- Foreign keys for relationships
- Indexes on frequently queried fields

### Key Design Decisions

#### 1. User vs Employee Separation
```prisma
model User {
  id       String  @id
  email    String  @unique
  password String?
  role     Role
}

model Employee {
  id     String @id
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}
```
**Rationale**: Not all users are employees (e.g., franchise owners), but all employees are users. This separation allows flexibility.

#### 2. Franchisor Business Type
```prisma
model Franchisor {
  businessType String  // BRAND_FRANCHISOR or MULTI_LOCATION_OWNER
}
```
**Rationale**: One model handles both types of franchisors, differentiated by businessType field. Simpler than two separate tables.

#### 3. Polymorphic Services
```prisma
model Service {
  franchiseId String?
  locationId  String?
}
```
**Rationale**: Services can be franchise-wide (catalog) or location-specific (custom). Nullable foreign keys provide flexibility.

## Component Architecture

### Page Components
Located in `/src/app/dashboard/**/page.tsx`
- Entry point for routes
- Fetch data via API calls
- Manage local state
- Render child components

### Layout Components
Located in `/src/components/layout/`
- `Sidebar.tsx` - Navigation with role-based links
- `Header.tsx` - Top bar (if needed)
- Shared across pages

### Feature Components
Located in `/src/components/{feature}/`
- Domain-specific (CRM, POS, etc.)
- Reusable within feature
- Example: `LeadCard.tsx`, `ActivityModal.tsx`

### UI Components
Located in `/src/components/ui/`
- Generic, reusable primitives
- Example: `Button.tsx`, `Modal.tsx`, `Card.tsx`

## State Management

### Local State (useState)
Used for:
- Form inputs
- UI toggles (modals, dropdowns)
- Component-specific data

### Server State (React Query could be added)
Currently using:
- `useEffect` + `fetch` for API calls
- Local state for caching

**Future Enhancement**: Consider React Query for:
- Automatic caching
- Background refetching
- Optimistic updates

### Global State (NextAuth Session)
Used for:
- User authentication
- Role/permissions
- Available via `useSession()` hook

## API Design

### RESTful Conventions
```
GET    /api/resources       - List all
POST   /api/resources       - Create new
GET    /api/resources/[id]  - Get one
PUT    /api/resources/[id]  - Update
DELETE /api/resources/[id]  - Delete
```

### Response Format
```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "Error message" }
```

### Authentication Middleware
```typescript
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }
  // ... rest of logic
}
```

## Security Layers

### 1. Authentication
- NextAuth.js handles sessions
- JWT tokens (httpOnly cookies)
- Bcrypt password hashing (10 salt rounds)

### 2. Authorization
- Role-based access control
- Permission checks in API routes
- UI elements hidden based on role

### 3. Data Validation
- TypeScript type checking
- Prisma schema validation
- API input validation (could add Zod)

### 4. SQL Injection Prevention
- Prisma parameterized queries
- No raw SQL (unless necessary)

## Performance Optimizations

### 1. Database Indexes
```prisma
@@index([email])        // Fast user lookups
@@index([franchiseId])  // Fast franchise queries
@@index([createdAt])    // Chronological sorting
```

### 2. Component Optimization
- React.memo for expensive renders (when needed)
- Lazy loading for modals
- Code splitting via Next.js dynamic imports

### 3. Database Queries
- Select only needed fields
- Use `include` for relations (avoid N+1 queries)
- Pagination for large datasets

## Error Handling

### Client-Side
```typescript
try {
  const res = await fetch('/api/endpoint')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  // Handle success
} catch (error) {
  console.error(error)
  setError(error.message)
}
```

### Server-Side
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Process request
    return Response.json({ success: true, data })
  } catch (error) {
    console.error(error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

## Deployment Considerations

### Environment Variables
- `.env.local` for development
- `.env.production` for production (not committed)
- Required vars:
  - `DATABASE_URL`
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`

### Build Process
```bash
npm run build  # Creates optimized production build
npm start      # Runs production server
```

### Database Migrations
```bash
npx prisma migrate deploy  # Applies migrations in production
```

## Future Enhancements

### Short Term
1. Add Zod for API validation
2. Implement React Query for data fetching
3. Add unit tests (Jest + React Testing Library)
4. Set up CI/CD pipeline

### Medium Term
1. Add real-time updates (WebSockets)
2. Implement caching strategy (Redis)
3. Add monitoring (Sentry, LogRocket)
4. Performance profiling

### Long Term
1. Microservices architecture (if needed)
2. GraphQL API (if REST becomes limiting)
3. Mobile app (React Native)
4. Advanced analytics (ML-based insights)

## Conclusion

This architecture prioritizes:
1. **Developer Experience** - TypeScript, Prisma, Next.js
2. **Maintainability** - Clear separation, consistent patterns
3. **Scalability** - Modular design, optimized queries
4. **Security** - Multiple layers of protection

The system is designed to be understood and maintained by any competent full-stack developer familiar with React and Node.js.
