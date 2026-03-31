# ORO 9 — Field Ownership Matrix

This document defines which model owns each configuration field and the governance rules
for BRAND_FRANCHISOR vs MULTI_LOCATION_OWNER business types.

## Legend

| Symbol | Meaning |
|--------|---------|
| ⚡ | Live runtime field (FranchiseSettings) |
| 📦 | Provider default/template (BusinessConfig) |
| 🔒 | Subject to brand locks |
| 🔧 | Derived from Franchisor.industryType |
| ⚠️ | Field exists on wrong model, future migration target |

---

## Pricing Fields

| Field | Model | Owner | Lock | Notes |
|-------|-------|-------|------|-------|
| `pricingModel` | ⚡ FranchiseSettings | Owner | 🔒 lockPricing | STANDARD / DUAL_PRICING |
| `cardSurcharge` | ⚡ FranchiseSettings | Owner | 🔒 lockPricing | Surcharge amount |
| `cardSurchargeType` | ⚡ FranchiseSettings | Owner | 🔒 lockPricing | PERCENTAGE / FIXED |
| `showDualPricing` | ⚡ FranchiseSettings | Owner | 🔒 lockPricing | Display both prices |
| `maxDiscountPercent` | ⚡ FranchiseSettings | Owner | 🔒 lockPricing | Max discount % |
| `promoStackingMode` | ⚡ FranchiseSettings | Owner | 🔒 lockPricing | Promo stacking rules |
| `pricingModel` | 📦 BusinessConfig | Provider | — | ⚠️ DEPRECATED for live runtime |
| `cardSurcharge` | 📦 BusinessConfig | Provider | — | ⚠️ DEPRECATED for live runtime |
| `cashDiscountEnabled` | 📦 BusinessConfig | Provider | — | ⚠️ DEPRECATED for live runtime |
| `cashDiscountPercent` | 📦 BusinessConfig | Provider | — | ⚠️ DEPRECATED for live runtime |

## Tax Fields

| Field | Model | Owner | Lock | Notes |
|-------|-------|-------|------|-------|
| `taxRate` | ⚡ FranchiseSettings | Owner | 🔒 lockPricing | Live tax rate |
| `taxReceiptMode` | ⚡ FranchiseSettings | Owner | — | Tax display format |
| `taxRate` | 📦 BusinessConfig | Provider | — | ⚠️ DEPRECATED: Float 0.08 default |
| `taxServices` | 📦 BusinessConfig | Provider | — | ⚠️ DEPRECATED: use servicesTaxableDefault |
| `taxProducts` | 📦 BusinessConfig | Provider | — | ⚠️ DEPRECATED: use productsTaxableDefault |
| `servicesTaxableDefault` | 📦 BusinessConfig | Provider | — | Business-level tax default |
| `productsTaxableDefault` | 📦 BusinessConfig | Provider | — | Business-level tax default |

## Feature Entitlements (Provider-Controlled)

| Field | Model | Owner | Notes |
|-------|-------|-------|-------|
| `usesLoyalty` | 📦 BusinessConfig | Provider | Feature gate |
| `usesGiftCards` | 📦 BusinessConfig | Provider | Feature gate |
| `usesMemberships` | 📦 BusinessConfig | Provider | Feature gate |
| `usesRoyalties` | 📦 BusinessConfig | Provider | BRAND_FRANCHISOR only |
| `usesFranchising` | 📦 BusinessConfig | Provider | BRAND_FRANCHISOR only |
| `usesMultiLocation` | 📦 BusinessConfig | Provider | Feature gate |
| `usesPayroll` | 📦 BusinessConfig | Provider | Feature gate |
| `usesTimeTracking` | 📦 BusinessConfig | Provider | Feature gate |
| `usesEmailMarketing` | 📦 BusinessConfig | Provider | Feature gate |
| `usesSMSMarketing` | 📦 BusinessConfig | Provider | Feature gate |
| `usesReviewManagement` | 📦 BusinessConfig | Provider | Feature gate |
| `canExportData` | 📦 BusinessConfig | Provider | Permission gate |
| `canExportReports` | 📦 BusinessConfig | Provider | Permission gate |

## Subscription / Limits (Provider-Controlled)

| Field | Model | Owner | Notes |
|-------|-------|-------|-------|
| `subscriptionTier` | 📦 BusinessConfig | Provider | STARTER / GROWTH / etc. |
| `maxLocations` | 📦 BusinessConfig | Provider | Location limit |
| `maxUsers` | 📦 BusinessConfig | Provider | User limit |

