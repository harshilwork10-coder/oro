# Oronex Database Schema (Complete with Data Types)
## SQLite Database with Prisma ORM

---

## 1. PERMISSIONS SYSTEM

### Permission
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| name | VARCHAR(255) | UNIQUE, NOT NULL |
| description | TEXT | NULL |
| category | VARCHAR(100) | NULL |
| createdAt | DATETIME | DEFAULT NOW |

### UserPermission
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| userId | VARCHAR(25) | FK → User |
| permissionId | VARCHAR(25) | FK → Permission |
| granted | BOOLEAN | DEFAULT TRUE |

### RoleDefaultPermission
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| role | VARCHAR(50) | NOT NULL |
| permissionId | VARCHAR(25) | FK → Permission |

---

## 2. USERS & AUTHENTICATION

### User
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| name | VARCHAR(255) | NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password | VARCHAR(255) | NULL (hashed) |
| pin | VARCHAR(255) | NULL (hashed 4-digit) |
| image | VARCHAR(500) | NULL |
| dailyGoal | FLOAT | DEFAULT 500 |
| role | VARCHAR(50) | DEFAULT 'EMPLOYEE' |
| customPermissions | TEXT/JSON | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |
| acceptedTermsAt | DATETIME | NULL |
| acceptedTermsVersion | VARCHAR(50) | NULL |
| failedLoginAttempts | INT | DEFAULT 0 |
| lockedUntil | DATETIME | NULL |
| canAddServices | BOOLEAN | DEFAULT FALSE |
| canAddProducts | BOOLEAN | DEFAULT FALSE |
| canManageInventory | BOOLEAN | DEFAULT FALSE |
| canViewReports | BOOLEAN | DEFAULT FALSE |
| canProcessRefunds | BOOLEAN | DEFAULT FALSE |
| canManageSchedule | BOOLEAN | DEFAULT FALSE |
| canManageEmployees | BOOLEAN | DEFAULT FALSE |
| canManageShifts | BOOLEAN | DEFAULT FALSE |
| canClockIn | BOOLEAN | DEFAULT TRUE |
| canClockOut | BOOLEAN | DEFAULT TRUE |
| franchiseId | VARCHAR(25) | FK → Franchise, NULL |
| locationId | VARCHAR(25) | FK → Location, NULL |
| commissionRuleId | VARCHAR(25) | FK → CommissionRule, NULL |

### MagicLink
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| email | VARCHAR(255) | NOT NULL |
| token | VARCHAR(255) | UNIQUE |
| expiresAt | DATETIME | NOT NULL |
| userId | VARCHAR(25) | FK → User, NULL |
| createdAt | DATETIME | DEFAULT NOW |
| completedAt | DATETIME | NULL |

---

## 3. FRANCHISE HIERARCHY

