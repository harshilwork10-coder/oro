---
description: UX standard for Franchisor (HQ) multi-location reporting with searchable location switcher
---

# Franchisor Reports UX (HQ)

> **"Default 'All Locations' for rollups/leaderboards. Selecting a location auto-filters every report to that store."**

---

## 1. Default View = All Locations (Network)

When HQ opens Reports:
- **All Locations** pre-selected
- KPI cards = brand totals  
- Charts = brand trends
- Tables = Top/Bottom locations

---

## 2. Location Switcher (Sticky, Searchable)

**Top-left of every report page:**

```
┌─────────────────────────────────────┐
│ 🏪 All Locations          ▼        │
└─────────────────────────────────────┘
```

**When opened:**
- Search: "type store name / city / zip"
- Filters: State, City, Region, Franchisee/LLC
- ⭐ Favorites
- 🕐 Recently viewed

**❌ No dropdown with 200+ items — always search-based**

---

## 3. Two Modes

### Mode A: Network (All Locations)
Rollups + comparisons:
- Sales leaderboard (top/bottom)
- Appointments vs walk-ins by location
- Retention by location
- No-show rate by location
- Stylist productivity (avg, top performers)
- Operational issues:
  - "Locations with zero sales today"
  - "High refunds/voids"
  - "Missing close-day"
  - "Low staff utilization"

### Mode B: Single Location (Drill-down)
Same reports, auto-filtered + location health header:
- Status (Provisioning / Active / Suspended)
- Today sales | Appointments | Walk-ins
- No-show rate | Unique customers (7d)

---

## 4. Report Tabs (5-7 only)

| Tab | Content |
|-----|---------|
| Command Center | Exceptions + alerts |
| Leaderboard | Rankings + comparisons |
| Sales & Services | Revenue, services, products |
| Customers & Retention | Loyalty, retention, LTV |
| Staff & Productivity | Utilization, commissions |
| Operations | Close day, cash, audit |
| Go-Live Tracker | Setup, device, readiness |

**Pattern:** Summary first → "View Details" for deep tables

---

## 5. Required Filters (Every Report)

- [ ] Date range
- [ ] Location scope: All / Selected
- [ ] Franchisee/LLC (optional)
- [ ] Staff (optional)
- [ ] Service category (optional)

**Every export includes:**
- Location name + LocationId
- Date range
- Generated timestamp

---

## 6. Permissions Rule

| Role | Can View | Can Edit |
|------|----------|----------|
| HQ/Franchisor | All locations | ❌ No settings/devices |
| Franchisee/Operator | Own locations | ✅ Daily ops |

---

## Implementation Checklist

- [ ] Sticky location switcher component
- [ ] Search API for locations (name/city/zip)
- [ ] Favorites + Recently viewed (localStorage)
- [ ] Network mode (rollups/leaderboards)
- [ ] Single location mode (auto-filter)
- [ ] 7 report tabs with summary views
- [ ] Export with location metadata
