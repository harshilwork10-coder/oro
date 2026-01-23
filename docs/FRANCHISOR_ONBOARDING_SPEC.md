# Franchisor Onboarding & Go-Live Specification v1.1 (Salon)

## Hierarchy
```
Provider → Brand (Franchisor HQ) → Franchisee (LLC) → Location (Salon)
```

## Core Principles
- HQ creates business structure (franchisees + locations)
- Provider provisions hardware + processing
- Devices are assigned only to Stations (inside a Location)
- Go-Live status is driven by checklist completion + pairing events
- **NEW: 2-Step onboarding - collect only what's needed, when it's needed**

---

## 2-Step Onboarding Flow

### Step 1: Basic Info (Add Franchisee - 30 seconds)
Minimum to create franchisee in system. **No sensitive docs yet.**

#### A) Franchisee Business (LLC)
| Field | Required |
|-------|----------|
| Legal LLC Name | ✅ |
| DBA / Store Brand Name | Optional |
| Business Phone | ✅ |
| Business Email | ✅ |
| Mailing Address | ✅ |

#### B) Franchisee Owner (Person Login)
| Field | Required |
|-------|----------|
| Owner Full Name | ✅ |
| Owner Email (login) | ✅ |
| Owner Mobile | ✅ |
| Role | OWNER (default) |

#### C) Franchise Package (Optional)
| Field | Required |
|-------|----------|
| Type | Single/Multi-location (optional) |
| Region/Territory | Optional |
| Expected Go-Live Month | Optional |
| Notes | Optional |

> **Result**: Franchisee created, owner can log in, ready to add locations.

---

### Step 2: Go-Live Pack (Only When Location Opens)
Collected when HQ/franchisee creates a location and wants it live.

#### A) Location Details
- Location name
- Physical address
- Store phone
- Opening date
- Hours

#### B) Device Needs
- # of stations (POS terminals)
- Printer needed?
- Cash drawer?
- Scanner?

#### C) Payments/Processing (Provider collects)
- Legal entity (FEIN/SSN)
- Owner ID verification
- Bank account (voided check)
- Processor application fields

#### D) Salon Setup (Operations)
- Staff/stylists list
- Service menu (or pick brand defaults)
- Appointment rules

---

## Entities

### Franchise (LLC)
- id, name (legal), dbaName
- franchisorId
- businessPhone, businessEmail
- mailingAddress (city, state, zip)
- franchiseeType: `SINGLE_LOCATION | MULTI_LOCATION`
- region, expectedGoLiveMonth
- notes
- accountStatus

### User (Franchisee Owner)
- id, name, email, phone
- role: OWNER
- franchiseId (via relation)

### Location
- id, name, address
- franchiseId (required)
- provisioningStatus: `PROVISIONING_PENDING | READY_FOR_INSTALL | ACTIVE`
- firstLiveAt

---

## Permissions Matrix

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **HQ** | Add franchisees (basic), Add locations, View reports, View go-live status | Assign devices, Edit MID/TID |
| **Provider** | Provisioning, Device config, Processor setup, Approve/suspend | n/a |
| **Franchisee** | Manage staff/hours/appointments, View store reports | See other franchisees |

---

## Required Notifications

| Event | Notify |
|-------|--------|
| Franchisee created | HQ confirmation |
| Location created (PROVISIONING_PENDING) | Provider queue |
| Provider DONE (READY_FOR_INSTALL) | HQ + Franchisee owner |
| Location ACTIVE | HQ + Franchisee owner |

---

## Acceptance Tests

1. ✅ HQ can add franchisee in <30 seconds (basic form)
2. ✅ No sensitive docs required at franchisee creation
3. ✅ Location creation triggers provisioning task
4. ✅ Go-Live pack collected only when location opens
5. ✅ Franchisee owner can log in immediately after creation
