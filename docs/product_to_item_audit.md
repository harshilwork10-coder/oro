# Product → Item Migration Prep Audit

**Status**: AUDIT ONLY — no code changes, no migration  
**Date**: 2026-03-31  
**Purpose**: Map every read/write of `Product` and identify what must change when migrating to `Item`

---

## 1. Field Mapping: Product → Item

### Fields present on BOTH models

| Product Field | Item Field | Notes |
|--------------|-----------|-------|
| `id` | `id` | Both cuid() |
| `franchiseId` | `franchiseId` | Same FK |
| `name` | `name` | Direct map |
| `description` | `description` | Direct map |
| `price` | `price` | Product.price is @deprecated; Item.price is the canonical field |
| `isActive` | `isActive` | Direct map |
| `imageUrl` (missing) | `imageUrl` | Product doesn't have imageUrl |
| `categoryId` | `categoryId` | Product → ProductCategory; Item → UnifiedCategory |
| `barcode` | `barcode` | Direct map |
| `sku` | `sku` | Direct map |
| `stock` | `stock` | Direct map |
| `cost` | `cost` | Direct map |
| `reorderPoint` | `reorderPoint` | Direct map |
| `brand` | `brand` | Direct map |
| `size` | `size` | Direct map |
| `ageRestricted` | `ageRestricted` | Direct map |
| `minimumAge` | `minimumAge` | Direct map |
| `isEbtEligible` | `isEbtEligible` | Direct map |
| `isTobacco` | `isTobacco` | Direct map |

### Fields ONLY on Product (must migrate or drop)

| Field | Usage | Migration Strategy |
|-------|-------|-------------------|
| `cashPrice` | Dual pricing base | Migrate to Item or via LocationOverride |
| `cardPrice` | Derived dual price | Migrate to Item or compute via resolvePrice() |
| `category` (text) | @deprecated legacy | DROP — use categoryId |
| `productType` | Sub-categorization | Consider Item.variantAttributes or new field |
| `vendor` | Supplier reference | Consider ProductSupplier relation on Item |
| `plu` | PLU code for produce | Add to Item if needed |
| `soldByWeight` | Scale trigger | Add to Item if needed |
| `alcoholType` | Excise tax | Add to Item if needed |
| `volumeMl` | Alcohol volume | Add to Item if needed |
| `abvPercent` | Alcohol ABV | Add to Item if needed |
| `unitsPerCase` | Case break | Add to Item if needed |
| `casePrice` | Case pricing | Add to Item if needed |
| `sellByCase` | Case sales toggle | Add to Item if needed |
| `stockCases` | Case stock tracking | Add to Item if needed |
| `minStock` | Auto-reorder trigger | Add to Item if needed |
| `maxStock` | Target reorder level | Add to Item if needed |
| `globalProductId` | Global catalog link | Add to Item if needed |

### Fields ONLY on Item (already ahead)

| Field | Purpose |
|-------|---------|
| `type` | Discriminator: SERVICE, PRODUCT, MENU_ITEM, PACKAGE |
| `sortOrder` | Display ordering |
| `isBundle` | Bundle/kit support |
| `bundleComponents` | Bundle contents (JSON) |
| `isMatrix` | Matrix item (variants) |
| `parentItemId` | Parent matrix reference |
| `variantAttributes` | Variant data (JSON) |
| `duration` | Service duration |
| `requiresDeposit` | Booking deposit |
| `depositAmount` | Deposit value |
| `preparationTime` | Restaurant prep |
| `calories` | Nutrition |
| `allergens` | Allergen data |
| `isWicEligible` | WIC eligibility |

---

## 2. Files Accessing `prisma.product.` (~50+ files)

### Core Library
- `lib/invoice-matcher.ts` — product matching during invoice import
- `lib/inventory/stock-guard.ts` — stock level enforcement

