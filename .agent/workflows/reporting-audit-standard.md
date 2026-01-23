---
description: Non-negotiable engineering standard for auditable, reproducible, immutable financial reporting
---

# ORO 9 Reporting & Audit Engineering Standard

> **"No report ships unless it can be rebuilt from an immutable transaction ledger and passes automated reconciliation checks against tenders and processor totals."**

---

## 1. Single Source of Truth (SSOT)

- ✅ All reports generated from **ledger tables** (Transaction, Tender, Tax, Refund)
- ❌ No "UI totals" or "cached totals" as truth
- Caching allowed for speed only—must always match ledger

---

## 2. Immutable Transaction Ledger

| Action | Allowed? | How |
|--------|----------|-----|
| Delete sale | ❌ Never | — |
| Edit completed sale | ❌ Never | — |
| Refund | ✅ | New `TransactionRefund` linked to original |
| Void | ✅ | New `TransactionVoid` linked to original |
| Correction | ✅ | Adjustment entry, not overwrite |

---

## 3. Metric Definitions (Code + UI)

```typescript
// src/lib/reporting/definitions.ts
export const METRIC_DEFINITIONS = {
  GROSS_SALES: "Sum of completed sales before refunds/voids",
  NET_SALES: "Gross Sales − Refunds − Voids",
  TAX_COLLECTED: "Tax charged on sales − tax refunded",
  TIPS: "Gratuity amount (separate from sales)",
  REFUNDS: "Sum of refund amounts (linked to original sale)",
  VOIDS: "Full cancellation before settlement",
};
```

---

## 4. Reproducible Reports

Reports for any date range must produce **identical results forever**.

**Snapshot on Transaction:**
- Product price at time of sale
- Tax rate at time of sale
- Employee ID, Station ID, Location ID

**❌ Never use current config for historical reports**

---

## 5. Reconciliation Checks (Automated)

### Z-Report Daily Check
```
Cash + Card + Gift − Refunds + Paid-Outs = Expected Drawer
```

### Payment Processor Check
```
POS Card Total ≈ Processor Batch Total (±$0.01)
```

---

## 6. Audit Trail Requirements

Every refund/void/discount logs:
- `userId` — who
- `createdAt` — when
- `stationId` — which device
- `reason` — why (required)
- `approvedBy` — manager PIN if override

Logs must be **exportable** (CSV/PDF).

---

## 7. Testing Requirements (Pre-Launch)

### Unit Tests
- Tax calculation (single/multi-rate)
- Discount application (%, $, stacking)
- Dual pricing (cash/card)
- Refund calculation

### E2E Tests
- Sale → Refund → Report matches
- Sale → Void → Report excludes
- Shift Close → Totals match tenders

### Golden Dataset
```
10 sales, 2 refunds, 1 void
Expected: Gross=$523.45, Net=$498.20, Tax=$41.23
```

---

## QA Sign-Off Checklist

- [ ] Daily Sales matches ledger
- [ ] Tax Report matches tax lines
- [ ] Refund/Void includes reason + approver
- [ ] Tender Reconciliation passes
- [ ] Processor batch matches POS card total
- [ ] Audit logs exportable

**Signed: _____________ Date: _____________**