## Industry-Derived Fields

| Field | Model | Owner | Notes |
|-------|-------|-------|-------|
| `posMode` | 📦 BusinessConfig | 🔧 Derived | Should be derived from `Franchisor.industryType` |
| `usesServices` | 📦 BusinessConfig | 🔧 Derived | SERVICE → true |
| `usesRetailProducts` | 📦 BusinessConfig | 🔧 Derived | RETAIL → true |
| `usesAppointments` | 📦 BusinessConfig | 🔧 Derived | SERVICE → true |
| `usesScheduling` | 📦 BusinessConfig | 🔧 Derived | SERVICE → true |
| `usesCommissions` | 📦 BusinessConfig | 🔧 Derived | SERVICE → true |

## Store Branding (Owner-Controlled, No Locks)

| Field | Model | Owner | Notes |
|-------|-------|-------|-------|
| `storeLogo` | ⚡ FranchiseSettings | Owner | — |
| `storeDisplayName` | ⚡ FranchiseSettings | Owner | — |
| `storeAddress*` | ⚡ FranchiseSettings | Owner | Address fields |
| `storePhone` | ⚡ FranchiseSettings | Owner | — |
| `primaryColor` | ⚡ FranchiseSettings | Owner | UI branding |
| `receiptHeader` | ⚡ FranchiseSettings | Owner | — |
| `receiptFooter` | ⚡ FranchiseSettings | Owner | — |
| `receiptTemplate` | ⚡ FranchiseSettings | Owner | JSON template |
| `receiptPrintMode` | ⚡ FranchiseSettings | Owner | — |

## Salon Feature Toggles (Owner-Controlled)

| Field | Model | Owner | Notes |
|-------|-------|-------|-------|
| All `enable*` fields (20+) | ⚡ FranchiseSettings | Owner | Booking, prepayment, no-show, etc. |

## Operational Controls

| Field | Model | Owner | Notes |
|-------|-------|-------|-------|
| `requireManagerPinAbove` | ⚡ FranchiseSettings | Owner | ⚠️ Also on BusinessConfig (deprecated) |
| `refundLimitPerDay` | ⚡ FranchiseSettings | Owner | ⚠️ Also on BusinessConfig (deprecated) |
| `voidLimitPerDay` | ⚡ FranchiseSettings | Owner | — |
| `openDrawerOnCash` | ⚡ FranchiseSettings | Owner | — |
| `allowNegativeStock` | 📦 BusinessConfig | Owner | ⚠️ Future: move to FranchiseSettings |
| `autoLockMinutes` | 📦 BusinessConfig | Owner | ⚠️ Future: move to FranchiseSettings |

## Fields Currently on Wrong Model (Future Migration)

| Field | Current Model | Target Model | Priority |
|-------|--------------|-------------|----------|
| `tipPromptEnabled` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase B |
| `tipType` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase B |
| `tipSuggestions` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase B |
| `acceptsEbt` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase B |
| `acceptsChecks` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase B |
| `acceptsOnAccount` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase B |
| `shiftRequirement` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase B |
| `commissionCalculation` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase B |
| `loyaltyPointsAwarding` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase C |
| `cancellationFeeEnabled` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase C |
| `allowNegativeStock` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase C |
| `autoLockMinutes` | 📦 BusinessConfig | ⚡ FranchiseSettings | Phase C |

---

## Governance Rules

### BRAND_FRANCHISOR
1. Brand HQ sets BusinessConfig defaults for all franchisees
2. Brand HQ can enable locks: `lockPricing`, `lockServices`, `lockCommission`, `lockProducts`
3. Locked fields on FranchiseSettings cannot be changed by franchisee (API rejects with 403)
4. Unlocked fields are fully owner-controlled
5. Lock enforcement is at the API level via `enforceBrandLocks()` — UI disabling alone is not sufficient

### MULTI_LOCATION_OWNER
1. Provider sets BusinessConfig at onboarding (one-time seed)
2. FranchiseSettings is seeded from BusinessConfig defaults at creation
3. Owner has full autonomy — no locks apply, ever
4. BusinessConfig pricing/tax fields are never read for live runtime

### Read Resolution Order
```
getEffectiveSettings(franchiseId)
  1. If field is brand-locked → BusinessConfig value (brand standard)
  2. If FranchiseSettings has a value → use it (live runtime)  
  3. If BusinessConfig has a value → use it (provider default)
  4. Hardcoded default → last resort
```
