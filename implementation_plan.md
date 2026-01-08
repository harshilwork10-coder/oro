# Implementation Plan - World-Class POS System

## Goal Description
Build a robust, touch-optimized Point of Sale (POS) system that rivals industry leaders like Toast and Square. The POS will handle complex transaction flows, cash management, and real-time reporting, serving as the heartbeat of the franchise location.

## User Review Required
> [!IMPORTANT]
> **Schema Changes**: We are adding `CashDrawerSession` for shift management and `Discount` for structured promotions.
> **UI Layout**: The design will be "Tablet First" but responsive for desktop.

## Proposed Changes

### Schema Updates (`prisma/schema.prisma`)
#### [NEW] Cash Management
- `CashDrawerSession`: Tracks opening/closing balance, cash drops, and variance.
- `CashDrop`: Records safe drops during a shift.

#### [NEW] Promotions
- `Discount`: Reusable discount rules (Percentage, Fixed Amount, BOGO).

### Backend API
#### [NEW] POS Endpoints
- `GET /api/pos/menu`: Optimized fetch for all active services/products/discounts.
- `POST /api/pos/transaction`: Handle complex checkout with split payments and inventory deduction.
- `POST /api/pos/shift/open` & `close`: Manage cash drawer sessions.

### Frontend UI (`src/app/dashboard/pos/`)
#### [NEW] POS Layout
- **Smart Grid**: Visual category and item selector.
- **Active Ticket**: Real-time cart with swipe-to-delete and modifier support.
- **Action Bar**: High-contrast buttons for Checkout, Park, and Customer lookup.

#### [NEW] Components
- `ProductGrid.tsx`: Visual grid of items.
- `CartPanel.tsx`: The active ticket view.
- `CheckoutModal.tsx`: Multi-tender payment flow (Cash, Card, Gift Card).
- `CashDrawerModal.tsx`: UI for opening/closing shifts.

### Reports
#### [NEW] Z-Report (End of Day)
- Aggregated view of:
    - Net Sales
    - Tax Collected
    - Tips
    - Payment Method Breakdown (Cash vs Card)
    - Cash Variance

## Verification Plan

### Automated Tests
- Verify `CashDrawerSession` logic (cannot close if not open).
- Verify Inventory deduction upon Transaction completion.

### Manual Verification
- **Shift Flow**: Open Drawer -> Make Cash Sale -> Drop Cash -> Close Drawer -> Verify Z-Report.
- **Transaction Flow**: Add Service + Product -> Apply Discount -> Checkout -> Verify Receipt.
