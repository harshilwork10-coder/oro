# Oronex Feature Documentation Standard

## 🔴 GOLDEN RULE

> **If a feature does not have documentation for UI + API + DB + Owner, it does not exist.**

## Required Documentation for Every Feature

Before any feature is considered "complete," it MUST have:

| Layer | Required Documentation |
|-------|----------------------|
| **UI** | Component location, user flow, screenshots/recordings |
| **API** | Endpoint paths, request/response schemas, auth requirements |
| **DB** | Prisma models involved, migrations, relationships |
| **Owner** | Business purpose, who uses it, configuration options |

## Enforcement

- [ ] PR reviews MUST check for documentation
- [ ] Undocumented features are treated as non-existent
- [ ] Knowledge Items (KI) should be created for complex features

## Template

```markdown
# Feature: [Name]

## Owner Context
- **Purpose:** Why this exists
- **Users:** Who uses this (OWNER, EMPLOYEE, PROVIDER)
- **Config:** Where it's enabled/disabled

## UI
- **Path:** `/dashboard/...`
- **Components:** `ComponentName.tsx`

## API
- **Endpoints:** `GET/POST /api/...`
- **Auth:** Required role

## DB
- **Models:** `ModelName`
- **Relations:** Connected to...
```
