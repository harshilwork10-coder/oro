# ORO 9 — Source of Truth Reference

This document is the canonical reference for all source-of-truth decisions in the ORO 9 codebase.
When legacy and modern systems overlap, this document defines which one wins.

---

## Config Hierarchy (BusinessConfig ↔ FranchiseSettings)

| Concern | Live Runtime Source | Provider Default Source | Notes |
|---------|-------------------|----------------------|-------|
| Pricing model | **FranchiseSettings.pricingModel** | BusinessConfig.pricingModel | Owner controls live pricing mode |
| Surcharge/dual pricing | **FranchiseSettings.cardSurcharge, showDualPricing** | BusinessConfig.cardSurcharge | Owner controls live surcharge |
| Tax rate | **FranchiseSettings.taxRate** | BusinessConfig.taxRate | Owner controls live tax rate |
| Void/refund limits | **FranchiseSettings.requireManagerPinAbove** | BusinessConfig.requireManagerPinAbove | Owner controls operational limits |
| Feature toggles (uses*) | **BusinessConfig** | — | Provider-controlled feature gating |
| Subscription limits | **BusinessConfig** | — | Provider-controlled tier limits |
| Salon feature toggles (enable*) | **FranchiseSettings** | — | Owner-controlled salon features |
| POS mode | **Derived from Franchisor.industryType** | BusinessConfig.posMode (seed) | Always derived, never trust stored value |

**Rule**: FranchiseSettings wins for all live store behavior. BusinessConfig values seed FranchiseSettings at onboarding. Once populated, FranchiseSettings is the canonical source.

---

## Pricing

| Concern | Source of Truth | Location | Notes |
|---------|----------------|----------|-------|
| Pricing model selection | **FranchiseSettings.pricingModel** | Prisma | STANDARD, DUAL_PRICING — owner controls |
| Pricing model seed | BusinessConfig.pricingModel | Prisma | **PROVIDER DEFAULT ONLY** — seeds FranchiseSettings at onboarding |
| Price resolution | `resolvePrice()` | `lib/pricing/resolvePrice.ts` | Resolution order: LocationOverride → Product.cashPrice → Product.price |
| Dual pricing % | **FranchiseSettings.cardSurcharge** | Prisma | Live runtime source — owner controls |
| ~~Legacy dual pricing~~ | `lib/dualPricing.ts` | **@deprecated** | Do NOT use for new code |
| Product.price field | `Product.price` | Prisma | **@deprecated** — legacy single-price. Use `cashPrice`/`cardPrice` |
| Product.cashPrice | `Product.cashPrice` | Prisma | **SOURCE OF TRUTH** for product pricing |
| Legacy pricing engine | `lib/pricing-engine.ts` | `lib/pricing-engine.ts` | Legacy tier/rule-based engine. resolvePrice.ts is the central entry point |

## Taxonomy / Categories

| Concern | Source of Truth | Location | Notes |
|---------|----------------|----------|-------|
| Product category | `Product.categoryId` + `ProductCategory` | Prisma | **SOURCE OF TRUTH** |
| ~~Product.category~~ | `Product.category` (plain text) | Prisma | **@deprecated** |
| Item category | `Item.categoryId` + `UnifiedCategory` | Prisma | Unified category system for Items |

## Tax

| Concern | Source of Truth | Location | Notes |
|---------|----------------|----------|-------|
| Tax jurisdiction | `TaxJurisdiction` model | Prisma | Canonical tax rates and rules |
| Tax calculation | `resolvePrice.calculateTax()` | `lib/pricing/resolvePrice.ts` | Uses TaxJurisdiction data |
| Tax treatment override | `Product.taxTreatmentOverride` | Prisma | Per-product tax exemptions |
| Category tax defaults | `ProductCategory.taxable`, `.taxRate` | Prisma | Category-level defaults |

## Permissions

| Concern | Source of Truth | Location | Notes |
|---------|----------------|----------|-------|
| Operational permissions | `User.canX` boolean fields | Prisma: `User` model | canAddProducts, canViewReports, etc. |
| Permission check entry point | `checkPermission()` | `lib/auth/checkPermission.ts` | Single entry point. Maps operations → User booleans |
| Role-based permissions | `User.role` + `getRolePermissions()` | `lib/permissions.ts` | Role grants vs explicit grants |

## Identity / Business Type

| Concern | Source of Truth | Location | Notes |
|---------|----------------|----------|-------|
| Business vertical | `Franchisor.industryType` | Prisma | Identity field — RETAIL, SALON, RESTAURANT, etc. |
| POS UI mode | `Franchisor.posMode` | Prisma | UI preference only — not a business discriminator |
| Item type discriminator | `Item.type` | Prisma | SERVICE, PRODUCT, MENU_ITEM, PACKAGE |

## Booking

| Concern | Source of Truth | Location | Notes |
|---------|----------------|----------|-------|
| Online booking config | `BookingProfile` | Prisma | isPublished, requireDeposit, etc. |
| Appointment creation | `Appointment` model | Prisma | Linked to BookingProfile + Employee |

## Route Conventions

| Concern | Documentation |
|---------|--------------|
| Dashboard route canon (employee/employees, franchisor/franchisors) | `src/app/dashboard/ROUTE_CANON.md` |
| API route canon (franchise* families) | `src/app/api/ROUTE_CANON.md` |

---

## Rules for New Code

1. **Always use `resolvePrice()`** for any pricing calculation — never read `Product.price` directly
2. **Always use `checkPermission()`** for operational permission checks — never read `User.canX` directly
3. **Prefer `categoryId`** over `category` (plain text) for product categorization
4. **Singular API routes** = self-service, **plural** = admin CRUD
5. **`Item` model** is the future for unified inventory — `Product` model will eventually be migrated
6. **Live pricing/tax** → always read `FranchiseSettings`, never `BusinessConfig`
7. **Feature toggles** (uses*) → always read `BusinessConfig`
8. **POS mode** → always derive from `Franchisor.industryType`, never trust stored `posMode`