### Franchisor
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| ownerId | VARCHAR(25) | FK → User, UNIQUE |
| name | VARCHAR(255) | NULL |
| approvalStatus | VARCHAR(50) | DEFAULT 'PENDING' |
| accountStatus | VARCHAR(50) | DEFAULT 'ACTIVE' |
| suspendedAt | DATETIME | NULL |
| suspendedReason | TEXT | NULL |
| businessType | VARCHAR(50) | DEFAULT 'MULTI_LOCATION_OWNER' |
| address | VARCHAR(500) | NULL |
| phone | VARCHAR(20) | NULL |
| corpName | VARCHAR(255) | NULL |
| corpAddress | VARCHAR(500) | NULL |
| ssn | VARCHAR(20) | NULL (encrypted) |
| fein | VARCHAR(20) | NULL |
| ss4 | VARCHAR(50) | NULL |
| ebt | VARCHAR(50) | NULL |
| documents | TEXT/JSON | NULL |
| documentsLater | BOOLEAN | NULL |
| processingType | VARCHAR(50) | NULL |
| needToDiscussProcessing | BOOLEAN | DEFAULT FALSE |
| routingNumber | VARCHAR(50) | NULL (encrypted) |
| accountNumber | VARCHAR(50) | NULL (encrypted) |
| voidCheckUrl | VARCHAR(500) | NULL |
| driverLicenseUrl | VARCHAR(500) | NULL |
| feinLetterUrl | VARCHAR(500) | NULL |
| brandColorPrimary | VARCHAR(10) | NULL (hex) |
| brandColorSecondary | VARCHAR(10) | NULL (hex) |
| logoUrl | VARCHAR(500) | NULL |
| faviconUrl | VARCHAR(500) | NULL |
| domain | VARCHAR(255) | NULL |
| integrations | TEXT/JSON | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Franchise
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| slug | VARCHAR(100) | UNIQUE |
| approvalStatus | VARCHAR(50) | DEFAULT 'PENDING' |
| ssn | VARCHAR(20) | NULL (encrypted) |
| fein | VARCHAR(20) | NULL |
| routingNumber | VARCHAR(50) | NULL (encrypted) |
| accountNumber | VARCHAR(50) | NULL (encrypted) |
| voidCheckUrl | VARCHAR(500) | NULL |
| driverLicenseUrl | VARCHAR(500) | NULL |
| feinLetterUrl | VARCHAR(500) | NULL |
| needToDiscussProcessing | BOOLEAN | DEFAULT FALSE |
| franchisorId | VARCHAR(25) | FK → Franchisor |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Location
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| slug | VARCHAR(100) | UNIQUE |
| address | VARCHAR(500) | NULL |
| franchiseId | VARCHAR(25) | FK → Franchise |
| ownerId | VARCHAR(25) | FK → User, NULL |
| processorName | VARCHAR(50) | NULL |
| processorMID | VARCHAR(100) | NULL |
| processorTID | VARCHAR(100) | NULL |
| processorVAR | VARCHAR(100) | NULL |
| paxTerminalIP | VARCHAR(50) | NULL |
| paxTerminalPort | VARCHAR(10) | DEFAULT '10009' |
| googlePlaceId | VARCHAR(255) | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### BusinessConfig
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchisorId | VARCHAR(25) | FK → Franchisor, UNIQUE |
| usesCommissions | BOOLEAN | DEFAULT TRUE |
| usesInventory | BOOLEAN | DEFAULT TRUE |
| usesAppointments | BOOLEAN | DEFAULT TRUE |
| usesScheduling | BOOLEAN | DEFAULT TRUE |
| usesVirtualKeypad | BOOLEAN | DEFAULT TRUE |
| usesLoyalty | BOOLEAN | DEFAULT TRUE |
| usesGiftCards | BOOLEAN | DEFAULT TRUE |
| usesMemberships | BOOLEAN | DEFAULT TRUE |
| usesReferrals | BOOLEAN | DEFAULT TRUE |
| usesRoyalties | BOOLEAN | DEFAULT FALSE |
| usesTipping | BOOLEAN | DEFAULT TRUE |
| usesDiscounts | BOOLEAN | DEFAULT TRUE |
| taxRate | FLOAT | DEFAULT 0.08 |
| taxServices | BOOLEAN | DEFAULT TRUE |
| taxProducts | BOOLEAN | DEFAULT TRUE |
| usesRetailProducts | BOOLEAN | DEFAULT TRUE |
| usesServices | BOOLEAN | DEFAULT TRUE |
| usesEmailMarketing | BOOLEAN | DEFAULT TRUE |
| usesSMSMarketing | BOOLEAN | DEFAULT TRUE |
| usesReviewManagement | BOOLEAN | DEFAULT TRUE |
| usesMultiLocation | BOOLEAN | DEFAULT FALSE |
| usesFranchising | BOOLEAN | DEFAULT FALSE |
| usesTimeTracking | BOOLEAN | DEFAULT TRUE |
| usesPayroll | BOOLEAN | DEFAULT FALSE |
| shiftRequirement | VARCHAR(50) | DEFAULT 'BOTH' |
| reviewRequestTiming | VARCHAR(50) | DEFAULT 'MANUAL' |
| reviewRequestMethod | VARCHAR(50) | DEFAULT 'SMS' |
| reviewIncentive | DECIMAL(10,2) | DEFAULT 0 |
| tipPromptEnabled | BOOLEAN | DEFAULT TRUE |
| tipPromptTiming | VARCHAR(50) | DEFAULT 'AT_CHECKOUT' |
| tipSuggestions | VARCHAR(100) | DEFAULT '[15,20,25]' |
| tipType | VARCHAR(20) | DEFAULT 'PERCENT' |
| tipPoolingEnabled | BOOLEAN | DEFAULT FALSE |
| commissionCalculation | VARCHAR(50) | DEFAULT 'AUTOMATIC' |
| commissionVisibility | VARCHAR(50) | DEFAULT 'ALWAYS' |
| loyaltyPointsAwarding | VARCHAR(50) | DEFAULT 'AUTOMATIC' |
| loyaltyPointsRatio | DECIMAL(10,2) | DEFAULT 1 |
| loyaltyBirthdayBonus | DECIMAL(10,2) | DEFAULT 0 |
| reminderEnabled | BOOLEAN | DEFAULT TRUE |
| reminderTiming | VARCHAR(50) | DEFAULT '24_HOURS' |
| reminderMethod | VARCHAR(50) | DEFAULT 'SMS' |
| cancellationFeeEnabled | BOOLEAN | DEFAULT FALSE |
| cancellationFeeAmount | DECIMAL(10,2) | DEFAULT 0 |
| cancellationWindow | INT | DEFAULT 24 |
| membershipAutoBilling | BOOLEAN | DEFAULT TRUE |
| membershipFailedPaymentRetry | INT | DEFAULT 3 |
| giftCardAutoEmail | BOOLEAN | DEFAULT TRUE |
| giftCardPhysical | BOOLEAN | DEFAULT TRUE |
| discountRequiresApproval | BOOLEAN | DEFAULT FALSE |
| discountMaxPercent | DECIMAL(5,2) | DEFAULT 50 |
| lowStockAlertEnabled | BOOLEAN | DEFAULT TRUE |
| lowStockThreshold | INT | DEFAULT 5 |
| allowMultiProvider | BOOLEAN | DEFAULT FALSE |
| newClientBonusEnabled | BOOLEAN | DEFAULT FALSE |
| newClientBonusAmount | DECIMAL(10,2) | DEFAULT 10 |
| cashDiscountEnabled | BOOLEAN | DEFAULT FALSE |
| cashDiscountPercent | DECIMAL(5,2) | DEFAULT 3.5 |
| canExportData | BOOLEAN | DEFAULT FALSE |
| canExportReports | BOOLEAN | DEFAULT FALSE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### FranchiseSettings
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise, UNIQUE |
| pricingModel | VARCHAR(50) | DEFAULT 'DUAL_PRICING' |
| cardSurchargeType | VARCHAR(50) | DEFAULT 'PERCENTAGE' |
| cardSurcharge | DECIMAL(5,2) | DEFAULT 3.99 |
| showDualPricing | BOOLEAN | DEFAULT TRUE |
| enablePackages | BOOLEAN | DEFAULT TRUE |
| enableResources | BOOLEAN | DEFAULT FALSE |
| enableClientPhotos | BOOLEAN | DEFAULT FALSE |
| enableRecurringBooking | BOOLEAN | DEFAULT TRUE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

---

## 4. SERVICES & PRODUCTS

### ServiceCategory
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| franchiseId | VARCHAR(25) | FK → Franchise |
| sortOrder | INT | DEFAULT 0 |
| isActive | BOOLEAN | DEFAULT TRUE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Service
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULL |
| duration | INT | NOT NULL (minutes) |
| price | DECIMAL(10,2) | NOT NULL |
| categoryId | VARCHAR(25) | FK → ServiceCategory, NULL |
| franchiseId | VARCHAR(25) | FK → Franchise |
| globalServiceId | VARCHAR(25) | FK → GlobalService, NULL |

