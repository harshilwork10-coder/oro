---
description: Feature delivery checklist for every PR - Data, API, UI, Permissions
---

# Feature Delivery Checklist

Attach this checklist to every PR. All applicable items must be checked before merge.

## A) Data Layer
- [ ] Prisma model created/updated
- [ ] Migration file exists and runs
- [ ] Seed/test data added (or documented)
- [ ] Indexes/unique constraints added (if needed)

## B) API Layer
- [ ] GET list endpoint
- [ ] GET detail endpoint
- [ ] POST create endpoint
- [ ] PATCH update endpoint
- [ ] Validation + error messages (missing required fields)
- [ ] Scoping: must require activeFranchisorId / llcId

## C) UI Layer
- [ ] List page shows data correctly
- [ ] Create form exists and saves successfully
- [ ] Edit form exists and updates successfully
- [ ] Empty states ("no stores yet")
- [ ] Loading + error states

## D) Permissions & Security
- [ ] Role-based access enforced in API
- [ ] UI hides actions user cannot do

---

**Not all items apply to every feature.** Mark N/A for items that don't apply.
