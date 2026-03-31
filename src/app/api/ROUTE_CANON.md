# API Route Canonicalization

This document defines the canonical purpose and scope of all franchise-related API route families.
New code MUST follow the conventions below.

## Convention

- **Singular** (`/api/employee/`, `/api/franchisor/`) = **self-service** endpoints for that role
- **Plural** (`/api/employees/`, `/api/franchisors/`) = **admin/management** CRUD over those entities
- **`/api/franchise/`** = **scoped operations** within a franchise context (employees, locations, services, etc.)

## Detailed API Family Reference

### `/api/employee/` — Employee Self-Service
- `schedule/` — my upcoming shifts
- `stats/` — my sales, tips, transactions
- `availability/` — my availability
- `my-reports/` — my personal reports
- `my-prices/` — my service prices

### `/api/employees/` — Admin Employee Management
- `GET /` — list employees (with location filter)
- `[id]/` — get/update/delete specific employee
- `current-location/` — location toggle state
- `compensation-settings/` — commission config
- `services/` — service assignments

### `/api/franchise/` — Franchise-Scoped Operations
- `employees/` — employee CRUD within franchise context
- `locations/` — location management
- `catalog/` — product catalog
- `customers/` — customer management
- `reports/` — franchise-level reports
- `services/` — service definitions
- `transactions/` — transaction queries

### `/api/franchisee/` — Franchisee Self-Service
- `consultation/` — consultation forms
- `expansion/` — expansion requests
- `invite/` — invite handling
- `merchant-application/` — application forms
- `my-locations/` — my location list

### `/api/franchisees/` — Admin Franchisee CRUD
- `GET /` — list franchisees (paginated)

### `/api/franchises/` — Franchise Entity CRUD
- `GET /` — list franchise entities
- `[id]/` — get/update specific franchise
- `locations/` — locations under a franchise

### `/api/franchisor/` — Franchisor-Scoped Operations
- `dashboard/` — franchisor HQ dashboard data
- `catalog/` — franchisor catalog management
- `reports/` — cross-location reporting
- `locations/` — multi-location overview
- `franchisees/` — franchisee management from HQ
- `royalty-config/` — royalty rules
- `portfolio/` — portfolio dashboards
- `saved-views/` — saved report configurations

### `/api/franchisors/` — Admin Franchisor CRUD
- `GET /` — list all franchisors (Provider admin)
- `[id]/` — get/update specific franchisor
- `update-docs/` — document upload management