### Product
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULL |
| price | DECIMAL(10,2) | NOT NULL |
| cost | DECIMAL(10,2) | NULL |
| stock | INT | DEFAULT 0 |
| category | VARCHAR(100) | NULL |
| sku | VARCHAR(50) | NULL |
| isActive | BOOLEAN | DEFAULT TRUE |
| franchiseId | VARCHAR(25) | FK → Franchise |
| globalProductId | VARCHAR(25) | FK → GlobalProduct, NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### GlobalService
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchisorId | VARCHAR(25) | FK → Franchisor |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULL |
| duration | INT | NOT NULL (minutes) |
| defaultPrice | DECIMAL(10,2) | NOT NULL |
| category | VARCHAR(100) | NULL |
| isArchived | BOOLEAN | DEFAULT FALSE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### GlobalProduct
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchisorId | VARCHAR(25) | FK → Franchisor |
| name | VARCHAR(255) | NOT NULL |
| description | TEXT | NULL |
| defaultPrice | DECIMAL(10,2) | NOT NULL |
| defaultCost | DECIMAL(10,2) | NULL |
| sku | VARCHAR(50) | NULL |
| category | VARCHAR(100) | NULL |
| isArchived | BOOLEAN | DEFAULT FALSE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

---

## 5. CLIENTS

### Client
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| firstName | VARCHAR(100) | NOT NULL |
| lastName | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NULL |
| phone | VARCHAR(20) | NULL |
| liabilitySigned | BOOLEAN | DEFAULT FALSE |
| loyaltyJoined | BOOLEAN | DEFAULT FALSE |
| allergies | TEXT | NULL |
| preferences | TEXT | NULL |
| internalNotes | TEXT | NULL |
| vipStatus | BOOLEAN | DEFAULT FALSE |
| photoConsent | BOOLEAN | DEFAULT FALSE |
| photoConsentDate | DATETIME | NULL |
| franchiseId | VARCHAR(25) | FK → Franchise |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### ClientNote
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| clientId | VARCHAR(25) | FK → Client |
| note | TEXT | NOT NULL |
| noteType | VARCHAR(50) | DEFAULT 'GENERAL' |
| isPinned | BOOLEAN | DEFAULT FALSE |
| createdBy | VARCHAR(25) | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### ClientPhoto
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| clientId | VARCHAR(25) | FK → Client |
| photoUrl | VARCHAR(500) | NOT NULL |
| photoType | VARCHAR(50) | DEFAULT 'PROGRESS' |
| caption | VARCHAR(255) | NULL |
| serviceId | VARCHAR(25) | NULL |
| takenAt | DATETIME | DEFAULT NOW |
| takenBy | VARCHAR(25) | NULL |
| createdAt | DATETIME | DEFAULT NOW |

---

## 6. APPOINTMENTS & SCHEDULING

### Appointment
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| locationId | VARCHAR(25) | FK → Location |
| clientId | VARCHAR(25) | FK → Client |
| serviceId | VARCHAR(25) | FK → Service |
| employeeId | VARCHAR(25) | FK → User |
| resourceId | VARCHAR(25) | FK → Resource, NULL |
| recurringId | VARCHAR(25) | FK → RecurringAppointment, NULL |
| startTime | DATETIME | NOT NULL |
| endTime | DATETIME | NOT NULL |
| status | VARCHAR(50) | DEFAULT 'SCHEDULED' |
| notes | TEXT | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Schedule
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| locationId | VARCHAR(25) | FK → Location |
| employeeId | VARCHAR(25) | FK → User |
| date | DATETIME | NOT NULL |
| startTime | DATETIME | NOT NULL |
| endTime | DATETIME | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### RecurringAppointment
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| locationId | VARCHAR(25) | FK → Location |
| clientId | VARCHAR(25) | FK → Client |
| serviceId | VARCHAR(25) | FK → Service |
| employeeId | VARCHAR(25) | NULL |
| frequency | VARCHAR(50) | NOT NULL |
| dayOfWeek | INT | NULL (0-6) |
| dayOfMonth | INT | NULL (1-31) |
| preferredTime | VARCHAR(10) | NOT NULL |
| startDate | DATETIME | NOT NULL |
| endDate | DATETIME | NULL |
| maxOccurrences | INT | NULL |
| isActive | BOOLEAN | DEFAULT TRUE |
| lastGeneratedDate | DATETIME | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Resource
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| locationId | VARCHAR(25) | FK → Location |
| name | VARCHAR(100) | NOT NULL |
| type | VARCHAR(50) | DEFAULT 'CHAIR' |
| description | TEXT | NULL |
| capacity | INT | DEFAULT 1 |
| isActive | BOOLEAN | DEFAULT TRUE |
| sortOrder | INT | DEFAULT 0 |
| allowedServiceIds | TEXT | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### WaitlistEntry
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| locationId | VARCHAR(25) | FK → Location |
| customerName | VARCHAR(100) | NOT NULL |
| customerPhone | VARCHAR(20) | NULL |
| customerEmail | VARCHAR(255) | NULL |
| partySize | INT | DEFAULT 1 |
| serviceId | VARCHAR(25) | NULL |
| notes | TEXT | NULL |
| status | VARCHAR(50) | DEFAULT 'WAITING' |
| position | INT | NOT NULL |
| estimatedWait | INT | NULL (minutes) |
| checkedInAt | DATETIME | DEFAULT NOW |
| seatedAt | DATETIME | NULL |
| notifiedAt | DATETIME | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### CheckIn
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| clientId | VARCHAR(25) | FK → Client |
| locationId | VARCHAR(25) | FK → Location |
| status | VARCHAR(50) | DEFAULT 'WAITING' |
| checkedInAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

---

## 7. TRANSACTIONS & PAYMENTS

