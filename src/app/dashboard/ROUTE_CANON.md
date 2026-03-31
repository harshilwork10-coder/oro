# Route Canonicalization — Dashboard

This document clarifies the canonical purpose of routes that appear to be duplicates.
THEY ARE NOT DUPLICATES — they serve different roles.

## Employee Routes

| Route | Purpose | Role | API Surface |
|-------|---------|------|------------|
| `/dashboard/employee` | **Employee self-view** — my schedule, my stats, my tips | Employee (self) | `/api/employee/*` |
| `/dashboard/employees` | **Admin employee management** — CRUD, permissions, PIN reset | Owner / Manager | `/api/franchise/employees` |

**Do NOT merge.** The singular form is the employee's own dashboard; the plural is the admin management view.

## Franchisor Routes

| Route | Purpose | Role | API Surface |
|-------|---------|------|------------|
| `/dashboard/franchisor` | **Franchisor self-view** — my reports hub, cross-location data | Franchisor (HQ) | `/api/franchisor/*` |
| `/dashboard/franchisors` | **Provider admin client list** — client management, onboarding, account ops | Provider | `/api/franchisors` |

**Do NOT merge.** These are views for different tiers of the admin hierarchy.

## API Route Families (Franchise*)

| API Family | Purpose | Canonical Consumer |
|------------|---------|-------------------|
| `/api/franchise/` | Franchise-scoped operations (employees, locations, reports) | Owner dashboard, Manager |
| `/api/franchisee/` | Franchisee self-service (schedule, stats, pricing) | Franchisee user |
| `/api/franchisees/` | Admin franchisee CRUD | Provider, Admin |
| `/api/franchises/` | Franchise entity CRUD (the LLC/business itself) | Admin, onboarding |
| `/api/franchisor/` | Franchisor-scoped operations (dashboard, reporting, catalog) | Franchisor HQ user |
| `/api/franchisors/` | Admin franchisor CRUD (list, create, approve, suspend) | Provider admin |

### Rules for New Code
1. **Self-service** = singular (`/api/employee/`, `/api/franchisee/`, `/api/franchisor/`)
2. **Admin CRUD** = plural (`/api/employees/`, `/api/franchisees/`, `/api/franchisors/`)
3. **Scoped operations** = `/api/franchise/` (the franchise context, not the entity itself)
