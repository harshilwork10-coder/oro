think like h# Verification Walkthrough: Global Catalog & Financial Engine

This walkthrough guides you through verifying the newly implemented "World-Class" features: **Global Catalog**, **Split Payouts**, and **Commission Rules**.

## 1. Global Catalog (Centralized Menu)
**Goal:** Verify that a Franchisor can manage standard services/products for all locations.

1.  **Navigate to Global Catalog**:
    *   Log in as a **Franchisor** or **Provider**.
    *   Click **Global Catalog** in the sidebar (or go to `/dashboard/catalog`).
2.  **Verify Tabs**:
    *   Check that "Global Services" and "Global Products" tabs are switchable.
3.  **Verify Data**:
    *   Confirm you see the mock data (e.g., "Signature Cut & Style", "Aura Volumizing Shampoo").
    *   Check the "Active Locations" count (e.g., "142 / 150").
4.  **Test UI**:
    *   Hover over rows to see the "Edit" and "Archive" action buttons appear.

## 2. Split Payout Configuration
**Goal:** Verify the interface for configuring automated royalty and marketing fund splits.

1.  **Navigate to Financials**:
    *   Click **Financials** in the sidebar.
2.  **Access Split Payouts**:
    *   Click the **Split Payouts** card in the "Configuration Quick Links" section (or go to `/dashboard/financials/split-payouts`).
3.  **Test Configuration**:
    *   **Toggle**: Switch "Enable Automated Splits" ON.
    *   **Inputs**: Change "Royalty Percentage" to `7.5` and "Marketing Fund" to `1.5`.
    *   **Verify Impact**: Check the "Financial Impact" alert box updates dynamically (e.g., "9.0% of every transaction...").
    *   **Save**: Click "Save Configuration" and verify the success alert/toast appears.

## 3. Commission Rules
**Goal:** Verify the interface for managing employee compensation tiers.

1.  **Navigate to Financials**:
    *   Click **Financials** in the sidebar.
2.  **Access Commission Rules**:
    *   Click the **Commission Rules** card (or go to `/dashboard/financials/commissions`).
3.  **Verify Tiers**:
    *   Check for existing tiers: "Junior Stylist" (35%), "Senior Stylist" (45%), "Master Stylist" (50%).
4.  **Verify Details**:
    *   Confirm each card shows "Services" % and "Retail" %.
    *   Check the "Active Staff" count on each card.

## 4. Sidebar Navigation
**Goal:** Ensure the sidebar is correct and functional.

1.  **Franchisor View**:
    *   Confirm **Global Catalog** is visible.
    *   Confirm **Financials** is visible.
2.  **Franchisee View** (if applicable):
    *   Confirm **Global Catalog** is **NOT** visible (it's for Franchisors).
    *   Confirm **Financials** is visible (for their own reports).

## 5. Code & Schema Verification
*   **Prisma Schema**: Verified `GlobalService`, `GlobalProduct`, `SplitPayoutConfig`, and `CommissionRule` models exist.
*   **Lint Check**: Verified `Sidebar.tsx` and `FinancialsPage` are free of syntax errors.