### Transaction
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| invoiceNumber | VARCHAR(50) | UNIQUE, NULL |
| franchiseId | VARCHAR(25) | FK → Franchise |
| clientId | VARCHAR(25) | FK → Client, NULL |
| employeeId | VARCHAR(25) | FK → User, NULL |
| subtotal | DECIMAL(10,2) | NOT NULL |
| tax | DECIMAL(10,2) | DEFAULT 0 |
| tip | DECIMAL(10,2) | DEFAULT 0 |
| discount | DECIMAL(10,2) | DEFAULT 0 |
| cardFee | DECIMAL(10,2) | DEFAULT 0 |
| total | DECIMAL(10,2) | NOT NULL |
| paymentMethod | VARCHAR(50) | NOT NULL |
| processingPlan | VARCHAR(50) | NULL |
| cashAmount | DECIMAL(10,2) | DEFAULT 0 |
| cardAmount | DECIMAL(10,2) | DEFAULT 0 |
| gatewayTxId | VARCHAR(100) | NULL |
| authCode | VARCHAR(20) | NULL |
| cardLast4 | VARCHAR(4) | NULL |
| cardType | VARCHAR(20) | NULL |
| status | VARCHAR(50) | DEFAULT 'COMPLETED' |
| voidedById | VARCHAR(25) | NULL |
| voidedAt | DATETIME | NULL |
| voidReason | TEXT | NULL |
| cashDrawerSessionId | VARCHAR(25) | FK → CashDrawerSession, NULL |
| originalTransactionId | VARCHAR(25) | FK → Transaction (self-ref), NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### TransactionLineItem
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| transactionId | VARCHAR(25) | FK → Transaction |
| type | VARCHAR(20) | NOT NULL (SERVICE/PRODUCT) |
| serviceId | VARCHAR(25) | FK → Service, NULL |
| staffId | VARCHAR(25) | FK → User, NULL |
| productId | VARCHAR(25) | FK → Product, NULL |
| quantity | INT | DEFAULT 1 |
| price | DECIMAL(10,2) | NOT NULL |
| discount | DECIMAL(10,2) | DEFAULT 0 |
| total | DECIMAL(10,2) | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |

### Terminal
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| serialNumber | VARCHAR(50) | UNIQUE |
| model | VARCHAR(50) | NOT NULL |
| locationId | VARCHAR(25) | FK → Location |
| status | VARCHAR(20) | DEFAULT 'ONLINE' |
| ipAddress | VARCHAR(50) | NULL |
| macAddress | VARCHAR(20) | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### CashDrawerSession
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| locationId | VARCHAR(25) | FK → Location |
| employeeId | VARCHAR(25) | FK → User |
| startTime | DATETIME | DEFAULT NOW |
| endTime | DATETIME | NULL |
| startingCash | DECIMAL(10,2) | NOT NULL |
| endingCash | DECIMAL(10,2) | NULL |
| expectedCash | DECIMAL(10,2) | NULL |
| variance | DECIMAL(10,2) | NULL |
| status | VARCHAR(20) | DEFAULT 'OPEN' |
| notes | TEXT | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### CashDrop
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| sessionId | VARCHAR(25) | FK → CashDrawerSession |
| amount | DECIMAL(10,2) | NOT NULL |
| reason | VARCHAR(50) | NOT NULL |
| droppedBy | VARCHAR(25) | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |

### DrawerActivity
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| type | VARCHAR(50) | NOT NULL |
| reason | VARCHAR(100) | NULL |
| note | TEXT | NULL |
| amount | FLOAT | NULL |
| employeeId | VARCHAR(25) | FK → User |
| timestamp | DATETIME | DEFAULT NOW |
| shiftId | VARCHAR(25) | FK → CashDrawerSession, NULL |
| locationId | VARCHAR(25) | FK → Location |
| transactionId | VARCHAR(25) | FK → Transaction, NULL |
| alertSent | BOOLEAN | DEFAULT FALSE |
| alertLevel | VARCHAR(20) | NULL |

### ActiveCart
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| userId | VARCHAR(25) | FK → User, UNIQUE |
| items | TEXT/JSON | NOT NULL |
| subtotal | DECIMAL(10,2) | NOT NULL |
| tax | DECIMAL(10,2) | NOT NULL |
| total | DECIMAL(10,2) | NOT NULL |
| customerName | VARCHAR(100) | NULL |
| status | VARCHAR(20) | DEFAULT 'IDLE' |
| updatedAt | DATETIME | AUTO UPDATE |

---

## 8. LOYALTY & GIFT CARDS

### LoyaltyProgram
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise, UNIQUE |
| name | VARCHAR(100) | DEFAULT 'Rewards' |
| isEnabled | BOOLEAN | DEFAULT TRUE |
| pointsPerDollar | DECIMAL(5,2) | DEFAULT 1 |
| redemptionRatio | DECIMAL(5,4) | DEFAULT 0.01 |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### LoyaltyMember
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| programId | VARCHAR(25) | FK → LoyaltyProgram |
| phone | VARCHAR(20) | NOT NULL |
| email | VARCHAR(255) | NULL |
| name | VARCHAR(100) | NULL |
| pointsBalance | INT | DEFAULT 0 |
| lifetimePoints | INT | DEFAULT 0 |
| lifetimeSpend | DECIMAL(12,2) | DEFAULT 0 |
| masterAccountId | VARCHAR(25) | FK → LoyaltyMasterAccount, NULL |
| enrolledAt | DATETIME | DEFAULT NOW |
| lastActivity | DATETIME | DEFAULT NOW |

### LoyaltyMasterAccount
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| phone | VARCHAR(20) | UNIQUE |
| email | VARCHAR(255) | NULL |
| name | VARCHAR(100) | NULL |
| pooledBalance | INT | DEFAULT 0 |
| lifetimePoints | INT | DEFAULT 0 |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### PointsTransaction
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| programId | VARCHAR(25) | FK → LoyaltyProgram, NULL |
| masterAccountId | VARCHAR(25) | FK → LoyaltyMasterAccount, NULL |
| type | VARCHAR(20) | NOT NULL |
| points | INT | NOT NULL |
| description | VARCHAR(255) | NULL |
| transactionId | VARCHAR(25) | NULL |
| franchiseId | VARCHAR(25) | NULL |
| createdAt | DATETIME | DEFAULT NOW |

### ClientLoyalty
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| clientId | VARCHAR(25) | FK → Client, UNIQUE |
| pointsBalance | INT | DEFAULT 0 |
| lifetimePoints | INT | DEFAULT 0 |
| updatedAt | DATETIME | AUTO UPDATE |