### POS API Routes
- `api/pos/retail/search/route.ts` — barcode/name search at POS
- `api/pos/retail/lookup/route.ts` — single product lookup
- `api/pos/retail/top-sellers/route.ts` — top sellers display
- `api/pos/plu-lookup/route.ts` — PLU code lookup
- `api/pos/transaction/route.ts` — transaction processing (stock deduction)
- `api/pos/suggestive-sell/route.ts` — cross-sell recommendations
- `api/pos/product-recommendations/route.ts` — AI recommendations
- `api/pos/salon/init/route.ts` — salon POS init (services via Product)
- `api/pos/refresh-status/route.ts` — POS data refresh
- `api/pos/bootstrap/route.ts` — POS offline bootstrap
- `api/pos/menu/route.ts` — restaurant menu
- `api/pos/open-ring/route.ts` — open-ring product creation
- `api/pos/stock-transfer/[id]/route.ts` — inter-location stock transfer
- `api/pos/age-verify/route.ts` — age restriction check
- `api/pos/bottle-deposit/route.ts` — bottle deposit calculation

### Product CRUD
- `api/products/route.ts` — product CRUD
- `api/products/search/route.ts` — product search

### Reports (READ ONLY — lower risk)
- `api/reports/abc-analysis/route.ts`
- `api/reports/basket-analysis/route.ts`
- `api/reports/daily/route.ts`
- `api/reports/csv-export/route.ts`
- `api/reports/dead-stock/route.ts`
- `api/reports/dead-stock/deals/route.ts`
- `api/reports/flash-report/route.ts`
- `api/reports/inventory/route.ts`
- `api/reports/inventory-valuation/route.ts`
- `api/reports/reorder/route.ts`
- `api/reports/sales-by-sku/route.ts`
- `api/reports/sales-velocity/route.ts`
- `api/reports/top-sellers/route.ts`
- `api/reports/shrinkage/route.ts`

### Public / Storefront
- `api/public/order-ahead/route.ts` — public ordering

### Owner / Multi-Store
- `api/owner/low-stock/route.ts` — low stock alerts
- `api/owner/multi-store-pricing/route.ts` — cross-location pricing
- `api/owner/inventory/centralized/route.ts` — centralized inventory view

### Inventory Management
- `api/inventory/price-book/route.ts` — price book management
- `api/inventory/product-history/route.ts` — product history
- `api/inventory/product-insights/route.ts` — product analytics
- `api/inventory/product-price-history/route.ts` — price change history
- `api/inventory/reorder-suggestions/route.ts` — auto-reorder
- `api/inventory/quick-receive/route.ts` — quick receiving

### Other
- `api/invoices/[id]/route.ts` — invoice processing
- `api/marketing/promote/route.ts` — promotions
- `api/promotions/check/route.ts` — promotion validation
- `api/tax/calculate/route.ts` — tax calculation
- `api/pulse/inventory/route.ts` — inventory pulse
- `api/pulse/low-stock/route.ts` — low stock pulse

---

## 3. Migration Blockers

| Blocker | Severity | Detail |
|---------|----------|--------|
| `TransactionLineItem.productId` FK | HIGH | Product is FK target in transaction line items. Cannot drop Product without migrating line items. |
| `ProductSupplier`, `PurchaseOrderItem`, `StockAdjustment` | HIGH | Multiple relation tables FK to Product |
| `ProductBarcodeAlias`, `ProductCostHistory`, `PriceChangeLog` | MEDIUM | Audit/history tables reference Product |
| `TagAlongItem` | MEDIUM | Cross-sell pairs reference Product |
| `LocationItemOverride` | LOW | Already uses generic name but FKs to Product |
| `OrderTemplateItem` | LOW | Order templates reference Product |
| `PromotionProduct` | MEDIUM | Promotion qualifying items reference Product |

---

## 4. Recommended Migration Approach (FUTURE)

1. **Phase 1**: Add all missing Product-only fields to Item model schema
2. **Phase 2**: Create `itemId` shadow fields on relation tables alongside `productId`
3. **Phase 3**: Dual-write: all Product writes also write to Item
4. **Phase 4**: Migrate reads from Product → Item one route at a time
5. **Phase 5**: Backfill Item records from existing Product records
6. **Phase 6**: Switch FK targets on relation tables from productId → itemId
7. **Phase 7**: Drop Product model

**Estimated scope**: Major migration (~3-4 weeks) across 50+ files.
**NOT to be started without explicit approval.**
