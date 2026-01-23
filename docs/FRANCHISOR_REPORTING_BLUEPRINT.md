# Franchisor Reporting Blueprint (Salon - 200 Locations)

## 5 Daily Reports

### 1. Brand Command Center (Daily Health)
| Metric | Description |
|--------|-------------|
| Locations | Active / Pending / Suspended |
| Appointments today | Booked / Completed / Upcoming |
| Walk-ins today | Invoices without appointmentId |
| Total visits | Appointments + Walk-ins |
| Unique customers | Distinct clientId |
| Revenue today | Sum of invoice totals |
| Utilization % | Booked mins / Available mins |
| No-show % | No-shows / Total booked |

**Action List (Alerts)**
- Locations with no appointments next 48hrs
- High no-shows this week
- Low utilization
- No sales during open hours

---

### 2. Go-Live & Pending Tracker
Per pending location:
- Status: `PROVISIONING_PENDING → READY → ACTIVE`
- Days stuck
- Checklist: Stations, Pairing, MID/TID, Service Menu, Stylists, Hours, Test Appt, Test Checkout

---

### 3. Location Leaderboard
Per location (MTD/weekly):
- Revenue, Appointments, Walk-ins, Visits, Unique customers
- New vs Returning, Avg ticket, Utilization %, No-show %, Rebooking %

---

### 4. Customer Growth & Retention
Brand-wide AND per location:
- Unique customers (week/month)
- New vs Returning
- Repeat rate 30/60/90 days
- Avg visits per customer
- Avg spend per customer
- Lost customers (no return 60/90 days)

---

### 5. Stylist Capacity & Performance
Per stylist and per location:
- Utilization (booked hrs vs available)
- Revenue, Unique customers served
- Repeat customers %, Rebooking rate, No-show impact

---

## Location 360 Page

### A. Go-Live Status (if not active)
- Timeline + checklist + pending items
- Provider provisioning task status (read-only)

### B. Today Live Monitor
- Appointments: booked/completed/upcoming
- Walk-ins, Total visits, Unique customers, Revenue, No-shows
- Last activity time

### C. Customers
- New vs Returning (week/month)
- Repeat rate 30/60/90, Top returning customers

### D. Stylists
- Utilization per stylist, Empty slots next 2 days
- Top stylist today, Rebooking rate by stylist

### E. Alerts
- High no-show, Low bookings, No activity during hours, Revenue drop

---

## Metric Definitions

| Metric | Definition |
|--------|------------|
| **Appointment visit** | Completed/checked-out appointment |
| **Walk-in visit** | Invoice with no appointmentId |
| **Total visits** | Appointment visits + Walk-in visits |
| **Unique customers** | Distinct `clientId` across invoices + appointments |
| **New customer** | First-ever visit date in range |
| **Returning customer** | Had a visit before the range |
| **Rebooking rate** | % clients who book again within 30 days |
| **Utilization** | booked_minutes / available_minutes |