### GiftCard
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| code | VARCHAR(50) | UNIQUE |
| franchiseId | VARCHAR(25) | FK → Franchise |
| initialAmount | DECIMAL(10,2) | NOT NULL |
| currentBalance | DECIMAL(10,2) | NOT NULL |
| purchaserId | VARCHAR(25) | NULL |
| recipientEmail | VARCHAR(255) | NULL |
| isActive | BOOLEAN | DEFAULT TRUE |
| expiresAt | DATETIME | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Discount
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| name | VARCHAR(100) | NOT NULL |
| code | VARCHAR(50) | NULL |
| type | VARCHAR(20) | NOT NULL |
| value | DECIMAL(10,2) | NOT NULL |
| appliesTo | VARCHAR(50) | NOT NULL |
| itemIds | TEXT/JSON | NULL |
| startDate | DATETIME | NULL |
| endDate | DATETIME | NULL |
| isActive | BOOLEAN | DEFAULT TRUE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

---

## 9. MEMBERSHIPS & PACKAGES

### MembershipPlan
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| name | VARCHAR(100) | NOT NULL |
| price | DECIMAL(10,2) | NOT NULL |
| billingInterval | VARCHAR(20) | NOT NULL |
| description | TEXT | NULL |
| discountPercent | DECIMAL(5,2) | DEFAULT 0 |
| includedServices | TEXT/JSON | NULL |
| isActive | BOOLEAN | DEFAULT TRUE |
| createdAt | DATETIME | DEFAULT NOW |

### ClientMembership
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| clientId | VARCHAR(25) | FK → Client |
| planId | VARCHAR(25) | FK → MembershipPlan |
| status | VARCHAR(20) | DEFAULT 'ACTIVE' |
| startDate | DATETIME | DEFAULT NOW |
| nextBillingDate | DATETIME | NOT NULL |
| paymentMethodId | VARCHAR(100) | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### ServicePackage
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| name | VARCHAR(100) | NOT NULL |
| description | TEXT | NULL |
| serviceId | VARCHAR(25) | FK → Service |
| sessionsIncluded | INT | NOT NULL |
| price | DECIMAL(10,2) | NOT NULL |
| validityDays | INT | DEFAULT 365 |
| isActive | BOOLEAN | DEFAULT TRUE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### PackagePurchase
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| packageId | VARCHAR(25) | FK → ServicePackage |
| clientId | VARCHAR(25) | FK → Client |
| sessionsUsed | INT | DEFAULT 0 |
| sessionsRemaining | INT | NOT NULL |
| purchaseDate | DATETIME | DEFAULT NOW |
| expiresAt | DATETIME | NOT NULL |
| transactionId | VARCHAR(25) | NULL |
| createdAt | DATETIME | DEFAULT NOW |

### PackageUsage
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| purchaseId | VARCHAR(25) | FK → PackagePurchase |
| usedAt | DATETIME | DEFAULT NOW |
| appointmentId | VARCHAR(25) | NULL |
| employeeId | VARCHAR(25) | NULL |
| notes | TEXT | NULL |

---

## 10. INVENTORY & SUPPLIERS

### Supplier
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| name | VARCHAR(100) | NOT NULL |
| contactName | VARCHAR(100) | NULL |
| email | VARCHAR(255) | NULL |
| phone | VARCHAR(20) | NULL |
| address | VARCHAR(500) | NULL |
| createdAt | DATETIME | DEFAULT NOW |

### ProductSupplier
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| productId | VARCHAR(25) | FK → Product |
| supplierId | VARCHAR(25) | FK → Supplier |
| cost | DECIMAL(10,2) | NOT NULL |
| sku | VARCHAR(50) | NULL |

### PurchaseOrder
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| locationId | VARCHAR(25) | FK → Location |
| supplierId | VARCHAR(25) | FK → Supplier |
| status | VARCHAR(20) | DEFAULT 'DRAFT' |
| totalCost | DECIMAL(10,2) | NOT NULL |
| expectedDate | DATETIME | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### PurchaseOrderItem
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| purchaseOrderId | VARCHAR(25) | FK → PurchaseOrder |
| productId | VARCHAR(25) | FK → Product |
| quantity | INT | NOT NULL |
| unitCost | DECIMAL(10,2) | NOT NULL |
| totalCost | DECIMAL(10,2) | NOT NULL |

### StockAdjustment
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| productId | VARCHAR(25) | FK → Product |
| locationId | VARCHAR(25) | FK → Location |
| quantity | INT | NOT NULL (+ or -) |
| reason | VARCHAR(50) | NOT NULL |
| notes | TEXT | NULL |
| performedBy | VARCHAR(25) | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |

---

## 11. WORKFORCE & PAYROLL

### TimeEntry
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| userId | VARCHAR(25) | FK → User |
| locationId | VARCHAR(25) | FK → Location |
| clockIn | DATETIME | NOT NULL |
| clockOut | DATETIME | NULL |
| breakDuration | INT | DEFAULT 0 (minutes) |
| totalHours | DECIMAL(5,2) | NULL |
| status | VARCHAR(20) | DEFAULT 'OPEN' |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### CommissionRule
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| name | VARCHAR(100) | NOT NULL |
| servicePercent | DECIMAL(5,2) | NOT NULL |
| productPercent | DECIMAL(5,2) | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |

### CommissionTier
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| employeeId | VARCHAR(25) | FK → User |
| minRevenue | DECIMAL(10,2) | NOT NULL |
| maxRevenue | DECIMAL(10,2) | NULL |
| percentage | DECIMAL(5,4) | NOT NULL |
| tierName | VARCHAR(50) | NULL |
| priority | INT | DEFAULT 0 |
| isActive | BOOLEAN | DEFAULT TRUE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### ServiceCommissionOverride
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| employeeId | VARCHAR(25) | FK → User |
| serviceId | VARCHAR(25) | NOT NULL |
| serviceName | VARCHAR(100) | NULL |
| percentage | DECIMAL(5,4) | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### EmployeePaymentConfig
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| employeeId | VARCHAR(25) | FK → User, UNIQUE |
| paymentType | VARCHAR(50) | DEFAULT 'COMMISSION' |
| defaultCommissionRate | DECIMAL(5,4) | DEFAULT 0.40 |
| usesTieredCommission | BOOLEAN | DEFAULT FALSE |
| baseSalary | DECIMAL(10,2) | NULL |
| salaryPeriod | VARCHAR(20) | NULL |
| useMaxSalaryOrCommission | BOOLEAN | DEFAULT FALSE |
| hourlyRate | DECIMAL(10,2) | NULL |
| useMaxHourlyOrCommission | BOOLEAN | DEFAULT FALSE |
| rentalFee | DECIMAL(10,2) | NULL |
| rentalPeriod | VARCHAR(20) | NULL |
| rentalKeeps100Percent | BOOLEAN | DEFAULT FALSE |
| productCommissionRate | DECIMAL(5,4) | DEFAULT 0.10 |
| useProductCostDeduction | BOOLEAN | DEFAULT FALSE |
| commissionOnDiscountedPrice | BOOLEAN | DEFAULT TRUE |
| newClientBonusEnabled | BOOLEAN | DEFAULT FALSE |
| newClientBonusAmount | DECIMAL(10,2) | DEFAULT 10 |
| cashDiscountEnabled | BOOLEAN | DEFAULT FALSE |
| cashDiscountPercent | DECIMAL(5,2) | DEFAULT 3.5 |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### PayrollRun
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| periodStart | DATETIME | NOT NULL |
| periodEnd | DATETIME | NOT NULL |
| payDate | DATETIME | NULL |
| status | VARCHAR(20) | DEFAULT 'DRAFT' |
| createdBy | VARCHAR(25) | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### PayrollEntry
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| payrollRunId | VARCHAR(25) | FK → PayrollRun |
| employeeId | VARCHAR(25) | FK → User |
| serviceRevenue | DECIMAL(10,2) | DEFAULT 0 |
| productRevenue | DECIMAL(10,2) | DEFAULT 0 |
| totalRevenue | DECIMAL(10,2) | DEFAULT 0 |
| serviceCommission | DECIMAL(10,2) | DEFAULT 0 |
| productCommission | DECIMAL(10,2) | DEFAULT 0 |
| totalCommission | DECIMAL(10,2) | DEFAULT 0 |
| baseSalary | DECIMAL(10,2) | DEFAULT 0 |
| hourlyWages | DECIMAL(10,2) | DEFAULT 0 |
| tips | DECIMAL(10,2) | DEFAULT 0 |
| bonuses | DECIMAL(10,2) | DEFAULT 0 |
| rentalFee | DECIMAL(10,2) | DEFAULT 0 |
| grossPay | DECIMAL(10,2) | DEFAULT 0 |
| hoursWorked | DECIMAL(5,2) | DEFAULT 0 |
| servicesPerformed | INT | DEFAULT 0 |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

---

## 12. MARKETING & SMS

### ReminderSettings
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise, UNIQUE |
| emailEnabled | BOOLEAN | DEFAULT TRUE |
| confirmationEmail | BOOLEAN | DEFAULT TRUE |
| reminder24hEmail | BOOLEAN | DEFAULT TRUE |
| reminder2hEmail | BOOLEAN | DEFAULT TRUE |
| smsEnabled | BOOLEAN | DEFAULT FALSE |
| smsApproved | BOOLEAN | DEFAULT FALSE |
| smsRequestedAt | DATETIME | NULL |
| confirmationSms | BOOLEAN | DEFAULT FALSE |
| reminder24hSms | BOOLEAN | DEFAULT FALSE |
| reminder2hSms | BOOLEAN | DEFAULT FALSE |
| approvalSms | BOOLEAN | DEFAULT TRUE |
| cancellationSms | BOOLEAN | DEFAULT TRUE |
| waitlistSms | BOOLEAN | DEFAULT TRUE |
| twilioAccountSid | VARCHAR(100) | NULL |
| twilioAuthToken | VARCHAR(100) | NULL (encrypted) |
| twilioPhoneNumber | VARCHAR(20) | NULL |
| emailSubject | VARCHAR(255) | DEFAULT 'Appointment Reminder' |
| emailTemplate | TEXT | NULL |
| smsTemplate | TEXT | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### ProviderSmsConfig
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| package1Name | VARCHAR(50) | DEFAULT 'Starter' |
| package1Credits | INT | DEFAULT 100 |
| package1Price | DECIMAL(10,2) | DEFAULT 4.99 |
| package2Name | VARCHAR(50) | DEFAULT 'Growth' |
| package2Credits | INT | DEFAULT 200 |
| package2Price | DECIMAL(10,2) | DEFAULT 8.99 |
| package3Name | VARCHAR(50) | DEFAULT 'Business' |
| package3Credits | INT | DEFAULT 500 |
| package3Price | DECIMAL(10,2) | DEFAULT 19.99 |
| package4Name | VARCHAR(50) | DEFAULT 'Enterprise' |
| package4Credits | INT | DEFAULT 1000 |
| package4Price | DECIMAL(10,2) | DEFAULT 34.99 |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### SmsCredits
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise, UNIQUE |
| creditsRemaining | INT | DEFAULT 0 |
| creditsUsed | INT | DEFAULT 0 |
| lastTopupAt | DATETIME | NULL |
| lastPackage | VARCHAR(50) | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### SmsLog
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | NOT NULL |
| toPhone | VARCHAR(20) | NOT NULL |
| message | TEXT | NOT NULL |
| status | VARCHAR(20) | DEFAULT 'sent' |
| twilioSid | VARCHAR(100) | NULL |
| errorMsg | TEXT | NULL |
| createdAt | DATETIME | DEFAULT NOW |

### SmsMarketingRule
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| name | VARCHAR(100) | NOT NULL |
| ruleType | VARCHAR(50) | NOT NULL |
| isActive | BOOLEAN | DEFAULT TRUE |
| daysInactive | INT | DEFAULT 28 |
| daysInactiveMax | INT | NULL |
| minSpendTotal | DECIMAL(10,2) | NULL |
| maxSpendTotal | DECIMAL(10,2) | NULL |
| minSpendPerVisit | DECIMAL(10,2) | NULL |
| minVisitCount | INT | NULL |
| maxVisitCount | INT | NULL |
| lastServiceId | VARCHAR(25) | NULL |
| anyServiceId | VARCHAR(25) | NULL |
| hasPhone | BOOLEAN | DEFAULT TRUE |
| hasEmail | BOOLEAN | DEFAULT FALSE |
| discountType | VARCHAR(20) | DEFAULT 'PERCENTAGE' |
| discountValue | DECIMAL(10,2) | DEFAULT 10 |
| validityDays | INT | DEFAULT 7 |
| messageTemplate | TEXT | NULL |
| maxSendsPerDay | INT | NULL |
| maxSendsTotal | INT | NULL |
| sentCount | INT | DEFAULT 0 |
| redeemedCount | INT | DEFAULT 0 |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### CustomerPromo
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| clientId | VARCHAR(25) | FK → Client |
| ruleType | VARCHAR(50) | NOT NULL |
| ruleName | VARCHAR(100) | NOT NULL |
| discountType | VARCHAR(20) | NOT NULL |
| discountValue | DECIMAL(10,2) | NOT NULL |
| status | VARCHAR(20) | DEFAULT 'ACTIVE' |
| expiresAt | DATETIME | NOT NULL |
| redeemedAt | DATETIME | NULL |
| excludeFromLoyalty | BOOLEAN | DEFAULT TRUE |
| createdAt | DATETIME | DEFAULT NOW |

### EmailTemplate
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL |
| subject | VARCHAR(255) | NOT NULL |
| body | TEXT | NOT NULL |
| variables | TEXT/JSON | NULL |
| category | VARCHAR(50) | NULL |
| isActive | BOOLEAN | DEFAULT TRUE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

---

## 13. REVIEWS & COMMUNITY

### Review
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| clientId | VARCHAR(25) | FK → Client |
| transactionRef | VARCHAR(25) | NULL |
| rating | INT | NOT NULL (1-5) |
| feedbackTag | VARCHAR(100) | NULL |
| comment | TEXT | NULL |
| locationId | VARCHAR(25) | NULL |
| googleReviewId | VARCHAR(100) | NULL |
| postedToGoogle | BOOLEAN | DEFAULT FALSE |
| redirectedToGoogle | BOOLEAN | DEFAULT FALSE |
| postedAt | DATETIME | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Post
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| title | VARCHAR(255) | NOT NULL |
| content | TEXT | NOT NULL |
| authorId | VARCHAR(25) | FK → User |
| franchiseId | VARCHAR(25) | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Comment
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| content | TEXT | NOT NULL |
| postId | VARCHAR(25) | FK → Post |
| authorId | VARCHAR(25) | FK → User |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Vote
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| postId | VARCHAR(25) | FK → Post |
| userId | VARCHAR(25) | FK → User |
| type | VARCHAR(10) | NOT NULL |

### UserBadge
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| userId | VARCHAR(25) | FK → User |
| name | VARCHAR(100) | NOT NULL |
| icon | VARCHAR(50) | NULL |
| awardedAt | DATETIME | DEFAULT NOW |

---

## 14. SUPPORT & CHAT

### ChatConversation
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| customerName | VARCHAR(100) | NULL |
| customerEmail | VARCHAR(255) | NULL |
| customerPhone | VARCHAR(20) | NULL |
| clientId | VARCHAR(25) | FK → Client, NULL |
| status | VARCHAR(20) | DEFAULT 'OPEN' |
| assignedToId | VARCHAR(25) | FK → User, NULL |
| lastMessageAt | DATETIME | NULL |
| unreadCount | INT | DEFAULT 0 |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### ChatMessage
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| conversationId | VARCHAR(25) | FK → ChatConversation |
| senderType | VARCHAR(20) | NOT NULL |
| senderId | VARCHAR(25) | FK → User, NULL |
| content | TEXT | NOT NULL |
| isRead | BOOLEAN | DEFAULT FALSE |
| createdAt | DATETIME | DEFAULT NOW |

### SupportChat
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| userId | VARCHAR(25) | FK → User |
| status | VARCHAR(20) | DEFAULT 'OPEN' |
| priority | VARCHAR(20) | DEFAULT 'MEDIUM' |
| subject | VARCHAR(255) | NULL |
| assigneeId | VARCHAR(25) | FK → User, NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |
| closedAt | DATETIME | NULL |

### SupportMessage
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| chatId | VARCHAR(25) | FK → SupportChat |
| content | TEXT | NOT NULL |
| sender | VARCHAR(20) | NOT NULL |
| senderId | VARCHAR(25) | NULL |
| readAt | DATETIME | NULL |
| createdAt | DATETIME | DEFAULT NOW |

---

## 15. CRM & SALES

### Lead
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchisorId | VARCHAR(25) | FK → Franchisor |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL |
| phone | VARCHAR(20) | NULL |
| company | VARCHAR(100) | NULL |
| city | VARCHAR(100) | NULL |
| state | VARCHAR(50) | NULL |
| status | VARCHAR(50) | DEFAULT 'NEW' |
| source | VARCHAR(50) | NULL |
| assignedTo | VARCHAR(25) | NULL |
| estimatedValue | FLOAT | NULL |
| proposedFee | FLOAT | NULL |
| score | INT | NULL (0-100) |
| rating | VARCHAR(20) | NULL |
| probability | FLOAT | NULL (0-100) |
| expectedClose | DATETIME | NULL |
| competitors | TEXT/JSON | NULL |
| painPoints | TEXT/JSON | NULL |
| decisionMakers | TEXT/JSON | NULL |
| lastActivityAt | DATETIME | NULL |
| emailOpens | INT | DEFAULT 0 |
| emailClicks | INT | DEFAULT 0 |
| callCount | INT | DEFAULT 0 |
| meetingCount | INT | DEFAULT 0 |
| lastContact | DATETIME | NULL |
| nextFollowUp | DATETIME | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Note
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| leadId | VARCHAR(25) | FK → Lead |
| content | TEXT | NOT NULL |
| category | VARCHAR(50) | DEFAULT 'GENERAL' |
| isPinned | BOOLEAN | DEFAULT FALSE |
| createdBy | VARCHAR(25) | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Activity
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| leadId | VARCHAR(25) | FK → Lead |
| type | VARCHAR(50) | NOT NULL |
| subject | VARCHAR(255) | NOT NULL |
| notes | TEXT | NULL |
| duration | INT | NULL (minutes) |
| outcome | VARCHAR(50) | NULL |
| createdBy | VARCHAR(25) | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Task
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| leadId | VARCHAR(25) | FK → Lead |
| title | VARCHAR(255) | NOT NULL |
| description | TEXT | NULL |
| dueDate | DATETIME | NOT NULL |
| priority | VARCHAR(20) | DEFAULT 'MEDIUM' |
| status | VARCHAR(20) | DEFAULT 'PENDING' |
| assignedTo | VARCHAR(25) | NOT NULL |
| completedAt | DATETIME | NULL |
| createdBy | VARCHAR(25) | NOT NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### Territory
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchisorId | VARCHAR(25) | FK → Franchisor |
| name | VARCHAR(100) | NOT NULL |
| states | TEXT/JSON | NOT NULL |
| isAvailable | BOOLEAN | DEFAULT TRUE |
| price | DECIMAL(10,2) | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### ExpansionRequest
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseeId | VARCHAR(25) | FK → User |
| franchiseId | VARCHAR(25) | FK → Franchise |
| proposedName | VARCHAR(255) | NOT NULL |
| proposedAddress | VARCHAR(500) | NOT NULL |
| notes | TEXT | NULL |
| status | VARCHAR(50) | DEFAULT 'PENDING' |
| responseNotes | TEXT | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

---

## 16. COMPLIANCE & AUDIT

### AuditLog
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| entityType | VARCHAR(50) | NOT NULL |
| entityId | VARCHAR(25) | NOT NULL |
| action | VARCHAR(50) | NOT NULL |
| userId | VARCHAR(25) | NOT NULL |
| userEmail | VARCHAR(255) | NULL |
| userRole | VARCHAR(50) | NULL |
| changes | TEXT/JSON | NULL |
| ipAddress | VARCHAR(50) | NULL |
| userAgent | TEXT | NULL |
| status | VARCHAR(20) | DEFAULT 'SUCCESS' |
| errorMessage | TEXT | NULL |
| createdAt | DATETIME | DEFAULT NOW |

### RateLimitRecord
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| identifier | VARCHAR(255) | NOT NULL |
| endpoint | VARCHAR(255) | NOT NULL |
| count | INT | DEFAULT 1 |
| windowStart | DATETIME | DEFAULT NOW |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### ClientWaiver
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | NOT NULL |
| clientId | VARCHAR(25) | NULL |
| appointmentId | VARCHAR(25) | NULL |
| customerName | VARCHAR(100) | NOT NULL |
| customerEmail | VARCHAR(255) | NOT NULL |
| customerPhone | VARCHAR(20) | NULL |
| waiverVersion | VARCHAR(20) | DEFAULT '1.0' |
| waiverText | TEXT | NOT NULL |
| signatureName | VARCHAR(100) | NOT NULL |
| signatureDate | DATETIME | DEFAULT NOW |
| consentGiven | BOOLEAN | DEFAULT TRUE |
| ipAddress | VARCHAR(50) | NULL |
| userAgent | TEXT | NULL |
| isActive | BOOLEAN | DEFAULT TRUE |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### FeatureRequest
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchisorId | VARCHAR(25) | FK → Franchisor |
| featureKey | VARCHAR(100) | NOT NULL |
| status | VARCHAR(50) | DEFAULT 'PENDING' |
| requestNotes | TEXT | NULL |
| responseNotes | TEXT | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

---

## 17. FINANCIAL

### RoyaltyConfig
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchisorId | VARCHAR(25) | FK → Franchisor, UNIQUE |
| percentage | DECIMAL(5,2) | NOT NULL |
| minimumMonthlyFee | DECIMAL(10,2) | NULL |
| calculationPeriod | VARCHAR(20) | DEFAULT 'MONTHLY' |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### RoyaltyRecord
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise |
| periodStart | DATETIME | NOT NULL |
| periodEnd | DATETIME | NOT NULL |
| grossRevenue | DECIMAL(12,2) | NOT NULL |
| royaltyAmount | DECIMAL(10,2) | NOT NULL |
| status | VARCHAR(20) | DEFAULT 'PENDING' |
| paidAt | DATETIME | NULL |
| notes | TEXT | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

### SplitPayoutConfig
| Field | Type | Constraints |
|-------|------|-------------|
| id | VARCHAR(25) | PRIMARY KEY |
| franchiseId | VARCHAR(25) | FK → Franchise, UNIQUE |
| isEnabled | BOOLEAN | DEFAULT FALSE |
| royaltyPercent | DECIMAL(5,2) | NOT NULL |
| marketingPercent | DECIMAL(5,2) | DEFAULT 0 |
| franchisorAccountId | VARCHAR(100) | NULL |
| franchiseeAccountId | VARCHAR(100) | NULL |
| createdAt | DATETIME | DEFAULT NOW |
| updatedAt | DATETIME | AUTO UPDATE |

---

## Summary

| Category | Tables |
|----------|--------|
| Permissions | 3 |
| Users & Auth | 2 |
| Franchise Hierarchy | 5 |
| Services & Products | 5 |
| Clients | 3 |
| Appointments & Scheduling | 6 |
| Transactions & Payments | 7 |
| Loyalty & Gift Cards | 6 |
| Memberships & Packages | 4 |
| Inventory & Suppliers | 5 |
| Workforce & Payroll | 7 |
| Marketing & SMS | 7 |
| Reviews & Community | 5 |
| Support & Chat | 4 |
| CRM & Sales | 5 |
| Compliance & Audit | 4 |
| Financial | 3 |
| **TOTAL** | **76 Tables** |

---

**File Location**: `prisma/schema.prisma`  
**Database**: SQLite  
**ORM**: Prisma Client  
**Schema Lines**: 2,133  
