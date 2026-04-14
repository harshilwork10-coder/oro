-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PROVIDER', 'ADMIN', 'FRANCHISOR', 'FRANCHISEE', 'OWNER', 'MANAGER', 'SHIFT_SUPERVISOR', 'EMPLOYEE', 'SUB_FRANCHISEE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED', 'VOIDED', 'PARTIALLY_REFUNDED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'SPLIT', 'GIFT_CARD');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'REFUND', 'VOID', 'CORRECTION', 'TIP_ADJUST', 'PAYIN', 'PAYOUT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "TaxTreatment" AS ENUM ('TAXABLE', 'EXEMPT', 'REDUCED');

-- CreateEnum
CREATE TYPE "TaxRoundingRule" AS ENUM ('PER_LINE', 'PER_INVOICE');

-- CreateEnum
CREATE TYPE "OffboardingAccountType" AS ENUM ('BRAND_FRANCHISOR', 'FRANCHISE', 'MULTI_LOCATION');

-- CreateEnum
CREATE TYPE "OffboardingStatus" AS ENUM ('SUSPENDED', 'OFFBOARDING_EXPORT', 'OFFBOARDING_ANONYMIZE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED', 'PENDING_DELETION', 'DELETED', 'PAYMENT_DUE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "StationPaymentMode" AS ENUM ('DEDICATED', 'CASH_ONLY');

-- CreateEnum
CREATE TYPE "PairingStatus" AS ENUM ('UNPAIRED', 'PAIRED');

-- CreateEnum
CREATE TYPE "TrustedDeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "DisplayMode" AS ENUM ('SECOND_SCREEN', 'POLE_DISPLAY', 'REMOTE_BROWSER', 'ANDROID_DISPLAY', 'VENDOR_INTEGRATED', 'NONE');

-- CreateEnum
CREATE TYPE "TerminalType" AS ENUM ('PAX', 'CLOVER', 'STRIPE_READER');

-- CreateEnum
CREATE TYPE "CashDrawerStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoyaltyRecordStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID');

-- CreateEnum
CREATE TYPE "OwnerSignalType" AS ENUM ('CASH_VARIANCE', 'DEPOSIT_OVERDUE', 'VOID_SPIKE', 'REFUND_SPIKE', 'LOW_STOCK_CRITICAL', 'SALES_DROP', 'ID_CHECK_MISSED', 'EMPLOYEE_RISK_HIGH', 'DEVICE_OFFLINE', 'TRANSFER_DISCREPANCY');

-- CreateEnum
CREATE TYPE "OwnerIssueCategory" AS ENUM ('CASH', 'INVENTORY', 'SALES', 'COMPLIANCE', 'EMPLOYEE', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "OwnerIssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "OwnerIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'SNOOZED', 'RESOLVED', 'ESCALATED', 'REOPENED');

-- CreateEnum
CREATE TYPE "OwnerIssueEventType" AS ENUM ('CREATED', 'ACKNOWLEDGED', 'ASSIGNED', 'SNOOZED', 'RESOLVED', 'ESCALATED', 'NOTE_ADDED', 'REOPENED', 'PRIORITY_CHANGED', 'DUE_CHANGED');

-- CreateEnum
CREATE TYPE "OwnerIssueResolvedReason" AS ENUM ('ROOT_CAUSE_FIXED', 'FALSE_POSITIVE', 'DUPLICATE', 'WONT_FIX');

-- CreateEnum
CREATE TYPE "OwnerSignalEntityType" AS ENUM ('USER', 'SKU', 'DRAWER', 'SHIFT', 'DEVICE', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "OwnerIssueSourceType" AS ENUM ('OWNER_SIGNAL', 'STORE_EXCEPTION', 'SYSTEM_ALERT', 'COMPUTED');

-- CreateEnum
CREATE TYPE "OwnerDigestType" AS ENUM ('MORNING', 'DAILY_RECAP', 'WEEKLY', 'CRITICAL_ALERT');

-- CreateEnum
CREATE TYPE "OwnerDigestChannel" AS ENUM ('DASHBOARD', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "OwnerDigestStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'DELIVERED', 'OPENED');

-- CreateEnum
CREATE TYPE "OwnerRecommendationScope" AS ENUM ('OWNER', 'DELEGATABLE', 'AUTO_CANDIDATE');

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "defaultValue" BOOLEAN NOT NULL DEFAULT false,
    "targetVerticals" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagOverride" (
    "id" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL,
    "reason" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerSmsConfigId" TEXT,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "providerId" TEXT,
    "franchisorId" TEXT,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranchisorMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FranchisorMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleDefaultPermission" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RoleDefaultPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLocationAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "accessRole" TEXT NOT NULL DEFAULT 'VIEW',
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "canExportReports" BOOLEAN NOT NULL DEFAULT false,
    "canViewFinancials" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLocationAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT,
    "pin" TEXT,
    "image" TEXT,
    "dailyGoal" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "providerId" TEXT,
    "customPermissions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedTermsAt" TIMESTAMP(3),
    "acceptedTermsVersion" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaBackupCodes" TEXT,
    "mfaSetupAt" TIMESTAMP(3),
    "canAddServices" BOOLEAN NOT NULL DEFAULT false,
    "canAddProducts" BOOLEAN NOT NULL DEFAULT false,
    "canManageInventory" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "canProcessRefunds" BOOLEAN NOT NULL DEFAULT false,
    "canManageSchedule" BOOLEAN NOT NULL DEFAULT false,
    "canManageEmployees" BOOLEAN NOT NULL DEFAULT false,
    "canSetOwnPrices" BOOLEAN NOT NULL DEFAULT false,
    "canApplyDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "employeeDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "employeeDiscountPct" DECIMAL(5,2),
    "maxDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "maxDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "requiresTimeClock" BOOLEAN NOT NULL DEFAULT false,
    "canManageShifts" BOOLEAN NOT NULL DEFAULT false,
    "canClockIn" BOOLEAN NOT NULL DEFAULT true,
    "canClockOut" BOOLEAN NOT NULL DEFAULT true,
    "hasPulseAccess" BOOLEAN NOT NULL DEFAULT false,
    "pulseLocationIds" TEXT,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "assignedStationId" TEXT,
    "commissionRuleId" TEXT,
    "staffSlug" TEXT,
    "bio" TEXT,
    "specialties" TEXT,
    "profilePhotoUrl" TEXT,
    "acceptingClients" BOOLEAN NOT NULL DEFAULT true,
    "currentLocationId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Franchise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "region" TEXT,
    "customerId" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "ssn" TEXT,
    "fein" TEXT,
    "routingNumber" TEXT,
    "accountNumber" TEXT,
    "voidCheckUrl" TEXT,
    "driverLicenseUrl" TEXT,
    "feinLetterUrl" TEXT,
    "franchisorId" TEXT NOT NULL,
    "subFranchiseeId" TEXT,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "suspendedBy" TEXT,
    "scheduledDeletionAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "dataExportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Franchise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FranchiseSettings" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "storeLogo" TEXT,
    "storeDisplayName" TEXT,
    "storeAddress" TEXT,
    "storeAddress2" TEXT,
    "storeCity" TEXT,
    "storeState" TEXT,
    "storeZip" TEXT,
    "storePhone" TEXT,
    "receiptHeader" TEXT,
    "receiptFooter" TEXT,
    "primaryColor" TEXT,
    "pricingModel" TEXT NOT NULL DEFAULT 'DUAL_PRICING',
    "cardSurchargeType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "cardSurcharge" DECIMAL(7,4) NOT NULL DEFAULT 3.99,
    "showDualPricing" BOOLEAN NOT NULL DEFAULT true,
    "taxRate" DECIMAL(7,4) NOT NULL DEFAULT 0.0825,
    "enablePackages" BOOLEAN NOT NULL DEFAULT true,
    "enableResources" BOOLEAN NOT NULL DEFAULT false,
    "enableClientPhotos" BOOLEAN NOT NULL DEFAULT false,
    "enableRecurringBooking" BOOLEAN NOT NULL DEFAULT true,
    "promoStackingMode" TEXT NOT NULL DEFAULT 'BEST_ONLY',
    "maxDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "receiptPrintMode" TEXT NOT NULL DEFAULT 'ALL',
    "openDrawerOnCash" BOOLEAN NOT NULL DEFAULT true,
    "receiptTemplate" TEXT,
    "enableOnlineBooking" BOOLEAN NOT NULL DEFAULT true,
    "enableAddOnServices" BOOLEAN NOT NULL DEFAULT true,
    "enableGroupBooking" BOOLEAN NOT NULL DEFAULT false,
    "enableWaitlist" BOOLEAN NOT NULL DEFAULT true,
    "enableWaitlistAutoFill" BOOLEAN NOT NULL DEFAULT false,
    "enablePrepayment" BOOLEAN NOT NULL DEFAULT false,
    "prepaymentType" TEXT NOT NULL DEFAULT 'FULL',
    "prepaymentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "enableNoShowCharge" BOOLEAN NOT NULL DEFAULT false,
    "noShowFeeType" TEXT NOT NULL DEFAULT 'FLAT',
    "noShowFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 25,
    "enableSmsReminders" BOOLEAN NOT NULL DEFAULT false,
    "enableReviewBooster" BOOLEAN NOT NULL DEFAULT false,
    "enableMarketingCampaigns" BOOLEAN NOT NULL DEFAULT false,
    "enableAutoPayroll" BOOLEAN NOT NULL DEFAULT false,
    "enableRentCollection" BOOLEAN NOT NULL DEFAULT false,
    "enableSmartRebooking" BOOLEAN NOT NULL DEFAULT false,
    "enableBarberProfiles" BOOLEAN NOT NULL DEFAULT true,
    "enableIndividualLinks" BOOLEAN NOT NULL DEFAULT true,
    "retentionConfig" TEXT,
    "voidLimitPerDay" DECIMAL(12,2),
    "refundLimitPerDay" DECIMAL(12,2),
    "requireManagerPinAbove" DECIMAL(12,2),
    "taxReceiptMode" TEXT NOT NULL DEFAULT 'SINGLE_LINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FranchiseSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "confirmationEmail" BOOLEAN NOT NULL DEFAULT true,
    "reminder24hEmail" BOOLEAN NOT NULL DEFAULT true,
    "reminder2hEmail" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsApproved" BOOLEAN NOT NULL DEFAULT false,
    "smsRequestedAt" TIMESTAMP(3),
    "confirmationSms" BOOLEAN NOT NULL DEFAULT false,
    "reminder24hSms" BOOLEAN NOT NULL DEFAULT false,
    "reminder2hSms" BOOLEAN NOT NULL DEFAULT false,
    "approvalSms" BOOLEAN NOT NULL DEFAULT true,
    "cancellationSms" BOOLEAN NOT NULL DEFAULT true,
    "waitlistSms" BOOLEAN NOT NULL DEFAULT true,
    "twilioAccountSid" TEXT,
    "twilioAuthToken" TEXT,
    "twilioPhoneNumber" TEXT,
    "emailSubject" TEXT NOT NULL DEFAULT 'Appointment Reminder',
    "emailTemplate" TEXT,
    "smsTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSmsConfig" (
    "id" TEXT NOT NULL,
    "package1Name" TEXT NOT NULL DEFAULT 'Starter',
    "package1Credits" INTEGER NOT NULL DEFAULT 100,
    "package1Price" DECIMAL(65,30) NOT NULL DEFAULT 4.99,
    "package2Name" TEXT NOT NULL DEFAULT 'Growth',
    "package2Credits" INTEGER NOT NULL DEFAULT 200,
    "package2Price" DECIMAL(65,30) NOT NULL DEFAULT 8.99,
    "package3Name" TEXT NOT NULL DEFAULT 'Business',
    "package3Credits" INTEGER NOT NULL DEFAULT 500,
    "package3Price" DECIMAL(65,30) NOT NULL DEFAULT 19.99,
    "package4Name" TEXT NOT NULL DEFAULT 'Enterprise',
    "package4Credits" INTEGER NOT NULL DEFAULT 1000,
    "package4Price" DECIMAL(65,30) NOT NULL DEFAULT 34.99,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderSmsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCredits" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "creditsRemaining" INTEGER NOT NULL DEFAULT 0,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastTopupAt" TIMESTAMP(3),
    "lastPackage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsCredits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "twilioSid" TEXT,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMarketingRule" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "daysInactive" INTEGER DEFAULT 28,
    "daysInactiveMax" INTEGER,
    "minSpendTotal" DECIMAL(65,30),
    "maxSpendTotal" DECIMAL(65,30),
    "minSpendPerVisit" DECIMAL(65,30),
    "minVisitCount" INTEGER,
    "maxVisitCount" INTEGER,
    "lastServiceId" TEXT,
    "anyServiceId" TEXT,
    "hasPhone" BOOLEAN NOT NULL DEFAULT true,
    "hasEmail" BOOLEAN NOT NULL DEFAULT false,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "validityDays" INTEGER NOT NULL DEFAULT 7,
    "messageTemplate" TEXT,
    "maxSendsPerDay" INTEGER,
    "maxSendsTotal" INTEGER,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsMarketingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPromo" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "excludeFromLoyalty" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPromo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "franchiseId" TEXT NOT NULL,
    "franchisorId" TEXT,
    "franchiseeBusinessId" TEXT,
    "provisioningStatus" TEXT NOT NULL DEFAULT 'PROVISIONING_PENDING',
    "canCustomizePricing" BOOLEAN NOT NULL DEFAULT false,
    "setupCode" TEXT,
    "voidCheckUrl" TEXT,
    "ownerId" TEXT,
    "processorName" TEXT,
    "processorMID" TEXT,
    "processorTID" TEXT,
    "processorVAR" TEXT,
    "paxTerminalIP" TEXT,
    "paxTerminalPort" TEXT NOT NULL DEFAULT '10009',
    "googlePlaceId" TEXT,
    "showInDirectory" BOOLEAN NOT NULL DEFAULT false,
    "publicName" TEXT,
    "publicDescription" TEXT,
    "publicPhone" TEXT,
    "businessType" TEXT NOT NULL DEFAULT 'RETAIL',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "operatingHours" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "publicLogoUrl" TEXT,
    "publicBannerUrl" TEXT,
    "bottleDepositEnabled" BOOLEAN NOT NULL DEFAULT false,
    "bottleDepositAmount" DECIMAL(6,2),
    "storeHours" TEXT,
    "holidays" TEXT,
    "pulseStoreCode" TEXT,
    "themeId" TEXT NOT NULL DEFAULT 'classic_oro',
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "qrTokenSalt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosRegisterLayout" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosRegisterLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PulseDeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT,
    "tokenHash" TEXT NOT NULL,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIP" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PulseDeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trainingMode" BOOLEAN NOT NULL DEFAULT false,
    "paymentMode" "StationPaymentMode" NOT NULL DEFAULT 'CASH_ONLY',
    "dedicatedTerminalId" TEXT,
    "pairingCode" TEXT,
    "pairingCodeExpiresAt" TIMESTAMP(3),
    "pairingCodeUsedAt" TIMESTAMP(3),
    "pairingStatus" "PairingStatus" NOT NULL DEFAULT 'UNPAIRED',
    "pairedDeviceId" TEXT,
    "pairedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3),
    "isTrusted" BOOLEAN NOT NULL DEFAULT false,
    "currentUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StationDisplayProfile" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "displayMode" "DisplayMode" NOT NULL DEFAULT 'NONE',
    "hardwareIdentifier" TEXT,
    "driver" TEXT,
    "protocolSettings" JSONB,
    "fallbackMode" "DisplayMode" NOT NULL DEFAULT 'REMOTE_BROWSER',
    "lastConnectedAt" TIMESTAMP(3),
    "lastConnectionError" TEXT,
    "isAutoDetected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StationDisplayProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustedDevice" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT,
    "userAgent" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIp" TEXT,
    "status" "TrustedDeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTerminal" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "terminalType" "TerminalType" NOT NULL DEFAULT 'PAX',
    "terminalIP" TEXT NOT NULL,
    "terminalPort" TEXT NOT NULL DEFAULT '10009',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpansionRequest" (
    "id" TEXT NOT NULL,
    "franchiseeId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "proposedName" TEXT NOT NULL,
    "proposedAddress" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpansionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalServiceCategory" (
    "id" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalService" (
    "id" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "priceMode" TEXT NOT NULL DEFAULT 'FIXED',
    "tierShortPrice" DECIMAL(12,2),
    "tierMediumPrice" DECIMAL(12,2),
    "tierLongPrice" DECIMAL(12,2),
    "categoryId" TEXT,
    "commissionable" BOOLEAN NOT NULL DEFAULT true,
    "taxTreatmentOverride" TEXT,
    "isAddOn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationServiceOverride" (
    "id" TEXT NOT NULL,
    "globalServiceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "duration" INTEGER,
    "price" DECIMAL(12,2),
    "cashPrice" DECIMAL(12,2),
    "cardPrice" DECIMAL(12,2),
    "tierShortPrice" DECIMAL(12,2),
    "tierMediumPrice" DECIMAL(12,2),
    "tierLongPrice" DECIMAL(12,2),
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationServiceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalProduct" (
    "id" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultPrice" DECIMAL(12,2) NOT NULL,
    "defaultCost" DECIMAL(12,2),
    "sku" TEXT,
    "category" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedUPCProduct" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "description" TEXT,
    "size" TEXT,
    "imageUrl" TEXT,
    "avgPrice" DECIMAL(12,2),
    "contributorCount" INTEGER NOT NULL DEFAULT 1,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalSource" TEXT,
    "contributedByUserId" TEXT,
    "contributedByFranchiseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedUPCProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiedCategory" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnifiedCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PRODUCT',
    "isBundle" BOOLEAN NOT NULL DEFAULT false,
    "bundleComponents" TEXT,
    "isMatrix" BOOLEAN NOT NULL DEFAULT false,
    "parentItemId" TEXT,
    "variantAttributes" TEXT,
    "categoryId" TEXT,
    "duration" INTEGER,
    "requiresDeposit" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" DECIMAL(12,2),
    "barcode" TEXT,
    "sku" TEXT,
    "stock" INTEGER,
    "cost" DECIMAL(12,2),
    "reorderPoint" INTEGER,
    "brand" TEXT,
    "size" TEXT,
    "preparationTime" INTEGER,
    "calories" INTEGER,
    "allergens" TEXT,
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
    "minimumAge" INTEGER,
    "isEbtEligible" BOOLEAN NOT NULL DEFAULT false,
    "isWicEligible" BOOLEAN NOT NULL DEFAULT false,
    "isTobacco" BOOLEAN NOT NULL DEFAULT false,
    "isAlcohol" BOOLEAN NOT NULL DEFAULT false,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" DECIMAL(7,4),
    "taxGroupOverrideId" TEXT,
    "priceLocked" BOOLEAN NOT NULL DEFAULT false,
    "msrp" DECIMAL(12,2),
    "overrideMarkup" DECIMAL(7,4),
    "minSellPrice" DECIMAL(12,2),
    "isWeighted" BOOLEAN NOT NULL DEFAULT false,
    "pricePerUnit" DECIMAL(12,4),
    "unitOfMeasure" TEXT,
    "parLevel" INTEGER,
    "autoReorderQty" INTEGER,
    "preferredSupplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLineItem" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "cashPrice" DECIMAL(65,30),
    "cardPrice" DECIMAL(65,30),
    "categoryId" TEXT,
    "franchiseId" TEXT NOT NULL,
    "globalServiceId" TEXT,
    "isAddOn" BOOLEAN NOT NULL DEFAULT false,
    "taxTreatmentOverride" "TaxTreatment",

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeService" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "duration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "liabilitySigned" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyJoined" BOOLEAN NOT NULL DEFAULT false,
    "allergies" TEXT,
    "preferences" TEXT,
    "internalNotes" TEXT,
    "vipStatus" BOOLEAN NOT NULL DEFAULT false,
    "photoConsent" BOOLEAN NOT NULL DEFAULT false,
    "photoConsentDate" TIMESTAMP(3),
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "exemptCertificateNumber" TEXT,
    "exemptCertificateExpiry" TIMESTAMP(3),
    "hasStoreAccount" BOOLEAN NOT NULL DEFAULT false,
    "storeAccountBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "storeAccountLimit" DECIMAL(65,30) NOT NULL DEFAULT 500,
    "storeAccountApprovedBy" TEXT,
    "storeAccountApprovedAt" TIMESTAMP(3),
    "franchiseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "resourceId" TEXT,
    "recurringId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'POS',
    "groupBookingId" TEXT,
    "groupPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
    "minimumAge" INTEGER,
    "isEbtEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(65,30) NOT NULL,
    "cashPrice" DECIMAL(65,30),
    "cardPrice" DECIMAL(65,30),
    "cost" DECIMAL(65,30),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "categoryId" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reorderPoint" INTEGER,
    "minStock" INTEGER,
    "maxStock" INTEGER,
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
    "minimumAge" INTEGER,
    "brand" TEXT,
    "vendor" TEXT,
    "size" TEXT,
    "productType" TEXT,
    "isEbtEligible" BOOLEAN NOT NULL DEFAULT false,
    "wicEligible" BOOLEAN NOT NULL DEFAULT false,
    "isTobacco" BOOLEAN NOT NULL DEFAULT false,
    "plu" TEXT,
    "soldByWeight" BOOLEAN NOT NULL DEFAULT false,
    "alcoholType" TEXT,
    "volumeMl" INTEGER,
    "abvPercent" DECIMAL(65,30),
    "unitsPerCase" INTEGER,
    "casePrice" DECIMAL(65,30),
    "sellByCase" BOOLEAN NOT NULL DEFAULT false,
    "stockCases" INTEGER NOT NULL DEFAULT 0,
    "globalProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taxTreatmentOverride" "TaxTreatment",

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagAlongItem" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagAlongItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "type" "TransactionType" NOT NULL DEFAULT 'SALE',
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT,
    "employeeId" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tip" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cardFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "splitTenders" TEXT,
    "processingPlan" TEXT,
    "subtotalCash" DECIMAL(12,2),
    "subtotalCard" DECIMAL(12,2),
    "taxCash" DECIMAL(12,2),
    "taxCard" DECIMAL(12,2),
    "totalCash" DECIMAL(12,2),
    "totalCard" DECIMAL(12,2),
    "chargedMode" TEXT,
    "cashAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cardAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "gatewayTxId" TEXT,
    "authCode" TEXT,
    "cardLast4" TEXT,
    "cardType" TEXT,
    "captureStatus" TEXT,
    "settledAt" TIMESTAMP(3),
    "settlementBatch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "source" TEXT NOT NULL DEFAULT 'WEB_POS',
    "voidedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "correctionType" TEXT,
    "correctionReasonCode" TEXT,
    "correctionApprovedBy" TEXT,
    "correctionApprovedAt" TIMESTAMP(3),
    "cashDrawerSessionId" TEXT,
    "originalTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLineItem" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "serviceId" TEXT,
    "staffId" TEXT,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "cashUnitPrice" DECIMAL(12,2),
    "cardUnitPrice" DECIMAL(12,2),
    "cashLineTotal" DECIMAL(12,2),
    "cardLineTotal" DECIMAL(12,2),
    "lineChargedMode" TEXT,
    "serviceNameSnapshot" TEXT,
    "productNameSnapshot" TEXT,
    "priceCharged" DECIMAL(12,2),
    "discountAllocated" DECIMAL(12,2),
    "taxAllocated" DECIMAL(12,2),
    "tipAllocated" DECIMAL(12,2),
    "commissionSplitUsed" DECIMAL(5,2),
    "commissionAmount" DECIMAL(12,2),
    "ownerAmount" DECIMAL(12,2),
    "businessDate" TIMESTAMP(3),
    "lineItemStatus" TEXT DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionTaxLine" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "taxName" TEXT NOT NULL,
    "taxRate" DECIMAL(7,4) NOT NULL,
    "taxableAmount" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "jurisdictionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionTaxLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoyaltyConfig" (
    "id" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "minimumMonthlyFee" DECIMAL(12,2),
    "calculationPeriod" TEXT NOT NULL DEFAULT 'MONTHLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoyaltyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoyaltyRecord" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossRevenue" DECIMAL(12,2) NOT NULL,
    "royaltyAmount" DECIMAL(12,2) NOT NULL,
    "status" "RoyaltyRecordStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoyaltyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveCart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "customerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IDLE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Terminal" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Terminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitPayoutConfig" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "royaltyPercent" DECIMAL(65,30) NOT NULL,
    "marketingPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "franchisorAccountId" TEXT,
    "franchiseeAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitPayoutConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "includedServices" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMembership" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "paymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "externalVendorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSupplier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "cost" DECIMAL(65,30) NOT NULL,
    "sku" TEXT,
    "lastInvoiceDate" TIMESTAMP(3),
    "lastUpcSeen" TEXT,

    CONSTRAINT "ProductSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalCost" DECIMAL(65,30) NOT NULL,
    "expectedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "sourceId" TEXT,
    "uom" TEXT,
    "baseUnitsDelta" INTEGER,
    "previousStock" INTEGER,
    "newStock" INTEGER,
    "performedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "totalHours" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "servicePercent" DECIMAL(65,30) NOT NULL,
    "productPercent" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLoyalty" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientLoyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "initialAmount" DECIMAL(65,30) NOT NULL,
    "currentBalance" DECIMAL(65,30) NOT NULL,
    "purchaserId" TEXT,
    "recipientEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDrawerSession" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "startingCash" DECIMAL(12,2) NOT NULL,
    "endingCash" DECIMAL(12,2),
    "expectedCash" DECIMAL(12,2),
    "variance" DECIMAL(12,2),
    "status" "CashDrawerStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashDrawerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDrop" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "droppedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspendedTransaction" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cartData" JSONB NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuspendedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "itemIds" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountType" TEXT NOT NULL DEFAULT 'PERCENT',
    "discountValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "requiredQty" INTEGER,
    "getQty" INTEGER,
    "priceTiers" TEXT,
    "minSpend" DECIMAL(65,30),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "timeStart" TEXT,
    "timeEnd" TEXT,
    "daysOfWeek" TEXT,
    "appliesTo" TEXT NOT NULL DEFAULT 'ALL',
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxUsesPerTransaction" INTEGER,
    "promoCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionProduct" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "categoryId" TEXT,
    "productId" TEXT,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PromotionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "franchiseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "transactionRef" TEXT,
    "rating" INTEGER NOT NULL,
    "feedbackTag" TEXT,
    "comment" TEXT,
    "locationId" TEXT,
    "googleReviewId" TEXT,
    "postedToGoogle" BOOLEAN NOT NULL DEFAULT false,
    "redirectedToGoogle" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Franchisor" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "providerId" TEXT,
    "name" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "businessType" TEXT NOT NULL DEFAULT 'MULTI_LOCATION_OWNER',
    "industryType" TEXT NOT NULL,
    "brandCode" TEXT,
    "brandSettings" TEXT,
    "lockPricing" BOOLEAN NOT NULL DEFAULT false,
    "lockServices" BOOLEAN NOT NULL DEFAULT false,
    "lockCommission" BOOLEAN NOT NULL DEFAULT false,
    "lockProducts" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "phone" TEXT,
    "corpName" TEXT,
    "corpAddress" TEXT,
    "ssn" TEXT,
    "fein" TEXT,
    "ss4" TEXT,
    "ebt" TEXT,
    "documents" TEXT,
    "documentsLater" BOOLEAN,
    "processingType" TEXT,
    "routingNumber" TEXT,
    "accountNumber" TEXT,
    "voidCheckUrl" TEXT,
    "driverLicenseUrl" TEXT,
    "feinLetterUrl" TEXT,
    "brandColorPrimary" TEXT,
    "brandColorSecondary" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "domain" TEXT,
    "qrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "qrSubdomain" TEXT,
    "qrWelcomeText" TEXT,
    "qrThemeJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "integrations" TEXT,
    "dealerBrandingId" TEXT,

    CONSTRAINT "Franchisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerBranding" (
    "id" TEXT NOT NULL,
    "dealerName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "supportPhone" TEXT,
    "supportEmail" TEXT,
    "supportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerBranding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationProvisioningTask" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "franchiseeBusinessId" TEXT NOT NULL,
    "requestedByUserId" TEXT,
    "requestedDevicesCount" INTEGER,
    "notes" TEXT,
    "assignedToUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationProvisioningTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingCase" (
    "id" TEXT NOT NULL,
    "accountType" "OffboardingAccountType" NOT NULL,
    "franchisorId" TEXT,
    "franchiseId" TEXT,
    "status" "OffboardingStatus" NOT NULL DEFAULT 'SUSPENDED',
    "reason" TEXT,
    "requestedByUserId" TEXT,
    "approvedByProviderUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suspendedAt" TIMESTAMP(3),
    "exportGeneratedAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "retentionYears" INTEGER NOT NULL DEFAULT 7,
    "graceDays" INTEGER NOT NULL DEFAULT 30,
    "exportFileUrl" TEXT,
    "exportFileExpiresAt" TIMESTAMP(3),
    "hasOpenChargebacks" BOOLEAN NOT NULL DEFAULT false,
    "hasPendingSettlements" BOOLEAN NOT NULL DEFAULT false,
    "financialClearanceAt" TIMESTAMP(3),
    "financialClearedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessConfig" (
    "id" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "usesCommissions" BOOLEAN NOT NULL DEFAULT true,
    "usesInventory" BOOLEAN NOT NULL DEFAULT true,
    "usesAppointments" BOOLEAN NOT NULL DEFAULT true,
    "usesScheduling" BOOLEAN NOT NULL DEFAULT true,
    "usesVirtualKeypad" BOOLEAN NOT NULL DEFAULT true,
    "usesLoyalty" BOOLEAN NOT NULL DEFAULT true,
    "usesSalonLoyalty" BOOLEAN NOT NULL DEFAULT false,
    "usesGiftCards" BOOLEAN NOT NULL DEFAULT true,
    "usesMemberships" BOOLEAN NOT NULL DEFAULT true,
    "usesReferrals" BOOLEAN NOT NULL DEFAULT true,
    "usesRoyalties" BOOLEAN NOT NULL DEFAULT false,
    "usesTipping" BOOLEAN NOT NULL DEFAULT true,
    "usesDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "taxServices" BOOLEAN NOT NULL DEFAULT true,
    "taxProducts" BOOLEAN NOT NULL DEFAULT true,
    "servicesTaxableDefault" BOOLEAN NOT NULL DEFAULT false,
    "productsTaxableDefault" BOOLEAN NOT NULL DEFAULT true,
    "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
    "roundingRule" "TaxRoundingRule" NOT NULL DEFAULT 'PER_LINE',
    "usesRetailProducts" BOOLEAN NOT NULL DEFAULT true,
    "usesServices" BOOLEAN NOT NULL DEFAULT true,
    "posMode" TEXT NOT NULL DEFAULT 'SALON',
    "usesEmailMarketing" BOOLEAN NOT NULL DEFAULT true,
    "usesSMSMarketing" BOOLEAN NOT NULL DEFAULT true,
    "usesReviewManagement" BOOLEAN NOT NULL DEFAULT true,
    "usesMultiLocation" BOOLEAN NOT NULL DEFAULT false,
    "usesFranchising" BOOLEAN NOT NULL DEFAULT false,
    "usesTimeTracking" BOOLEAN NOT NULL DEFAULT true,
    "usesPayroll" BOOLEAN NOT NULL DEFAULT false,
    "usesMobilePulse" BOOLEAN NOT NULL DEFAULT false,
    "pulseSeatCount" INTEGER NOT NULL DEFAULT 0,
    "usesMobileApp" BOOLEAN NOT NULL DEFAULT false,
    "usesOroPulse" BOOLEAN NOT NULL DEFAULT false,
    "usesAdvancedReports" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'STARTER',
    "maxLocations" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "acceptsEbt" BOOLEAN NOT NULL DEFAULT false,
    "acceptsChecks" BOOLEAN NOT NULL DEFAULT false,
    "acceptsOnAccount" BOOLEAN NOT NULL DEFAULT false,
    "shiftRequirement" TEXT NOT NULL DEFAULT 'BOTH',
    "reviewRequestTiming" TEXT NOT NULL DEFAULT 'MANUAL',
    "reviewRequestMethod" TEXT NOT NULL DEFAULT 'SMS',
    "reviewIncentive" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tipPromptEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tipPromptTiming" TEXT NOT NULL DEFAULT 'AT_CHECKOUT',
    "tipSuggestions" TEXT NOT NULL DEFAULT '[15,20,25]',
    "tipType" TEXT NOT NULL DEFAULT 'PERCENT',
    "tipPoolingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "commissionCalculation" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "commissionVisibility" TEXT NOT NULL DEFAULT 'ALWAYS',
    "loyaltyPointsAwarding" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "loyaltyPointsRatio" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "loyaltyBirthdayBonus" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderTiming" TEXT NOT NULL DEFAULT '24_HOURS',
    "reminderMethod" TEXT NOT NULL DEFAULT 'SMS',
    "cancellationFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cancellationFeeAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cancellationWindow" INTEGER NOT NULL DEFAULT 24,
    "membershipAutoBilling" BOOLEAN NOT NULL DEFAULT true,
    "membershipFailedPaymentRetry" INTEGER NOT NULL DEFAULT 3,
    "giftCardAutoEmail" BOOLEAN NOT NULL DEFAULT true,
    "giftCardPhysical" BOOLEAN NOT NULL DEFAULT true,
    "discountRequiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "discountMaxPercent" DECIMAL(65,30) NOT NULL DEFAULT 50,
    "lowStockAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "allowMultiProvider" BOOLEAN NOT NULL DEFAULT false,
    "newClientBonusEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newClientBonusAmount" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "pricingModel" TEXT NOT NULL DEFAULT 'STANDARD',
    "cardSurcharge" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cardSurchargeType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "showDualPricing" BOOLEAN NOT NULL DEFAULT false,
    "cashDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cashDiscountPercent" DECIMAL(65,30) NOT NULL DEFAULT 3.5,
    "canExportData" BOOLEAN NOT NULL DEFAULT false,
    "canExportReports" BOOLEAN NOT NULL DEFAULT false,
    "requireManagerPinAbove" DECIMAL(12,2),
    "refundLimitPerDay" DECIMAL(12,2),
    "usesStorefront" BOOLEAN NOT NULL DEFAULT false,
    "allowNegativeStock" BOOLEAN NOT NULL DEFAULT false,
    "autoLockMinutes" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT,
    "userRole" TEXT,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "stationId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEB_POS',
    "reason" TEXT,
    "approvedBy" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionTier" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "minRevenue" DECIMAL(65,30) NOT NULL,
    "maxRevenue" DECIMAL(65,30),
    "percentage" DECIMAL(65,30) NOT NULL,
    "tierName" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCommissionOverride" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT,
    "percentage" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCommissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePaymentConfig" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'COMMISSION',
    "defaultCommissionRate" DECIMAL(65,30) NOT NULL DEFAULT 0.40,
    "usesTieredCommission" BOOLEAN NOT NULL DEFAULT false,
    "baseSalary" DECIMAL(65,30),
    "salaryPeriod" TEXT,
    "useMaxSalaryOrCommission" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DECIMAL(65,30),
    "useMaxHourlyOrCommission" BOOLEAN NOT NULL DEFAULT false,
    "rentalFee" DECIMAL(65,30),
    "rentalPeriod" TEXT,
    "rentalKeeps100Percent" BOOLEAN NOT NULL DEFAULT false,
    "productCommissionRate" DECIMAL(65,30) NOT NULL DEFAULT 0.10,
    "useProductCostDeduction" BOOLEAN NOT NULL DEFAULT false,
    "commissionOnDiscountedPrice" BOOLEAN NOT NULL DEFAULT true,
    "newClientBonusEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newClientBonusAmount" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "cashDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cashDiscountPercent" DECIMAL(65,30) NOT NULL DEFAULT 3.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "payDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollEntry" (
    "id" TEXT NOT NULL,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serviceRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "productRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "serviceCommission" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "productCommission" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "baseSalary" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hourlyWages" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tips" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bonuses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "rentalFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "hoursWorked" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "servicesPerformed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitRecord" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureRequest" (
    "id" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestNotes" TEXT,
    "responseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawerActivity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "amount" DOUBLE PRECISION,
    "employeeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shiftId" TEXT,
    "locationId" TEXT NOT NULL,
    "transactionId" TEXT,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "alertLevel" TEXT,

    CONSTRAINT "DrawerActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "clientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "serviceId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "position" INTEGER NOT NULL,
    "estimatedWait" INTEGER,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seatedAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientWaiver" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT,
    "appointmentId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "waiverVersion" TEXT NOT NULL DEFAULT '1.0',
    "waiverText" TEXT NOT NULL,
    "signatureName" TEXT NOT NULL,
    "signatureDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientWaiver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "subject" TEXT,
    "assigneeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SupportChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyProgram" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Rewards',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerDollar" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "redemptionRatio" DECIMAL(65,30) NOT NULL DEFAULT 0.01,
    "useSmartRewards" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyRule" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "upc" TEXT,
    "earnMode" TEXT NOT NULL DEFAULT 'PER_DOLLAR',
    "pointsPerDollar" DECIMAL(10,2),
    "fixedPointsPerUnit" INTEGER,
    "multiplier" DECIMAL(5,2),
    "priority" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyRedeemTier" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pointsRequired" INTEGER NOT NULL,
    "rewardType" TEXT NOT NULL DEFAULT 'AMOUNT_OFF',
    "rewardValue" DECIMAL(10,2) NOT NULL,
    "minBasketAmount" DECIMAL(10,2),
    "maxPerDay" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyRedeemTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyMember" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpend" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "masterAccountId" TEXT,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyMasterAccount" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "pooledBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyMasterAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsTransaction" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "masterAccountId" TEXT,
    "memberId" TEXT,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "transactionId" TEXT,
    "locationId" TEXT,
    "franchiseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceId" TEXT NOT NULL,
    "sessionsIncluded" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 365,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagePurchase" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "sessionsRemaining" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackagePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageUsage" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointmentId" TEXT,
    "employeeId" TEXT,
    "notes" TEXT,

    CONSTRAINT "PackageUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CHAIR',
    "description" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "allowedServiceIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientPhoto" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoType" TEXT NOT NULL DEFAULT 'PROGRESS',
    "caption" TEXT,
    "serviceId" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'GENERAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringAppointment" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "employeeId" TEXT,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "preferredTime" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "maxOccurrences" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "source" TEXT NOT NULL DEFAULT 'KIOSK',
    "appointmentId" TEXT,
    "stationRef" TEXT,
    "brandId" TEXT,
    "deviceId" TEXT,
    "qrTokenId" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrToken" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "deviceId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotteryGame" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "gameNumber" TEXT NOT NULL,
    "ticketPrice" DECIMAL(65,30) NOT NULL,
    "prizePool" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotteryGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotteryPack" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "packNumber" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'INVENTORY',
    "activatedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotteryPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotteryTransaction" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "packId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "ticketNumber" TEXT,
    "employeeId" TEXT NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotteryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TobaccoScanDeal" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "programCode" TEXT,
    "dealName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BUYDOWN',
    "appliesToLevel" TEXT NOT NULL DEFAULT 'PACK',
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER,
    "customerLimitPerTxn" INTEGER,
    "rewardType" TEXT NOT NULL DEFAULT 'FIXED_AMOUNT',
    "rewardValue" DECIMAL(12,2) NOT NULL,
    "baseAllowance" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "loyaltyBonus" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "stackPolicy" TEXT NOT NULL DEFAULT 'STACK',
    "allowStoreLoyaltyStack" BOOLEAN NOT NULL DEFAULT false,
    "reimbursementPerUnit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "storeIds" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "requiresScanReporting" BOOLEAN NOT NULL DEFAULT true,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "requiresLoyalty" BOOLEAN NOT NULL DEFAULT false,
    "sourceFile" TEXT,
    "manufacturerPLU" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TobaccoScanDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TobaccoScanDealUPC" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "upc" TEXT NOT NULL,
    "productName" TEXT,
    "packOrCarton" TEXT NOT NULL DEFAULT 'PACK',
    "itemId" TEXT,

    CONSTRAINT "TobaccoScanDealUPC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TobaccoScanEvent" (
    "id" TEXT NOT NULL,
    "tobaccoDealId" TEXT,
    "transactionId" TEXT NOT NULL,
    "lineItemId" TEXT,
    "lineType" TEXT NOT NULL DEFAULT 'NORMAL_SALE',
    "lineNumber" INTEGER NOT NULL DEFAULT 1,
    "claimEligible" BOOLEAN NOT NULL DEFAULT true,
    "exclusionReason" TEXT,
    "storeId" TEXT NOT NULL,
    "stationId" TEXT,
    "cashierId" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "upc" TEXT NOT NULL,
    "upcDescription" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'PACK',
    "promoFlag" BOOLEAN NOT NULL DEFAULT false,
    "isPromoUpc" BOOLEAN NOT NULL DEFAULT false,
    "regularPrice" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "outletMultipackFlag" BOOLEAN NOT NULL DEFAULT false,
    "outletMultipackQty" INTEGER,
    "outletMultipackDisc" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "acctPromoName" TEXT,
    "acctDiscAmt" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "mfgDiscAmt" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "pidCoupon" TEXT,
    "pidCouponDisc" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "mfgMultipackFlag" BOOLEAN NOT NULL DEFAULT false,
    "mfgMultipackQty" INTEGER,
    "mfgMultipackDisc" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "mfgPromoDesc" TEXT,
    "mfgBuydownDesc" TEXT,
    "mfgBuydownAmt" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "mfgMultipackDesc" TEXT,
    "loyaltyId" TEXT,
    "loyaltyStatus" TEXT NOT NULL DEFAULT 'NONE',
    "offerCode" TEXT,
    "baseAllowanceApplied" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "loyaltyBonusApplied" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "storeLoyaltyBlocked" BOOLEAN NOT NULL DEFAULT false,
    "discountApplied" DECIMAL(12,2) NOT NULL,
    "reimbursementExpected" DECIMAL(12,2) NOT NULL,
    "exportBatchId" TEXT,
    "claimStatus" TEXT NOT NULL DEFAULT 'UNCLAIMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TobaccoScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TobaccoScanExportBatch" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "programCode" TEXT,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "totalDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalReimbursement" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "submittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(12,2),
    "rejectionReason" TEXT,
    "exportFileName" TEXT,
    "exportFormat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TobaccoScanExportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerConfig" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "storeId" TEXT,
    "accountNumber" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "portalUrl" TEXT,
    "rebatePerPack" DECIMAL(12,4) NOT NULL DEFAULT 0.04,
    "rebatePerCarton" DECIMAL(12,4) NOT NULL DEFAULT 0.40,
    "loyaltyBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxJurisdiction" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT,
    "salesTaxRate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxJurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExciseTaxRule" (
    "id" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "ratePerGallon" DECIMAL(12,4),
    "ratePerUnit" DECIMAL(12,4),
    "ratePerOz" DECIMAL(12,4),
    "minAbv" DECIMAL(5,2),
    "maxAbv" DECIMAL(5,2),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExciseTaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationTaxJurisdiction" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "displayName" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesProducts" BOOLEAN NOT NULL DEFAULT true,
    "appliesServices" BOOLEAN NOT NULL DEFAULT false,
    "appliesFood" BOOLEAN NOT NULL DEFAULT false,
    "appliesAlcohol" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationTaxJurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationTaxCategoryRule" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "taxTreatment" "TaxTreatment" NOT NULL DEFAULT 'TAXABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationTaxCategoryRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxGroup" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxGroupComponent" (
    "id" TEXT NOT NULL,
    "taxGroupId" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "compoundOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TaxGroupComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentTaxDefault" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "taxGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentTaxDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChangeLog" (
    "id" TEXT NOT NULL,
    "itemId" TEXT,
    "productId" TEXT,
    "oldPrice" DECIMAL(12,2) NOT NULL,
    "newPrice" DECIMAL(12,2) NOT NULL,
    "oldCost" DECIMAL(12,2),
    "newCost" DECIMAL(12,2),
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "changedBy" TEXT NOT NULL,
    "changedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'MARKUP',
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryPricingRule" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "pricingRuleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryPricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreAccountTransaction" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "transactionId" TEXT,
    "invoiceNumber" TEXT,
    "paymentMethod" TEXT,
    "checkNumber" TEXT,
    "note" TEXT,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreAccountTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "requestedById" TEXT NOT NULL,
    "requestedByName" TEXT,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "shippedById" TEXT,
    "shippedByName" TEXT,
    "receivedById" TEXT,
    "receivedByName" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemSku" TEXT,
    "itemBarcode" TEXT,
    "quantitySent" INTEGER NOT NULL,
    "quantityReceived" INTEGER,
    "unitCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discrepancyNote" TEXT,

    CONSTRAINT "TransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashCount" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "expectedCash" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "countedCash" DECIMAL(65,30) NOT NULL,
    "variance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "denominations" TEXT,
    "note" TEXT,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeDrop" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "witnessedById" TEXT,
    "witnessedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafeDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositLog" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "expectedAmount" DECIMAL(65,30) NOT NULL,
    "depositedAmount" DECIMAL(65,30) NOT NULL,
    "variance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bankDate" TIMESTAMP(3) NOT NULL,
    "slipNumber" TEXT,
    "slipImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "loggedById" TEXT,
    "loggedByName" TEXT,
    "reconciledById" TEXT,
    "reconciledByName" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepositLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "details" TEXT,
    "amount" DECIMAL(65,30),
    "transactionId" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreException" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedById" TEXT,
    "acknowledgedByName" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPaymentProfile" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "processorName" TEXT,
    "processorMID" TEXT,
    "processorTID" TEXT,
    "gateway" TEXT,
    "surchargeType" TEXT,
    "surchargeValue" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationPaymentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationItemOverride" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "itemId" TEXT,
    "productId" TEXT,
    "serviceId" TEXT,
    "priceOverride" DECIMAL(65,30),
    "isActiveOverride" BOOLEAN,
    "taxGroupOverride" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationItemOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockOnHand" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qtyOnHand" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockOnHand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientCard" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "posType" TEXT,
    "posVersion" TEXT,
    "dbType" TEXT,
    "healthJson" TEXT,
    "lastHealthAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "assignedToUserId" TEXT,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "category" TEXT,
    "subject" TEXT NOT NULL,
    "slaDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVESTIGATING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentImpact" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "locationId" TEXT,
    "terminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentImpact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "requestType" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "franchisorId" TEXT,
    "franchiseId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "businessType" INTEGER NOT NULL,
    "dealerBrandingId" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastStatusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "OnboardingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingRequestLocation" (
    "id" TEXT NOT NULL,
    "onboardingRequestId" TEXT NOT NULL,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "locationName" TEXT NOT NULL,
    "phone" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "requestedTerminals" INTEGER NOT NULL DEFAULT 0,
    "requestedStations" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingRequestLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingRequestDevice" (
    "id" TEXT NOT NULL,
    "onboardingRequestId" TEXT NOT NULL,
    "requestLocationId" TEXT,
    "locationId" TEXT,
    "terminalId" TEXT,
    "deviceType" INTEGER NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "ipAddress" TEXT,
    "port" INTEGER,
    "assignmentStatus" INTEGER NOT NULL DEFAULT 1,
    "assignedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingRequestDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingRequestDocument" (
    "id" TEXT NOT NULL,
    "onboardingRequestId" TEXT NOT NULL,
    "requestLocationId" TEXT,
    "docType" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "fileName" TEXT,
    "contentType" TEXT,
    "fileUrl" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingRequestDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "onboardingRequestId" TEXT,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "carrier" TEXT,
    "serviceLevel" TEXT,
    "trackingNumber" TEXT,
    "shipToName" TEXT,
    "shipToPhone" TEXT,
    "shipToAddress1" TEXT NOT NULL,
    "shipToAddress2" TEXT,
    "shipToCity" TEXT NOT NULL,
    "shipToState" TEXT NOT NULL,
    "shipToPostalCode" TEXT NOT NULL,
    "shipToCountry" TEXT NOT NULL DEFAULT 'USA',
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentPackage" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "packageNo" INTEGER NOT NULL,
    "weightLb" DOUBLE PRECISION,
    "lengthIn" DOUBLE PRECISION,
    "widthIn" DOUBLE PRECISION,
    "heightIn" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "packageId" TEXT,
    "itemType" INTEGER NOT NULL,
    "terminalId" TEXT,
    "serialNumber" TEXT,
    "sku" TEXT,
    "itemName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingRequestEvent" (
    "id" TEXT NOT NULL,
    "onboardingRequestId" TEXT NOT NULL,
    "eventType" INTEGER NOT NULL,
    "message" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTemplate" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "defaultQty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OrderTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashPayout" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "type" TEXT NOT NULL,
    "ticketNumber" TEXT,
    "vendorName" TEXT,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScratchTicket" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScratchTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterUpcProduct" (
    "id" TEXT NOT NULL,
    "upc" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "category" TEXT,
    "size" TEXT,
    "weight" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterUpcProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterConfig" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "printerLang" TEXT NOT NULL DEFAULT 'ESCPOS',
    "agentUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stationId" TEXT,
    "macAddress" TEXT,
    "labelWidth" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IDScanLog" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "transactionId" TEXT,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "type" TEXT NOT NULL,
    "customerDOB" TIMESTAMP(3),
    "items" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IDScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT,
    "title" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringDays" TEXT,
    "recurringUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoothRental" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT,
    "userId" TEXT NOT NULL,
    "boothNumber" TEXT,
    "weeklyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDay" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoothRental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT,
    "workerType" TEXT NOT NULL DEFAULT 'W2_EMPLOYEE',
    "compensationType" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "hourlyRate" DECIMAL(10,2),
    "salaryAmount" DECIMAL(10,2),
    "salaryPeriod" TEXT,
    "commissionSplit" DECIMAL(5,2),
    "commissionBase" TEXT NOT NULL DEFAULT 'AFTER_DISCOUNT',
    "commissionAppliesTo" TEXT NOT NULL DEFAULT 'SERVICES_ONLY',
    "commissionIncludesTax" BOOLEAN NOT NULL DEFAULT false,
    "commissionIncludesTips" BOOLEAN NOT NULL DEFAULT false,
    "chairRentAmount" DECIMAL(10,2),
    "chairRentPeriod" TEXT,
    "chairRentDueDay" INTEGER,
    "chairRentStartDate" TIMESTAMP(3),
    "chairRentAutoDeduct" BOOLEAN NOT NULL DEFAULT false,
    "requiresTimeClock" BOOLEAN NOT NULL DEFAULT false,
    "canSetOwnPrices" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompensationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompensationSnapshot" (
    "id" TEXT NOT NULL,
    "appointmentLineId" TEXT,
    "transactionItemId" TEXT,
    "compensationType" TEXT NOT NULL,
    "commissionSplit" DECIMAL(5,2),
    "commissionBase" TEXT,
    "hourlyRate" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompensationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserResource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeServicePriceOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeServicePriceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarberAllowedService" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarberAllowedService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubFranchisee" (
    "id" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "permissions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubFranchisee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER,
    "authCode" TEXT,
    "cardLast4" TEXT,
    "cardBrand" TEXT,
    "terminalId" TEXT,
    "reason" TEXT,
    "stationId" TEXT,
    "locationId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "locationId" TEXT,
    "metadata" JSONB,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsUsageLedger" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "customerId" TEXT,
    "phone" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageContent" TEXT,
    "units" INTEGER NOT NULL DEFAULT 1,
    "monthKey" TEXT NOT NULL,
    "billCategory" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" TEXT NOT NULL,
    "carrierCode" TEXT,
    "suppressedReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsUsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsMonthlyUsage" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "freeUnitsUsed" INTEGER NOT NULL DEFAULT 0,
    "overageUnitsUsed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsMonthlyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsOptOut" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsOptOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealSuggestion" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "dealType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(65,30) NOT NULL,
    "priceFloor" DECIMAL(65,30),
    "minSpend" DECIMAL(65,30),
    "targetDays" TEXT[],
    "targetTimeStart" TEXT,
    "targetTimeEnd" TEXT,
    "audienceCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealCampaign" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "dealSuggestionId" TEXT,
    "templateHash" TEXT NOT NULL,
    "audienceType" TEXT NOT NULL,
    "audienceCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedUnits" INTEGER NOT NULL DEFAULT 0,
    "estimatedFree" INTEGER NOT NULL DEFAULT 0,
    "estimatedOverage" INTEGER NOT NULL DEFAULT 0,
    "actualUnits" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "blockedReason" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "messageTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "locationId" TEXT,
    "stationId" TEXT,
    "userId" TEXT,
    "route" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "statusClass" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "responseBytes" INTEGER,
    "userAgent" TEXT,
    "sampled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsageDaily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "locationId" TEXT,
    "route" TEXT NOT NULL,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "successCalls" INTEGER NOT NULL DEFAULT 0,
    "clientErrors" INTEGER NOT NULL DEFAULT 0,
    "serverErrors" INTEGER NOT NULL DEFAULT 0,
    "avgLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "p95LatencyMs" INTEGER NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiUsageDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmscImportBatch" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "importedById" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "duplicateRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" JSONB,

    CONSTRAINT "RmscImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmscScanRecord" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sourceRowNumber" INTEGER NOT NULL,
    "rowHash" TEXT NOT NULL,
    "outletNumber" TEXT,
    "transactionDate" TIMESTAMP(3),
    "basketId" TEXT,
    "scanId" TEXT,
    "registerNo" TEXT,
    "upc" TEXT,
    "productDescription" TEXT,
    "quantity" DECIMAL(10,3),
    "unitPrice" DECIMAL(10,2),
    "extendedPrice" DECIMAL(12,2),
    "manufacturerCode" TEXT,
    "manufacturerName" TEXT,
    "promoFlag" BOOLEAN NOT NULL DEFAULT false,
    "promoType" TEXT,
    "multipackFlag" BOOLEAN NOT NULL DEFAULT false,
    "buydownAmount" DECIMAL(10,2),
    "loyaltyFlag" BOOLEAN NOT NULL DEFAULT false,
    "rawFields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RmscScanRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundFile" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "remotePath" TEXT,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER,
    "parseStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "parseError" TEXT,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "parsedRows" INTEGER NOT NULL DEFAULT 0,
    "matchedRows" INTEGER NOT NULL DEFAULT 0,
    "newProductRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "uploadedBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoice" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT,
    "supplierId" TEXT,
    "inboundFileId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceType" TEXT NOT NULL DEFAULT 'INVOICE',
    "vendorName" TEXT NOT NULL,
    "vendorStoreNum" TEXT,
    "retailerStoreNum" TEXT,
    "retailerVendorId" TEXT,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "processDate" TIMESTAMP(3),
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "itemCount" INTEGER NOT NULL,
    "poNumber" TEXT,
    "poDate" TIMESTAMP(3),
    "refInvoiceNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IMPORTED',
    "matchRate" DECIMAL(5,2),
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "matchedItems" INTEGER NOT NULL DEFAULT 0,
    "newItems" INTEGER NOT NULL DEFAULT 0,
    "errorItems" INTEGER NOT NULL DEFAULT 0,
    "costAlertItems" INTEGER NOT NULL DEFAULT 0,
    "parsedTotal" DECIMAL(12,2),
    "discrepancy" DECIMAL(12,2),
    "discrepancyOk" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "voidReason" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "vendorProductNum" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "unitOfMeasure" TEXT,
    "productVolume" TEXT,
    "caseUpc" TEXT,
    "cleanUpc" TEXT,
    "packUpc" TEXT,
    "productDesc" TEXT NOT NULL,
    "productClass" TEXT,
    "glCode" TEXT,
    "packsPerCase" INTEGER,
    "unitsPerPack" INTEGER,
    "discountAdj" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "depositAdj" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "miscAdj" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAdj" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryAdj" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "extendedPrice" DECIMAL(12,2) NOT NULL,
    "baseUnitsReceived" INTEGER,
    "perUnitCost" DECIMAL(12,4),
    "matchStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "matchMethod" TEXT,
    "matchedProductId" TEXT,
    "autoCreatedProductId" TEXT,
    "suggestedProductIds" JSONB,
    "costChanged" BOOLEAN NOT NULL DEFAULT false,
    "previousCost" DECIMAL(12,4),
    "costChangePct" DECIMAL(8,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBarcodeAlias" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBarcodeAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCostHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT,
    "oldCost" DECIMAL(12,4) NOT NULL,
    "newCost" DECIMAL(12,4) NOT NULL,
    "changePct" DECIMAL(8,2) NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCostHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FtpConfig" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 21,
    "protocol" TEXT NOT NULL DEFAULT 'SFTP',
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "remotePath" TEXT NOT NULL DEFAULT '/',
    "filePattern" TEXT NOT NULL DEFAULT '*.csv',
    "autoFetch" BOOLEAN NOT NULL DEFAULT false,
    "fetchSchedule" TEXT NOT NULL DEFAULT '0 6 * * *',
    "lastFetchAt" TIMESTAMP(3),
    "costAlertPct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FtpConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerSignal" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "signalType" "OwnerSignalType" NOT NULL,
    "entityType" "OwnerSignalEntityType",
    "entityId" TEXT,
    "signalDate" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "scoreInputs" JSONB,
    "dedupKey" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "jobRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerIssue" (
    "id" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "category" "OwnerIssueCategory" NOT NULL,
    "issueType" "OwnerSignalType" NOT NULL,
    "severity" "OwnerIssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "dedupKey" TEXT,
    "isActiveSignal" BOOLEAN NOT NULL DEFAULT true,
    "repeatCount" INTEGER NOT NULL DEFAULT 1,
    "reopenedCount" INTEGER NOT NULL DEFAULT 0,
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "financialImpact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "urgencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "complianceRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "reasoning" TEXT,
    "recommended" TEXT,
    "status" "OwnerIssueStatus" NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "assignedToId" TEXT,
    "assignedToName" TEXT,
    "assignedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "acknowledgedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "resolvedReason" "OwnerIssueResolvedReason",
    "workflowResolvedAt" TIMESTAMP(3),
    "sourceResolvedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "escalatedToId" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceType" "OwnerIssueSourceType",
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerIssueEvent" (
    "id" TEXT NOT NULL,
    "ownerIssueId" TEXT NOT NULL,
    "eventType" "OwnerIssueEventType" NOT NULL,
    "fromStatus" "OwnerIssueStatus",
    "toStatus" "OwnerIssueStatus",
    "actorUserId" TEXT,
    "actorName" TEXT,
    "note" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerIssueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreHealthScore" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "salesHealth" INTEGER NOT NULL DEFAULT 50,
    "cashHealth" INTEGER NOT NULL DEFAULT 50,
    "laborHealth" INTEGER NOT NULL DEFAULT 50,
    "inventoryHealth" INTEGER NOT NULL DEFAULT 50,
    "complianceHealth" INTEGER NOT NULL DEFAULT 50,
    "lpHealth" INTEGER NOT NULL DEFAULT 50,
    "overallScore" INTEGER NOT NULL DEFAULT 50,
    "overallStatus" TEXT NOT NULL DEFAULT 'GREEN',
    "scoreVersion" TEXT,
    "weightsUsed" JSONB,
    "rawMetrics" JSONB,
    "factors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreHealthScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerScorecard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "avgCloseTime" DOUBLE PRECISION,
    "alertResponseMin" DOUBLE PRECISION,
    "issuesIgnored" INTEGER NOT NULL DEFAULT 0,
    "cashVarianceRate" DOUBLE PRECISION,
    "voidApprovalRate" DOUBLE PRECISION,
    "lowStockDays" INTEGER NOT NULL DEFAULT 0,
    "overallGrade" TEXT NOT NULL DEFAULT 'B',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerScorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerDigest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "digestType" "OwnerDigestType" NOT NULL,
    "channel" "OwnerDigestChannel" NOT NULL,
    "businessDate" DATE NOT NULL,
    "issueCount" INTEGER NOT NULL,
    "topIssues" JSONB NOT NULL,
    "storeScores" JSONB NOT NULL,
    "recommended" JSONB,
    "status" "OwnerDigestStatus" NOT NULL DEFAULT 'QUEUED',
    "failureReason" TEXT,
    "externalId" TEXT,
    "jobRunId" TEXT,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "OwnerDigest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "morningEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "morningEmailTime" TEXT,
    "dailyRecapEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "criticalSmsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "depositSmsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "complianceSmsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cashVarianceSmsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "weekendEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weightOverrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingProfile" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30,
    "minNoticeMinutes" INTEGER NOT NULL DEFAULT 120,
    "slotIntervalMin" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 0,
    "accentColor" TEXT NOT NULL DEFAULT '#7C3AED',
    "welcomeMessage" TEXT,
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "setupStep" TEXT NOT NULL DEFAULT 'services',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontProfile" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "headline" TEXT,
    "bannerImageUrl" TEXT,
    "showAllCategories" BOOLEAN NOT NULL DEFAULT true,
    "visibleCategoryIds" TEXT,
    "hiddenItemIds" TEXT,
    "hideOutOfStock" BOOLEAN NOT NULL DEFAULT true,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pickupLeadMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxOrdersPerSlot" INTEGER NOT NULL DEFAULT 10,
    "minOrderAmount" DECIMAL(12,2),
    "maxItemsPerOrder" INTEGER NOT NULL DEFAULT 50,
    "orderNotesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "estimatedTax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimatedTotal" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pickupTime" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "StorefrontOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "franchiseId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "lane" TEXT NOT NULL DEFAULT 'MARKETING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonLoyaltyProgram" (
    "id" TEXT NOT NULL,
    "franchisorId" TEXT,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerLabel" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "programType" TEXT NOT NULL DEFAULT 'SERVICE_PUNCH',
    "goal" TEXT,
    "punchesRequired" INTEGER,
    "earnMode" TEXT NOT NULL DEFAULT 'ONE_PER_QUALIFYING_VISIT',
    "rewardType" TEXT NOT NULL,
    "rewardValue" DECIMAL(10,2),
    "rewardPercent" DECIMAL(5,2),
    "appliesToSameLocationOnly" BOOLEAN NOT NULL DEFAULT true,
    "allowMultiLocationEarn" BOOLEAN NOT NULL DEFAULT false,
    "allowMultiLocationRedeem" BOOLEAN NOT NULL DEFAULT false,
    "autoEnroll" BOOLEAN NOT NULL DEFAULT true,
    "requireIdentifiedCustomer" BOOLEAN NOT NULL DEFAULT true,
    "timingWindowDays" INTEGER,
    "rewardExpiryDays" INTEGER,
    "stackWithDiscounts" BOOLEAN NOT NULL DEFAULT false,
    "reverseOnRefund" BOOLEAN NOT NULL DEFAULT true,
    "reverseOnVoid" BOOLEAN NOT NULL DEFAULT true,
    "managerApprovalForOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonLoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonLoyaltyProgramRule" (
    "id" TEXT NOT NULL,
    "loyaltyProgramId" TEXT NOT NULL,
    "serviceId" TEXT,
    "categoryId" TEXT,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "minSubtotal" DECIMAL(10,2),
    "locationId" TEXT,
    "stylistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonLoyaltyProgramRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonCustomerLoyaltyMembership" (
    "id" TEXT NOT NULL,
    "loyaltyProgramId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "homeLocationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "punchesEarned" INTEGER NOT NULL DEFAULT 0,
    "rewardsUnlocked" INTEGER NOT NULL DEFAULT 0,
    "rewardsRedeemed" INTEGER NOT NULL DEFAULT 0,
    "streakPreservedUntil" TIMESTAMP(3),
    "rewardExpiresAt" TIMESTAMP(3),
    "lastQualifiedVisitAt" TIMESTAMP(3),
    "lastRewardRedeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonCustomerLoyaltyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonLoyaltyLedgerEntry" (
    "id" TEXT NOT NULL,
    "loyaltyProgramId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "transactionId" TEXT,
    "locationId" TEXT,
    "stylistId" TEXT,
    "entryType" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "punchesDelta" INTEGER NOT NULL DEFAULT 0,
    "rewardDelta" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sourceRefundTransactionId" TEXT,
    "transactionLineItemId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonLoyaltyLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonTransactionLoyaltyRedemption" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionLineItemId" TEXT,
    "loyaltyProgramId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardValue" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonTransactionLoyaltyRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_status_idx" ON "FeatureFlag"("status");

-- CreateIndex
CREATE INDEX "FeatureFlagOverride_flagId_idx" ON "FeatureFlagOverride"("flagId");

-- CreateIndex
CREATE INDEX "FeatureFlagOverride_scopeType_scopeId_idx" ON "FeatureFlagOverride"("scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagOverride_flagId_scopeType_scopeId_key" ON "FeatureFlagOverride"("flagId", "scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_publicId_key" ON "Provider"("publicId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_userId_idx" ON "UserRoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_providerId_idx" ON "UserRoleAssignment"("providerId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_franchisorId_idx" ON "UserRoleAssignment"("franchisorId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_franchiseId_idx" ON "UserRoleAssignment"("franchiseId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_locationId_idx" ON "UserRoleAssignment"("locationId");

-- CreateIndex
CREATE INDEX "FranchisorMembership_userId_idx" ON "FranchisorMembership"("userId");

-- CreateIndex
CREATE INDEX "FranchisorMembership_franchisorId_idx" ON "FranchisorMembership"("franchisorId");

-- CreateIndex
CREATE UNIQUE INDEX "FranchisorMembership_userId_franchisorId_key" ON "FranchisorMembership"("userId", "franchisorId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "UserPermission"("userId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefaultPermission_role_permissionId_key" ON "RoleDefaultPermission"("role", "permissionId");

-- CreateIndex
CREATE INDEX "UserLocationAccess_userId_idx" ON "UserLocationAccess"("userId");

-- CreateIndex
CREATE INDEX "UserLocationAccess_locationId_idx" ON "UserLocationAccess"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLocationAccess_userId_locationId_key" ON "UserLocationAccess"("userId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffSlug_key" ON "User"("staffSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_slug_key" ON "Franchise"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_customerId_key" ON "Franchise"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "FranchiseSettings_franchiseId_key" ON "FranchiseSettings"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSettings_franchiseId_key" ON "ReminderSettings"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsCredits_franchiseId_key" ON "SmsCredits"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Location_setupCode_key" ON "Location"("setupCode");

-- CreateIndex
CREATE UNIQUE INDEX "Location_pulseStoreCode_key" ON "Location"("pulseStoreCode");

-- CreateIndex
CREATE UNIQUE INDEX "PosRegisterLayout_locationId_key" ON "PosRegisterLayout"("locationId");

-- CreateIndex
CREATE INDEX "PulseDeviceToken_deviceId_idx" ON "PulseDeviceToken"("deviceId");

-- CreateIndex
CREATE INDEX "PulseDeviceToken_userId_idx" ON "PulseDeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PulseDeviceToken_userId_deviceId_key" ON "PulseDeviceToken"("userId", "deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Station_dedicatedTerminalId_key" ON "Station"("dedicatedTerminalId");

-- CreateIndex
CREATE UNIQUE INDEX "Station_pairingCode_key" ON "Station"("pairingCode");

-- CreateIndex
CREATE INDEX "Station_locationId_idx" ON "Station"("locationId");

-- CreateIndex
CREATE INDEX "Station_pairedDeviceId_idx" ON "Station"("pairedDeviceId");

-- CreateIndex
CREATE UNIQUE INDEX "StationDisplayProfile_stationId_key" ON "StationDisplayProfile"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustedDevice_deviceId_key" ON "TrustedDevice"("deviceId");

-- CreateIndex
CREATE INDEX "TrustedDevice_stationId_idx" ON "TrustedDevice"("stationId");

-- CreateIndex
CREATE INDEX "TrustedDevice_deviceId_idx" ON "TrustedDevice"("deviceId");

-- CreateIndex
CREATE INDEX "PaymentTerminal_locationId_idx" ON "PaymentTerminal"("locationId");

-- CreateIndex
CREATE INDEX "GlobalServiceCategory_franchisorId_isActive_idx" ON "GlobalServiceCategory"("franchisorId", "isActive");

-- CreateIndex
CREATE INDEX "GlobalService_franchisorId_isActive_idx" ON "GlobalService"("franchisorId", "isActive");

-- CreateIndex
CREATE INDEX "LocationServiceOverride_locationId_idx" ON "LocationServiceOverride"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationServiceOverride_globalServiceId_locationId_key" ON "LocationServiceOverride"("globalServiceId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "SharedUPCProduct_barcode_key" ON "SharedUPCProduct"("barcode");

-- CreateIndex
CREATE INDEX "SharedUPCProduct_barcode_idx" ON "SharedUPCProduct"("barcode");

-- CreateIndex
CREATE INDEX "SharedUPCProduct_name_idx" ON "SharedUPCProduct"("name");

-- CreateIndex
CREATE INDEX "SharedUPCProduct_category_idx" ON "SharedUPCProduct"("category");

-- CreateIndex
CREATE INDEX "UnifiedCategory_franchiseId_idx" ON "UnifiedCategory"("franchiseId");

-- CreateIndex
CREATE INDEX "UnifiedCategory_type_idx" ON "UnifiedCategory"("type");

-- CreateIndex
CREATE INDEX "UnifiedCategory_parentId_idx" ON "UnifiedCategory"("parentId");

-- CreateIndex
CREATE INDEX "Item_franchiseId_idx" ON "Item"("franchiseId");

-- CreateIndex
CREATE INDEX "Item_type_idx" ON "Item"("type");

-- CreateIndex
CREATE INDEX "Item_barcode_idx" ON "Item"("barcode");

-- CreateIndex
CREATE INDEX "Item_sku_idx" ON "Item"("sku");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE INDEX "ItemLineItem_transactionId_idx" ON "ItemLineItem"("transactionId");

-- CreateIndex
CREATE INDEX "ItemLineItem_itemId_idx" ON "ItemLineItem"("itemId");

-- CreateIndex
CREATE INDEX "EmployeeService_employeeId_idx" ON "EmployeeService"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeService_serviceId_idx" ON "EmployeeService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeService_employeeId_serviceId_key" ON "EmployeeService"("employeeId", "serviceId");

-- CreateIndex
CREATE INDEX "Client_franchiseId_idx" ON "Client"("franchiseId");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_lastName_idx" ON "Client"("lastName");

-- CreateIndex
CREATE INDEX "Client_loyaltyJoined_idx" ON "Client"("loyaltyJoined");

-- CreateIndex
CREATE INDEX "Client_hasStoreAccount_idx" ON "Client"("hasStoreAccount");

-- CreateIndex
CREATE INDEX "Appointment_locationId_idx" ON "Appointment"("locationId");

-- CreateIndex
CREATE INDEX "Appointment_locationId_startTime_idx" ON "Appointment"("locationId", "startTime");

-- CreateIndex
CREATE INDEX "Appointment_locationId_status_idx" ON "Appointment"("locationId", "status");

-- CreateIndex
CREATE INDEX "Appointment_employeeId_idx" ON "Appointment"("employeeId");

-- CreateIndex
CREATE INDEX "Appointment_clientId_idx" ON "Appointment"("clientId");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Department_franchiseId_idx" ON "Department"("franchiseId");

-- CreateIndex
CREATE INDEX "ProductCategory_franchiseId_idx" ON "ProductCategory"("franchiseId");

-- CreateIndex
CREATE INDEX "ProductCategory_departmentId_idx" ON "ProductCategory"("departmentId");

-- CreateIndex
CREATE INDEX "Product_franchiseId_idx" ON "Product"("franchiseId");

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_vendor_idx" ON "Product"("vendor");

-- CreateIndex
CREATE INDEX "Product_brand_idx" ON "Product"("brand");

-- CreateIndex
CREATE INDEX "Product_franchiseId_barcode_idx" ON "Product"("franchiseId", "barcode");

-- CreateIndex
CREATE INDEX "Product_franchiseId_sku_idx" ON "Product"("franchiseId", "sku");

-- CreateIndex
CREATE INDEX "Product_franchiseId_isActive_idx" ON "Product"("franchiseId", "isActive");

-- CreateIndex
CREATE INDEX "Product_franchiseId_categoryId_idx" ON "Product"("franchiseId", "categoryId");

-- CreateIndex
CREATE INDEX "TagAlongItem_parentId_idx" ON "TagAlongItem"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "TagAlongItem_parentId_childId_key" ON "TagAlongItem"("parentId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_invoiceNumber_key" ON "Transaction"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Transaction_franchiseId_idx" ON "Transaction"("franchiseId");

-- CreateIndex
CREATE INDEX "Transaction_clientId_idx" ON "Transaction"("clientId");

-- CreateIndex
CREATE INDEX "Transaction_employeeId_idx" ON "Transaction"("employeeId");

-- CreateIndex
CREATE INDEX "Transaction_paymentMethod_idx" ON "Transaction"("paymentMethod");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_invoiceNumber_idx" ON "Transaction"("invoiceNumber");

-- CreateIndex
CREATE INDEX "TransactionTaxLine_transactionId_idx" ON "TransactionTaxLine"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoyaltyConfig_franchisorId_key" ON "RoyaltyConfig"("franchisorId");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveCart_userId_key" ON "ActiveCart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Terminal_serialNumber_key" ON "Terminal"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SplitPayoutConfig_franchiseId_key" ON "SplitPayoutConfig"("franchiseId");

-- CreateIndex
CREATE INDEX "ProductSupplier_supplierId_sku_idx" ON "ProductSupplier"("supplierId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSupplier_productId_supplierId_key" ON "ProductSupplier"("productId", "supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_franchiseId_idx" ON "PurchaseOrder"("franchiseId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_locationId_idx" ON "PurchaseOrder"("locationId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "StockAdjustment_productId_idx" ON "StockAdjustment"("productId");

-- CreateIndex
CREATE INDEX "StockAdjustment_locationId_idx" ON "StockAdjustment"("locationId");

-- CreateIndex
CREATE INDEX "StockAdjustment_reason_idx" ON "StockAdjustment"("reason");

-- CreateIndex
CREATE INDEX "StockAdjustment_createdAt_idx" ON "StockAdjustment"("createdAt");

-- CreateIndex
CREATE INDEX "StockAdjustment_sourceId_idx" ON "StockAdjustment"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientLoyalty_clientId_key" ON "ClientLoyalty"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE INDEX "CashDrawerSession_locationId_idx" ON "CashDrawerSession"("locationId");

-- CreateIndex
CREATE INDEX "CashDrawerSession_employeeId_idx" ON "CashDrawerSession"("employeeId");

-- CreateIndex
CREATE INDEX "CashDrawerSession_status_idx" ON "CashDrawerSession"("status");

-- CreateIndex
CREATE INDEX "CashDrawerSession_startTime_idx" ON "CashDrawerSession"("startTime");

-- CreateIndex
CREATE INDEX "SuspendedTransaction_locationId_idx" ON "SuspendedTransaction"("locationId");

-- CreateIndex
CREATE INDEX "SuspendedTransaction_employeeId_idx" ON "SuspendedTransaction"("employeeId");

-- CreateIndex
CREATE INDEX "SuspendedTransaction_status_idx" ON "SuspendedTransaction"("status");

-- CreateIndex
CREATE INDEX "SuspendedTransaction_expiresAt_idx" ON "SuspendedTransaction"("expiresAt");

-- CreateIndex
CREATE INDEX "Promotion_franchiseId_idx" ON "Promotion"("franchiseId");

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "Promotion"("isActive");

-- CreateIndex
CREATE INDEX "PromotionProduct_promotionId_idx" ON "PromotionProduct"("promotionId");

-- CreateIndex
CREATE INDEX "PromotionProduct_productId_idx" ON "PromotionProduct"("productId");

-- CreateIndex
CREATE INDEX "PromotionProduct_categoryId_idx" ON "PromotionProduct"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_token_key" ON "MagicLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_postId_userId_key" ON "Vote"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Franchisor_ownerId_key" ON "Franchisor"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Franchisor_brandCode_key" ON "Franchisor"("brandCode");

-- CreateIndex
CREATE UNIQUE INDEX "Franchisor_qrSubdomain_key" ON "Franchisor"("qrSubdomain");

-- CreateIndex
CREATE INDEX "LocationProvisioningTask_status_idx" ON "LocationProvisioningTask"("status");

-- CreateIndex
CREATE INDEX "LocationProvisioningTask_franchisorId_status_idx" ON "LocationProvisioningTask"("franchisorId", "status");

-- CreateIndex
CREATE INDEX "LocationProvisioningTask_locationId_idx" ON "LocationProvisioningTask"("locationId");

-- CreateIndex
CREATE INDEX "OffboardingCase_franchisorId_idx" ON "OffboardingCase"("franchisorId");

-- CreateIndex
CREATE INDEX "OffboardingCase_franchiseId_idx" ON "OffboardingCase"("franchiseId");

-- CreateIndex
CREATE INDEX "OffboardingCase_status_idx" ON "OffboardingCase"("status");

-- CreateIndex
CREATE INDEX "OffboardingCase_accountType_status_idx" ON "OffboardingCase"("accountType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessConfig_franchisorId_key" ON "BusinessConfig"("franchisorId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_franchiseId_idx" ON "AuditLog"("franchiseId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCommissionOverride_employeeId_serviceId_key" ON "ServiceCommissionOverride"("employeeId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePaymentConfig_employeeId_key" ON "EmployeePaymentConfig"("employeeId");

-- CreateIndex
CREATE INDEX "RateLimitRecord_identifier_idx" ON "RateLimitRecord"("identifier");

-- CreateIndex
CREATE INDEX "RateLimitRecord_windowStart_idx" ON "RateLimitRecord"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitRecord_identifier_endpoint_key" ON "RateLimitRecord"("identifier", "endpoint");

-- CreateIndex
CREATE INDEX "FeatureRequest_franchisorId_idx" ON "FeatureRequest"("franchisorId");

-- CreateIndex
CREATE INDEX "FeatureRequest_status_idx" ON "FeatureRequest"("status");

-- CreateIndex
CREATE INDEX "DrawerActivity_locationId_idx" ON "DrawerActivity"("locationId");

-- CreateIndex
CREATE INDEX "DrawerActivity_employeeId_idx" ON "DrawerActivity"("employeeId");

-- CreateIndex
CREATE INDEX "DrawerActivity_type_idx" ON "DrawerActivity"("type");

-- CreateIndex
CREATE INDEX "DrawerActivity_timestamp_idx" ON "DrawerActivity"("timestamp");

-- CreateIndex
CREATE INDEX "DrawerActivity_shiftId_idx" ON "DrawerActivity"("shiftId");

-- CreateIndex
CREATE INDEX "ChatConversation_franchiseId_idx" ON "ChatConversation"("franchiseId");

-- CreateIndex
CREATE INDEX "ChatConversation_status_idx" ON "ChatConversation"("status");

-- CreateIndex
CREATE INDEX "ChatConversation_lastMessageAt_idx" ON "ChatConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WaitlistEntry_locationId_idx" ON "WaitlistEntry"("locationId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_checkedInAt_idx" ON "WaitlistEntry"("checkedInAt");

-- CreateIndex
CREATE INDEX "ClientWaiver_franchiseId_idx" ON "ClientWaiver"("franchiseId");

-- CreateIndex
CREATE INDEX "ClientWaiver_clientId_idx" ON "ClientWaiver"("clientId");

-- CreateIndex
CREATE INDEX "ClientWaiver_customerEmail_idx" ON "ClientWaiver"("customerEmail");

-- CreateIndex
CREATE INDEX "ClientWaiver_signatureDate_idx" ON "ClientWaiver"("signatureDate");

-- CreateIndex
CREATE INDEX "SupportChat_userId_idx" ON "SupportChat"("userId");

-- CreateIndex
CREATE INDEX "SupportChat_status_idx" ON "SupportChat"("status");

-- CreateIndex
CREATE INDEX "SupportChat_priority_idx" ON "SupportChat"("priority");

-- CreateIndex
CREATE INDEX "SupportChat_assigneeId_idx" ON "SupportChat"("assigneeId");

-- CreateIndex
CREATE INDEX "SupportMessage_chatId_idx" ON "SupportMessage"("chatId");

-- CreateIndex
CREATE INDEX "SupportMessage_createdAt_idx" ON "SupportMessage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyProgram_franchiseId_key" ON "LoyaltyProgram"("franchiseId");

-- CreateIndex
CREATE INDEX "LoyaltyRule_programId_isActive_idx" ON "LoyaltyRule"("programId", "isActive");

-- CreateIndex
CREATE INDEX "LoyaltyRule_type_idx" ON "LoyaltyRule"("type");

-- CreateIndex
CREATE INDEX "LoyaltyRule_category_idx" ON "LoyaltyRule"("category");

-- CreateIndex
CREATE INDEX "LoyaltyRule_upc_idx" ON "LoyaltyRule"("upc");

-- CreateIndex
CREATE INDEX "LoyaltyRedeemTier_programId_isActive_idx" ON "LoyaltyRedeemTier"("programId", "isActive");

-- CreateIndex
CREATE INDEX "LoyaltyRedeemTier_pointsRequired_idx" ON "LoyaltyRedeemTier"("pointsRequired");

-- CreateIndex
CREATE INDEX "LoyaltyMember_phone_idx" ON "LoyaltyMember"("phone");

-- CreateIndex
CREATE INDEX "LoyaltyMember_masterAccountId_idx" ON "LoyaltyMember"("masterAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyMember_programId_phone_key" ON "LoyaltyMember"("programId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyMasterAccount_phone_key" ON "LoyaltyMasterAccount"("phone");

-- CreateIndex
CREATE INDEX "PointsTransaction_programId_createdAt_idx" ON "PointsTransaction"("programId", "createdAt");

-- CreateIndex
CREATE INDEX "PointsTransaction_masterAccountId_createdAt_idx" ON "PointsTransaction"("masterAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "PointsTransaction_memberId_idx" ON "PointsTransaction"("memberId");

-- CreateIndex
CREATE INDEX "PointsTransaction_transactionId_type_idx" ON "PointsTransaction"("transactionId", "type");

-- CreateIndex
CREATE INDEX "CheckIn_locationId_idx" ON "CheckIn"("locationId");

-- CreateIndex
CREATE INDEX "CheckIn_status_idx" ON "CheckIn"("status");

-- CreateIndex
CREATE INDEX "CheckIn_checkedInAt_idx" ON "CheckIn"("checkedInAt");

-- CreateIndex
CREATE INDEX "CheckIn_brandId_idx" ON "CheckIn"("brandId");

-- CreateIndex
CREATE INDEX "CheckIn_locationId_status_checkedInAt_idx" ON "CheckIn"("locationId", "status", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckIn_clientId_locationId_checkedInAt_idx" ON "CheckIn"("clientId", "locationId", "checkedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "QrToken_tokenHash_key" ON "QrToken"("tokenHash");

-- CreateIndex
CREATE INDEX "QrToken_locationId_idx" ON "QrToken"("locationId");

-- CreateIndex
CREATE INDEX "QrToken_expiresAt_idx" ON "QrToken"("expiresAt");

-- CreateIndex
CREATE INDEX "QrToken_tokenHash_idx" ON "QrToken"("tokenHash");

-- CreateIndex
CREATE INDEX "LotteryGame_franchiseId_idx" ON "LotteryGame"("franchiseId");

-- CreateIndex
CREATE INDEX "LotteryPack_locationId_idx" ON "LotteryPack"("locationId");

-- CreateIndex
CREATE INDEX "LotteryPack_status_idx" ON "LotteryPack"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LotteryPack_gameId_packNumber_key" ON "LotteryPack"("gameId", "packNumber");

-- CreateIndex
CREATE INDEX "LotteryTransaction_franchiseId_idx" ON "LotteryTransaction"("franchiseId");

-- CreateIndex
CREATE INDEX "LotteryTransaction_locationId_idx" ON "LotteryTransaction"("locationId");

-- CreateIndex
CREATE INDEX "LotteryTransaction_packId_idx" ON "LotteryTransaction"("packId");

-- CreateIndex
CREATE INDEX "LotteryTransaction_createdAt_idx" ON "LotteryTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "TobaccoScanDeal_franchiseId_status_idx" ON "TobaccoScanDeal"("franchiseId", "status");

-- CreateIndex
CREATE INDEX "TobaccoScanDeal_manufacturer_status_idx" ON "TobaccoScanDeal"("manufacturer", "status");

-- CreateIndex
CREATE INDEX "TobaccoScanDeal_startDate_endDate_idx" ON "TobaccoScanDeal"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "TobaccoScanDeal_manufacturerPLU_idx" ON "TobaccoScanDeal"("manufacturerPLU");

-- CreateIndex
CREATE INDEX "TobaccoScanDealUPC_upc_idx" ON "TobaccoScanDealUPC"("upc");

-- CreateIndex
CREATE INDEX "TobaccoScanDealUPC_dealId_idx" ON "TobaccoScanDealUPC"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "TobaccoScanDealUPC_dealId_upc_key" ON "TobaccoScanDealUPC"("dealId", "upc");

-- CreateIndex
CREATE INDEX "TobaccoScanEvent_tobaccoDealId_soldAt_idx" ON "TobaccoScanEvent"("tobaccoDealId", "soldAt");

-- CreateIndex
CREATE INDEX "TobaccoScanEvent_transactionId_idx" ON "TobaccoScanEvent"("transactionId");

-- CreateIndex
CREATE INDEX "TobaccoScanEvent_storeId_soldAt_idx" ON "TobaccoScanEvent"("storeId", "soldAt");

-- CreateIndex
CREATE INDEX "TobaccoScanEvent_claimStatus_idx" ON "TobaccoScanEvent"("claimStatus");

-- CreateIndex
CREATE INDEX "TobaccoScanEvent_claimEligible_claimStatus_idx" ON "TobaccoScanEvent"("claimEligible", "claimStatus");

-- CreateIndex
CREATE INDEX "TobaccoScanEvent_exportBatchId_idx" ON "TobaccoScanEvent"("exportBatchId");

-- CreateIndex
CREATE INDEX "TobaccoScanEvent_upc_soldAt_idx" ON "TobaccoScanEvent"("upc", "soldAt");

-- CreateIndex
CREATE INDEX "TobaccoScanEvent_lineType_idx" ON "TobaccoScanEvent"("lineType");

-- CreateIndex
CREATE INDEX "TobaccoScanExportBatch_franchiseId_manufacturer_idx" ON "TobaccoScanExportBatch"("franchiseId", "manufacturer");

-- CreateIndex
CREATE INDEX "TobaccoScanExportBatch_weekStart_weekEnd_idx" ON "TobaccoScanExportBatch"("weekStart", "weekEnd");

-- CreateIndex
CREATE INDEX "TobaccoScanExportBatch_status_idx" ON "TobaccoScanExportBatch"("status");

-- CreateIndex
CREATE INDEX "ManufacturerConfig_franchiseId_idx" ON "ManufacturerConfig"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerConfig_franchiseId_manufacturer_key" ON "ManufacturerConfig"("franchiseId", "manufacturer");

-- CreateIndex
CREATE INDEX "TaxJurisdiction_franchiseId_idx" ON "TaxJurisdiction"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxJurisdiction_franchiseId_name_key" ON "TaxJurisdiction"("franchiseId", "name");

-- CreateIndex
CREATE INDEX "ExciseTaxRule_jurisdictionId_idx" ON "ExciseTaxRule"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExciseTaxRule_jurisdictionId_productType_key" ON "ExciseTaxRule"("jurisdictionId", "productType");

-- CreateIndex
CREATE INDEX "LocationTaxJurisdiction_locationId_idx" ON "LocationTaxJurisdiction"("locationId");

-- CreateIndex
CREATE INDEX "LocationTaxJurisdiction_jurisdictionId_idx" ON "LocationTaxJurisdiction"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationTaxJurisdiction_locationId_jurisdictionId_key" ON "LocationTaxJurisdiction"("locationId", "jurisdictionId");

-- CreateIndex
CREATE INDEX "LocationTaxCategoryRule_locationId_idx" ON "LocationTaxCategoryRule"("locationId");

-- CreateIndex
CREATE INDEX "LocationTaxCategoryRule_categoryId_idx" ON "LocationTaxCategoryRule"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationTaxCategoryRule_locationId_categoryId_key" ON "LocationTaxCategoryRule"("locationId", "categoryId");

-- CreateIndex
CREATE INDEX "TaxGroup_locationId_idx" ON "TaxGroup"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxGroup_locationId_name_key" ON "TaxGroup"("locationId", "name");

-- CreateIndex
CREATE INDEX "TaxGroupComponent_taxGroupId_idx" ON "TaxGroupComponent"("taxGroupId");

-- CreateIndex
CREATE INDEX "TaxGroupComponent_jurisdictionId_idx" ON "TaxGroupComponent"("jurisdictionId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxGroupComponent_taxGroupId_jurisdictionId_key" ON "TaxGroupComponent"("taxGroupId", "jurisdictionId");

-- CreateIndex
CREATE INDEX "DepartmentTaxDefault_locationId_idx" ON "DepartmentTaxDefault"("locationId");

-- CreateIndex
CREATE INDEX "DepartmentTaxDefault_categoryId_idx" ON "DepartmentTaxDefault"("categoryId");

-- CreateIndex
CREATE INDEX "DepartmentTaxDefault_taxGroupId_idx" ON "DepartmentTaxDefault"("taxGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentTaxDefault_locationId_categoryId_key" ON "DepartmentTaxDefault"("locationId", "categoryId");

-- CreateIndex
CREATE INDEX "PriceChangeLog_itemId_idx" ON "PriceChangeLog"("itemId");

-- CreateIndex
CREATE INDEX "PriceChangeLog_productId_idx" ON "PriceChangeLog"("productId");

-- CreateIndex
CREATE INDEX "PriceChangeLog_changedBy_idx" ON "PriceChangeLog"("changedBy");

-- CreateIndex
CREATE INDEX "PriceChangeLog_createdAt_idx" ON "PriceChangeLog"("createdAt");

-- CreateIndex
CREATE INDEX "PricingRule_locationId_idx" ON "PricingRule"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_locationId_name_key" ON "PricingRule"("locationId", "name");

-- CreateIndex
CREATE INDEX "CategoryPricingRule_locationId_idx" ON "CategoryPricingRule"("locationId");

-- CreateIndex
CREATE INDEX "CategoryPricingRule_categoryId_idx" ON "CategoryPricingRule"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryPricingRule_pricingRuleId_idx" ON "CategoryPricingRule"("pricingRuleId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPricingRule_locationId_categoryId_key" ON "CategoryPricingRule"("locationId", "categoryId");

-- CreateIndex
CREATE INDEX "StoreAccountTransaction_clientId_idx" ON "StoreAccountTransaction"("clientId");

-- CreateIndex
CREATE INDEX "StoreAccountTransaction_franchiseId_idx" ON "StoreAccountTransaction"("franchiseId");

-- CreateIndex
CREATE INDEX "StoreAccountTransaction_type_idx" ON "StoreAccountTransaction"("type");

-- CreateIndex
CREATE INDEX "StoreAccountTransaction_createdAt_idx" ON "StoreAccountTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_transferNumber_key" ON "InventoryTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "InventoryTransfer_fromLocationId_idx" ON "InventoryTransfer"("fromLocationId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_toLocationId_idx" ON "InventoryTransfer"("toLocationId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_status_idx" ON "InventoryTransfer"("status");

-- CreateIndex
CREATE INDEX "TransferItem_transferId_idx" ON "TransferItem"("transferId");

-- CreateIndex
CREATE INDEX "TransferItem_itemId_idx" ON "TransferItem"("itemId");

-- CreateIndex
CREATE INDEX "CashCount_locationId_idx" ON "CashCount"("locationId");

-- CreateIndex
CREATE INDEX "CashCount_employeeId_idx" ON "CashCount"("employeeId");

-- CreateIndex
CREATE INDEX "CashCount_type_idx" ON "CashCount"("type");

-- CreateIndex
CREATE INDEX "CashCount_createdAt_idx" ON "CashCount"("createdAt");

-- CreateIndex
CREATE INDEX "SafeDrop_locationId_idx" ON "SafeDrop"("locationId");

-- CreateIndex
CREATE INDEX "SafeDrop_createdAt_idx" ON "SafeDrop"("createdAt");

-- CreateIndex
CREATE INDEX "DepositLog_locationId_idx" ON "DepositLog"("locationId");

-- CreateIndex
CREATE INDEX "DepositLog_status_idx" ON "DepositLog"("status");

-- CreateIndex
CREATE INDEX "DepositLog_bankDate_idx" ON "DepositLog"("bankDate");

-- CreateIndex
CREATE INDEX "AuditEvent_locationId_idx" ON "AuditEvent"("locationId");

-- CreateIndex
CREATE INDEX "AuditEvent_franchiseId_idx" ON "AuditEvent"("franchiseId");

-- CreateIndex
CREATE INDEX "AuditEvent_employeeId_idx" ON "AuditEvent"("employeeId");

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "AuditEvent_severity_idx" ON "AuditEvent"("severity");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "StoreException_locationId_idx" ON "StoreException"("locationId");

-- CreateIndex
CREATE INDEX "StoreException_franchiseId_idx" ON "StoreException"("franchiseId");

-- CreateIndex
CREATE INDEX "StoreException_exceptionType_idx" ON "StoreException"("exceptionType");

-- CreateIndex
CREATE INDEX "StoreException_severity_idx" ON "StoreException"("severity");

-- CreateIndex
CREATE INDEX "StoreException_status_idx" ON "StoreException"("status");

-- CreateIndex
CREATE INDEX "StoreException_createdAt_idx" ON "StoreException"("createdAt");

-- CreateIndex
CREATE INDEX "LocationPaymentProfile_locationId_idx" ON "LocationPaymentProfile"("locationId");

-- CreateIndex
CREATE INDEX "LocationPaymentProfile_processorMID_idx" ON "LocationPaymentProfile"("processorMID");

-- CreateIndex
CREATE INDEX "LocationPaymentProfile_processorTID_idx" ON "LocationPaymentProfile"("processorTID");

-- CreateIndex
CREATE INDEX "LocationItemOverride_locationId_idx" ON "LocationItemOverride"("locationId");

-- CreateIndex
CREATE INDEX "LocationItemOverride_franchiseId_idx" ON "LocationItemOverride"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationItemOverride_locationId_itemId_key" ON "LocationItemOverride"("locationId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationItemOverride_locationId_productId_key" ON "LocationItemOverride"("locationId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationItemOverride_locationId_serviceId_key" ON "LocationItemOverride"("locationId", "serviceId");

-- CreateIndex
CREATE INDEX "StockOnHand_locationId_idx" ON "StockOnHand"("locationId");

-- CreateIndex
CREATE INDEX "StockOnHand_itemId_idx" ON "StockOnHand"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "StockOnHand_locationId_itemId_key" ON "StockOnHand"("locationId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCard_locationId_key" ON "ClientCard"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_publicId_key" ON "Ticket"("publicId");

-- CreateIndex
CREATE INDEX "Ticket_status_severity_idx" ON "Ticket"("status", "severity");

-- CreateIndex
CREATE INDEX "Ticket_locationId_idx" ON "Ticket"("locationId");

-- CreateIndex
CREATE INDEX "Ticket_franchiseId_idx" ON "Ticket"("franchiseId");

-- CreateIndex
CREATE INDEX "Ticket_assignedToUserId_idx" ON "Ticket"("assignedToUserId");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_publicId_key" ON "Incident"("publicId");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "IncidentImpact_incidentId_idx" ON "IncidentImpact"("incidentId");

-- CreateIndex
CREATE INDEX "Document_franchiseId_docType_idx" ON "Document"("franchiseId", "docType");

-- CreateIndex
CREATE INDEX "Document_locationId_idx" ON "Document"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingRequest_requestNumber_key" ON "OnboardingRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "OnboardingRequest_status_submittedAt_idx" ON "OnboardingRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "OnboardingRequest_assignedToUserId_status_idx" ON "OnboardingRequest"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "OnboardingRequest_franchisorId_status_idx" ON "OnboardingRequest"("franchisorId", "status");

-- CreateIndex
CREATE INDEX "OnboardingRequest_franchiseId_idx" ON "OnboardingRequest"("franchiseId");

-- CreateIndex
CREATE INDEX "OnboardingRequest_dealerBrandingId_idx" ON "OnboardingRequest"("dealerBrandingId");

-- CreateIndex
CREATE INDEX "OnboardingRequestLocation_onboardingRequestId_idx" ON "OnboardingRequestLocation"("onboardingRequestId");

-- CreateIndex
CREATE INDEX "OnboardingRequestLocation_locationId_idx" ON "OnboardingRequestLocation"("locationId");

-- CreateIndex
CREATE INDEX "OnboardingRequestDevice_onboardingRequestId_assignmentStatu_idx" ON "OnboardingRequestDevice"("onboardingRequestId", "assignmentStatus");

-- CreateIndex
CREATE INDEX "OnboardingRequestDevice_terminalId_idx" ON "OnboardingRequestDevice"("terminalId");

-- CreateIndex
CREATE INDEX "OnboardingRequestDocument_onboardingRequestId_status_idx" ON "OnboardingRequestDocument"("onboardingRequestId", "status");

-- CreateIndex
CREATE INDEX "Shipment_onboardingRequestId_status_idx" ON "Shipment"("onboardingRequestId", "status");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_locationId_status_idx" ON "Shipment"("locationId", "status");

-- CreateIndex
CREATE INDEX "ShipmentPackage_shipmentId_idx" ON "ShipmentPackage"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentPackage_shipmentId_packageNo_key" ON "ShipmentPackage"("shipmentId", "packageNo");

-- CreateIndex
CREATE INDEX "ShipmentItem_shipmentId_idx" ON "ShipmentItem"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentItem_terminalId_idx" ON "ShipmentItem"("terminalId");

-- CreateIndex
CREATE INDEX "OnboardingRequestEvent_onboardingRequestId_createdAt_idx" ON "OnboardingRequestEvent"("onboardingRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderTemplate_franchiseId_idx" ON "OrderTemplate"("franchiseId");

-- CreateIndex
CREATE INDEX "OrderTemplateItem_templateId_idx" ON "OrderTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "CashPayout_franchiseId_idx" ON "CashPayout"("franchiseId");

-- CreateIndex
CREATE INDEX "CashPayout_type_idx" ON "CashPayout"("type");

-- CreateIndex
CREATE INDEX "CashPayout_createdAt_idx" ON "CashPayout"("createdAt");

-- CreateIndex
CREATE INDEX "ScratchTicket_franchiseId_idx" ON "ScratchTicket"("franchiseId");

-- CreateIndex
CREATE INDEX "ScratchTicket_barcode_idx" ON "ScratchTicket"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "ScratchTicket_franchiseId_barcode_key" ON "ScratchTicket"("franchiseId", "barcode");

-- CreateIndex
CREATE INDEX "Notification_franchiseId_idx" ON "Notification"("franchiseId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MasterUpcProduct_upc_key" ON "MasterUpcProduct"("upc");

-- CreateIndex
CREATE INDEX "MasterUpcProduct_upc_idx" ON "MasterUpcProduct"("upc");

-- CreateIndex
CREATE INDEX "MasterUpcProduct_brand_idx" ON "MasterUpcProduct"("brand");

-- CreateIndex
CREATE INDEX "MasterUpcProduct_category_idx" ON "MasterUpcProduct"("category");

-- CreateIndex
CREATE INDEX "PrinterConfig_franchiseId_idx" ON "PrinterConfig"("franchiseId");

-- CreateIndex
CREATE INDEX "PrinterConfig_type_idx" ON "PrinterConfig"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "IDScanLog_locationId_idx" ON "IDScanLog"("locationId");

-- CreateIndex
CREATE INDEX "IDScanLog_franchiseId_idx" ON "IDScanLog"("franchiseId");

-- CreateIndex
CREATE INDEX "IDScanLog_createdAt_idx" ON "IDScanLog"("createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_franchiseId_key" ON "IdempotencyKey"("key", "franchiseId");

-- CreateIndex
CREATE INDEX "TimeBlock_userId_idx" ON "TimeBlock"("userId");

-- CreateIndex
CREATE INDEX "TimeBlock_startTime_idx" ON "TimeBlock"("startTime");

-- CreateIndex
CREATE INDEX "BoothRental_franchiseId_idx" ON "BoothRental"("franchiseId");

-- CreateIndex
CREATE INDEX "BoothRental_userId_idx" ON "BoothRental"("userId");

-- CreateIndex
CREATE INDEX "CompensationPlan_userId_effectiveFrom_idx" ON "CompensationPlan"("userId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CompensationPlan_locationId_idx" ON "CompensationPlan"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "CompensationSnapshot_appointmentLineId_key" ON "CompensationSnapshot"("appointmentLineId");

-- CreateIndex
CREATE UNIQUE INDEX "CompensationSnapshot_transactionItemId_key" ON "CompensationSnapshot"("transactionItemId");

-- CreateIndex
CREATE INDEX "UserResource_userId_idx" ON "UserResource"("userId");

-- CreateIndex
CREATE INDEX "UserResource_resourceId_idx" ON "UserResource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserResource_userId_resourceId_key" ON "UserResource"("userId", "resourceId");

-- CreateIndex
CREATE INDEX "EmployeeServicePriceOverride_userId_idx" ON "EmployeeServicePriceOverride"("userId");

-- CreateIndex
CREATE INDEX "EmployeeServicePriceOverride_serviceId_idx" ON "EmployeeServicePriceOverride"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeServicePriceOverride_userId_serviceId_key" ON "EmployeeServicePriceOverride"("userId", "serviceId");

-- CreateIndex
CREATE INDEX "BarberAllowedService_userId_idx" ON "BarberAllowedService"("userId");

-- CreateIndex
CREATE INDEX "BarberAllowedService_serviceId_idx" ON "BarberAllowedService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "BarberAllowedService_userId_serviceId_key" ON "BarberAllowedService"("userId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "SubFranchisee_email_key" ON "SubFranchisee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SubFranchisee_userId_key" ON "SubFranchisee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLog_transactionId_key" ON "PaymentLog"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentLog_status_idx" ON "PaymentLog"("status");

-- CreateIndex
CREATE INDEX "PaymentLog_locationId_idx" ON "PaymentLog"("locationId");

-- CreateIndex
CREATE INDEX "PaymentLog_createdAt_idx" ON "PaymentLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemAlert_type_idx" ON "SystemAlert"("type");

-- CreateIndex
CREATE INDEX "SystemAlert_severity_idx" ON "SystemAlert"("severity");

-- CreateIndex
CREATE INDEX "SystemAlert_locationId_idx" ON "SystemAlert"("locationId");

-- CreateIndex
CREATE INDEX "SystemAlert_acknowledged_idx" ON "SystemAlert"("acknowledged");

-- CreateIndex
CREATE INDEX "SmsUsageLedger_locationId_monthKey_idx" ON "SmsUsageLedger"("locationId", "monthKey");

-- CreateIndex
CREATE INDEX "SmsUsageLedger_campaignId_idx" ON "SmsUsageLedger"("campaignId");

-- CreateIndex
CREATE INDEX "SmsUsageLedger_phone_idx" ON "SmsUsageLedger"("phone");

-- CreateIndex
CREATE INDEX "SmsUsageLedger_status_idx" ON "SmsUsageLedger"("status");

-- CreateIndex
CREATE INDEX "SmsUsageLedger_createdAt_idx" ON "SmsUsageLedger"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SmsMonthlyUsage_locationId_monthKey_key" ON "SmsMonthlyUsage"("locationId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "SmsOptOut_phone_key" ON "SmsOptOut"("phone");

-- CreateIndex
CREATE INDEX "SmsOptOut_phone_idx" ON "SmsOptOut"("phone");

-- CreateIndex
CREATE INDEX "DealSuggestion_locationId_weekOf_idx" ON "DealSuggestion"("locationId", "weekOf");

-- CreateIndex
CREATE INDEX "DealSuggestion_status_idx" ON "DealSuggestion"("status");

-- CreateIndex
CREATE INDEX "DealCampaign_locationId_status_idx" ON "DealCampaign"("locationId", "status");

-- CreateIndex
CREATE INDEX "DealCampaign_locationId_scheduledFor_idx" ON "DealCampaign"("locationId", "scheduledFor");

-- CreateIndex
CREATE INDEX "DealCampaign_templateHash_idx" ON "DealCampaign"("templateHash");

-- CreateIndex
CREATE INDEX "ApiLog_locationId_createdAt_idx" ON "ApiLog"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_route_createdAt_idx" ON "ApiLog"("route", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_createdAt_idx" ON "ApiLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiUsageDaily_locationId_date_idx" ON "ApiUsageDaily"("locationId", "date");

-- CreateIndex
CREATE INDEX "ApiUsageDaily_date_idx" ON "ApiUsageDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsageDaily_date_locationId_route_key" ON "ApiUsageDaily"("date", "locationId", "route");

-- CreateIndex
CREATE INDEX "RmscImportBatch_locationId_importedAt_idx" ON "RmscImportBatch"("locationId", "importedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RmscImportBatch_locationId_fileHash_key" ON "RmscImportBatch"("locationId", "fileHash");

-- CreateIndex
CREATE INDEX "RmscScanRecord_locationId_transactionDate_idx" ON "RmscScanRecord"("locationId", "transactionDate");

-- CreateIndex
CREATE INDEX "RmscScanRecord_locationId_manufacturerName_idx" ON "RmscScanRecord"("locationId", "manufacturerName");

-- CreateIndex
CREATE INDEX "RmscScanRecord_locationId_promoType_idx" ON "RmscScanRecord"("locationId", "promoType");

-- CreateIndex
CREATE INDEX "RmscScanRecord_locationId_loyaltyFlag_idx" ON "RmscScanRecord"("locationId", "loyaltyFlag");

-- CreateIndex
CREATE UNIQUE INDEX "RmscScanRecord_locationId_rowHash_key" ON "RmscScanRecord"("locationId", "rowHash");

-- CreateIndex
CREATE UNIQUE INDEX "InboundFile_fileHash_key" ON "InboundFile"("fileHash");

-- CreateIndex
CREATE INDEX "InboundFile_franchiseId_idx" ON "InboundFile"("franchiseId");

-- CreateIndex
CREATE INDEX "InboundFile_fileHash_idx" ON "InboundFile"("fileHash");

-- CreateIndex
CREATE INDEX "InboundFile_parseStatus_idx" ON "InboundFile"("parseStatus");

-- CreateIndex
CREATE INDEX "VendorInvoice_franchiseId_idx" ON "VendorInvoice"("franchiseId");

-- CreateIndex
CREATE INDEX "VendorInvoice_status_idx" ON "VendorInvoice"("status");

-- CreateIndex
CREATE INDEX "VendorInvoice_vendorName_idx" ON "VendorInvoice"("vendorName");

-- CreateIndex
CREATE INDEX "VendorInvoice_inboundFileId_idx" ON "VendorInvoice"("inboundFileId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorInvoice_supplierId_locationId_invoiceNumber_invoiceDa_key" ON "VendorInvoice"("supplierId", "locationId", "invoiceNumber", "invoiceDate");

-- CreateIndex
CREATE INDEX "VendorInvoiceItem_invoiceId_idx" ON "VendorInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "VendorInvoiceItem_cleanUpc_idx" ON "VendorInvoiceItem"("cleanUpc");

-- CreateIndex
CREATE INDEX "VendorInvoiceItem_matchStatus_idx" ON "VendorInvoiceItem"("matchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBarcodeAlias_barcode_key" ON "ProductBarcodeAlias"("barcode");

-- CreateIndex
CREATE INDEX "ProductBarcodeAlias_productId_idx" ON "ProductBarcodeAlias"("productId");

-- CreateIndex
CREATE INDEX "ProductBarcodeAlias_barcode_idx" ON "ProductBarcodeAlias"("barcode");

-- CreateIndex
CREATE INDEX "ProductCostHistory_productId_idx" ON "ProductCostHistory"("productId");

-- CreateIndex
CREATE INDEX "ProductCostHistory_changedAt_idx" ON "ProductCostHistory"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FtpConfig_franchiseId_key" ON "FtpConfig"("franchiseId");

-- CreateIndex
CREATE INDEX "OwnerSignal_franchiseId_signalType_signalDate_idx" ON "OwnerSignal"("franchiseId", "signalType", "signalDate");

-- CreateIndex
CREATE INDEX "OwnerSignal_franchiseId_processed_createdAt_idx" ON "OwnerSignal"("franchiseId", "processed", "createdAt");

-- CreateIndex
CREATE INDEX "OwnerSignal_dedupKey_idx" ON "OwnerSignal"("dedupKey");

-- CreateIndex
CREATE INDEX "OwnerSignal_jobRunId_idx" ON "OwnerSignal"("jobRunId");

-- CreateIndex
CREATE INDEX "OwnerIssue_franchiseId_status_idx" ON "OwnerIssue"("franchiseId", "status");

-- CreateIndex
CREATE INDEX "OwnerIssue_franchiseId_status_severity_idx" ON "OwnerIssue"("franchiseId", "status", "severity");

-- CreateIndex
CREATE INDEX "OwnerIssue_franchiseId_assignedToId_status_idx" ON "OwnerIssue"("franchiseId", "assignedToId", "status");

-- CreateIndex
CREATE INDEX "OwnerIssue_locationId_status_idx" ON "OwnerIssue"("locationId", "status");

-- CreateIndex
CREATE INDEX "OwnerIssue_dedupKey_idx" ON "OwnerIssue"("dedupKey");

-- CreateIndex
CREATE INDEX "OwnerIssue_franchiseId_issueType_status_idx" ON "OwnerIssue"("franchiseId", "issueType", "status");

-- CreateIndex
CREATE INDEX "OwnerIssue_priorityScore_idx" ON "OwnerIssue"("priorityScore");

-- CreateIndex
CREATE INDEX "OwnerIssue_dueAt_idx" ON "OwnerIssue"("dueAt");

-- CreateIndex
CREATE INDEX "OwnerIssue_status_snoozedUntil_idx" ON "OwnerIssue"("status", "snoozedUntil");

-- CreateIndex
CREATE INDEX "OwnerIssueEvent_ownerIssueId_createdAt_idx" ON "OwnerIssueEvent"("ownerIssueId", "createdAt");

-- CreateIndex
CREATE INDEX "StoreHealthScore_franchiseId_date_idx" ON "StoreHealthScore"("franchiseId", "date");

-- CreateIndex
CREATE INDEX "StoreHealthScore_overallStatus_idx" ON "StoreHealthScore"("overallStatus");

-- CreateIndex
CREATE UNIQUE INDEX "StoreHealthScore_locationId_date_key" ON "StoreHealthScore"("locationId", "date");

-- CreateIndex
CREATE INDEX "ManagerScorecard_franchiseId_period_idx" ON "ManagerScorecard"("franchiseId", "period");

-- CreateIndex
CREATE INDEX "ManagerScorecard_locationId_idx" ON "ManagerScorecard"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerScorecard_userId_period_key" ON "ManagerScorecard"("userId", "period");

-- CreateIndex
CREATE INDEX "OwnerDigest_userId_digestType_idx" ON "OwnerDigest"("userId", "digestType");

-- CreateIndex
CREATE INDEX "OwnerDigest_franchiseId_idx" ON "OwnerDigest"("franchiseId");

-- CreateIndex
CREATE INDEX "OwnerDigest_status_idx" ON "OwnerDigest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerDigest_userId_digestType_channel_businessDate_key" ON "OwnerDigest"("userId", "digestType", "channel", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerNotificationPreference_userId_franchiseId_key" ON "OwnerNotificationPreference"("userId", "franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingProfile_locationId_key" ON "BookingProfile"("locationId");

-- CreateIndex
CREATE INDEX "BookingProfile_isPublished_idx" ON "BookingProfile"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontProfile_locationId_key" ON "StorefrontProfile"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontOrder_orderNumber_key" ON "StorefrontOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "StorefrontOrder_locationId_idx" ON "StorefrontOrder"("locationId");

-- CreateIndex
CREATE INDEX "StorefrontOrder_status_idx" ON "StorefrontOrder"("status");

-- CreateIndex
CREATE INDEX "StorefrontOrder_orderNumber_idx" ON "StorefrontOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "StorefrontOrderItem_orderId_idx" ON "StorefrontOrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailEvent_messageId_key" ON "EmailEvent"("messageId");

-- CreateIndex
CREATE INDEX "EmailEvent_franchiseId_idx" ON "EmailEvent"("franchiseId");

-- CreateIndex
CREATE INDEX "EmailEvent_lane_idx" ON "EmailEvent"("lane");

-- CreateIndex
CREATE INDEX "EmailEvent_status_idx" ON "EmailEvent"("status");

-- CreateIndex
CREATE INDEX "EmailEvent_recipientEmail_idx" ON "EmailEvent"("recipientEmail");

-- CreateIndex
CREATE INDEX "EmailEvent_createdAt_idx" ON "EmailEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_email_key" ON "EmailSuppression"("email");

-- CreateIndex
CREATE INDEX "EmailSuppression_lane_idx" ON "EmailSuppression"("lane");

-- CreateIndex
CREATE UNIQUE INDEX "SalonLoyaltyProgram_code_key" ON "SalonLoyaltyProgram"("code");

-- CreateIndex
CREATE INDEX "SalonLoyaltyProgram_franchisorId_idx" ON "SalonLoyaltyProgram"("franchisorId");

-- CreateIndex
CREATE INDEX "SalonLoyaltyProgram_franchiseId_idx" ON "SalonLoyaltyProgram"("franchiseId");

-- CreateIndex
CREATE INDEX "SalonLoyaltyProgram_locationId_idx" ON "SalonLoyaltyProgram"("locationId");

-- CreateIndex
CREATE INDEX "SalonLoyaltyProgram_status_idx" ON "SalonLoyaltyProgram"("status");

-- CreateIndex
CREATE INDEX "SalonLoyaltyProgram_programType_idx" ON "SalonLoyaltyProgram"("programType");

-- CreateIndex
CREATE INDEX "SalonCustomerLoyaltyMembership_clientId_loyaltyProgramId_idx" ON "SalonCustomerLoyaltyMembership"("clientId", "loyaltyProgramId");

-- CreateIndex
CREATE INDEX "SalonCustomerLoyaltyMembership_status_rewardExpiresAt_idx" ON "SalonCustomerLoyaltyMembership"("status", "rewardExpiresAt");

-- CreateIndex
CREATE INDEX "SalonCustomerLoyaltyMembership_homeLocationId_status_idx" ON "SalonCustomerLoyaltyMembership"("homeLocationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SalonCustomerLoyaltyMembership_clientId_loyaltyProgramId_key" ON "SalonCustomerLoyaltyMembership"("clientId", "loyaltyProgramId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonLoyaltyLedgerEntry_idempotencyKey_key" ON "SalonLoyaltyLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SalonLoyaltyLedgerEntry_membershipId_idx" ON "SalonLoyaltyLedgerEntry"("membershipId");

-- CreateIndex
CREATE INDEX "SalonLoyaltyLedgerEntry_transactionId_idx" ON "SalonLoyaltyLedgerEntry"("transactionId");

-- CreateIndex
CREATE INDEX "SalonLoyaltyLedgerEntry_sourceRefundTransactionId_idx" ON "SalonLoyaltyLedgerEntry"("sourceRefundTransactionId");

-- CreateIndex
CREATE INDEX "SalonLoyaltyLedgerEntry_entryType_idx" ON "SalonLoyaltyLedgerEntry"("entryType");

-- CreateIndex
CREATE INDEX "SalonLoyaltyLedgerEntry_createdAt_idx" ON "SalonLoyaltyLedgerEntry"("createdAt");

-- CreateIndex
CREATE INDEX "SalonLoyaltyLedgerEntry_clientId_loyaltyProgramId_createdAt_idx" ON "SalonLoyaltyLedgerEntry"("clientId", "loyaltyProgramId", "createdAt");

-- CreateIndex
CREATE INDEX "SalonTransactionLoyaltyRedemption_transactionId_idx" ON "SalonTransactionLoyaltyRedemption"("transactionId");

-- CreateIndex
CREATE INDEX "SalonTransactionLoyaltyRedemption_membershipId_idx" ON "SalonTransactionLoyaltyRedemption"("membershipId");

-- CreateIndex
CREATE INDEX "SalonTransactionLoyaltyRedemption_loyaltyProgramId_idx" ON "SalonTransactionLoyaltyRedemption"("loyaltyProgramId");

-- AddForeignKey
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "FeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_providerSmsConfigId_fkey" FOREIGN KEY ("providerSmsConfigId") REFERENCES "ProviderSmsConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchisorMembership" ADD CONSTRAINT "FranchisorMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchisorMembership" ADD CONSTRAINT "FranchisorMembership_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleDefaultPermission" ADD CONSTRAINT "RoleDefaultPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLocationAccess" ADD CONSTRAINT "UserLocationAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assignedStationId_fkey" FOREIGN KEY ("assignedStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Franchise" ADD CONSTRAINT "Franchise_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Franchise" ADD CONSTRAINT "Franchise_subFranchiseeId_fkey" FOREIGN KEY ("subFranchiseeId") REFERENCES "SubFranchisee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FranchiseSettings" ADD CONSTRAINT "FranchiseSettings_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSettings" ADD CONSTRAINT "ReminderSettings_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCredits" ADD CONSTRAINT "SmsCredits_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMarketingRule" ADD CONSTRAINT "SmsMarketingRule_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPromo" ADD CONSTRAINT "CustomerPromo_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPromo" ADD CONSTRAINT "CustomerPromo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosRegisterLayout" ADD CONSTRAINT "PosRegisterLayout_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PulseDeviceToken" ADD CONSTRAINT "PulseDeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_dedicatedTerminalId_fkey" FOREIGN KEY ("dedicatedTerminalId") REFERENCES "PaymentTerminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StationDisplayProfile" ADD CONSTRAINT "StationDisplayProfile_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustedDevice" ADD CONSTRAINT "TrustedDevice_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTerminal" ADD CONSTRAINT "PaymentTerminal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpansionRequest" ADD CONSTRAINT "ExpansionRequest_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpansionRequest" ADD CONSTRAINT "ExpansionRequest_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalServiceCategory" ADD CONSTRAINT "GlobalServiceCategory_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalService" ADD CONSTRAINT "GlobalService_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalService" ADD CONSTRAINT "GlobalService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "GlobalServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationServiceOverride" ADD CONSTRAINT "LocationServiceOverride_globalServiceId_fkey" FOREIGN KEY ("globalServiceId") REFERENCES "GlobalService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationServiceOverride" ADD CONSTRAINT "LocationServiceOverride_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalProduct" ADD CONSTRAINT "GlobalProduct_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedCategory" ADD CONSTRAINT "UnifiedCategory_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiedCategory" ADD CONSTRAINT "UnifiedCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "UnifiedCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "UnifiedCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLineItem" ADD CONSTRAINT "ItemLineItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLineItem" ADD CONSTRAINT "ItemLineItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLineItem" ADD CONSTRAINT "ItemLineItem_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_globalServiceId_fkey" FOREIGN KEY ("globalServiceId") REFERENCES "GlobalService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeService" ADD CONSTRAINT "EmployeeService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "RecurringAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagAlongItem" ADD CONSTRAINT "TagAlongItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagAlongItem" ADD CONSTRAINT "TagAlongItem_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cashDrawerSessionId_fkey" FOREIGN KEY ("cashDrawerSessionId") REFERENCES "CashDrawerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_originalTransactionId_fkey" FOREIGN KEY ("originalTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLineItem" ADD CONSTRAINT "TransactionLineItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLineItem" ADD CONSTRAINT "TransactionLineItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLineItem" ADD CONSTRAINT "TransactionLineItem_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLineItem" ADD CONSTRAINT "TransactionLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionTaxLine" ADD CONSTRAINT "TransactionTaxLine_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyConfig" ADD CONSTRAINT "RoyaltyConfig_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoyaltyRecord" ADD CONSTRAINT "RoyaltyRecord_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveCart" ADD CONSTRAINT "ActiveCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Terminal" ADD CONSTRAINT "Terminal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitPayoutConfig" ADD CONSTRAINT "SplitPayoutConfig_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMembership" ADD CONSTRAINT "ClientMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLoyalty" ADD CONSTRAINT "ClientLoyalty_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawerSession" ADD CONSTRAINT "CashDrawerSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawerSession" ADD CONSTRAINT "CashDrawerSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrop" ADD CONSTRAINT "CashDrop_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashDrawerSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspendedTransaction" ADD CONSTRAINT "SuspendedTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspendedTransaction" ADD CONSTRAINT "SuspendedTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionProduct" ADD CONSTRAINT "PromotionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Franchisor" ADD CONSTRAINT "Franchisor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Franchisor" ADD CONSTRAINT "Franchisor_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Franchisor" ADD CONSTRAINT "Franchisor_dealerBrandingId_fkey" FOREIGN KEY ("dealerBrandingId") REFERENCES "DealerBranding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationProvisioningTask" ADD CONSTRAINT "LocationProvisioningTask_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationProvisioningTask" ADD CONSTRAINT "LocationProvisioningTask_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingCase" ADD CONSTRAINT "OffboardingCase_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingCase" ADD CONSTRAINT "OffboardingCase_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessConfig" ADD CONSTRAINT "BusinessConfig_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionTier" ADD CONSTRAINT "CommissionTier_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCommissionOverride" ADD CONSTRAINT "ServiceCommissionOverride_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePaymentConfig" ADD CONSTRAINT "EmployeePaymentConfig_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollEntry" ADD CONSTRAINT "PayrollEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawerActivity" ADD CONSTRAINT "DrawerActivity_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawerActivity" ADD CONSTRAINT "DrawerActivity_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashDrawerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawerActivity" ADD CONSTRAINT "DrawerActivity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawerActivity" ADD CONSTRAINT "DrawerActivity_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportChat" ADD CONSTRAINT "SupportChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportChat" ADD CONSTRAINT "SupportChat_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "SupportChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyRule" ADD CONSTRAINT "LoyaltyRule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyRedeemTier" ADD CONSTRAINT "LoyaltyRedeemTier_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMember" ADD CONSTRAINT "LoyaltyMember_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyMember" ADD CONSTRAINT "LoyaltyMember_masterAccountId_fkey" FOREIGN KEY ("masterAccountId") REFERENCES "LoyaltyMasterAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_masterAccountId_fkey" FOREIGN KEY ("masterAccountId") REFERENCES "LoyaltyMasterAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LoyaltyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagePurchase" ADD CONSTRAINT "PackagePurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagePurchase" ADD CONSTRAINT "PackagePurchase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageUsage" ADD CONSTRAINT "PackageUsage_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PackagePurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientPhoto" ADD CONSTRAINT "ClientPhoto_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringAppointment" ADD CONSTRAINT "RecurringAppointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringAppointment" ADD CONSTRAINT "RecurringAppointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringAppointment" ADD CONSTRAINT "RecurringAppointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrToken" ADD CONSTRAINT "QrToken_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryGame" ADD CONSTRAINT "LotteryGame_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryPack" ADD CONSTRAINT "LotteryPack_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "LotteryGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryPack" ADD CONSTRAINT "LotteryPack_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryTransaction" ADD CONSTRAINT "LotteryTransaction_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryTransaction" ADD CONSTRAINT "LotteryTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryTransaction" ADD CONSTRAINT "LotteryTransaction_packId_fkey" FOREIGN KEY ("packId") REFERENCES "LotteryPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TobaccoScanDeal" ADD CONSTRAINT "TobaccoScanDeal_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TobaccoScanDealUPC" ADD CONSTRAINT "TobaccoScanDealUPC_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "TobaccoScanDeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TobaccoScanDealUPC" ADD CONSTRAINT "TobaccoScanDealUPC_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TobaccoScanEvent" ADD CONSTRAINT "TobaccoScanEvent_tobaccoDealId_fkey" FOREIGN KEY ("tobaccoDealId") REFERENCES "TobaccoScanDeal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TobaccoScanEvent" ADD CONSTRAINT "TobaccoScanEvent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TobaccoScanEvent" ADD CONSTRAINT "TobaccoScanEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TobaccoScanEvent" ADD CONSTRAINT "TobaccoScanEvent_exportBatchId_fkey" FOREIGN KEY ("exportBatchId") REFERENCES "TobaccoScanExportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TobaccoScanExportBatch" ADD CONSTRAINT "TobaccoScanExportBatch_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerConfig" ADD CONSTRAINT "ManufacturerConfig_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxJurisdiction" ADD CONSTRAINT "TaxJurisdiction_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExciseTaxRule" ADD CONSTRAINT "ExciseTaxRule_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTaxJurisdiction" ADD CONSTRAINT "LocationTaxJurisdiction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTaxJurisdiction" ADD CONSTRAINT "LocationTaxJurisdiction_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTaxCategoryRule" ADD CONSTRAINT "LocationTaxCategoryRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationTaxCategoryRule" ADD CONSTRAINT "LocationTaxCategoryRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroup" ADD CONSTRAINT "TaxGroup_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroupComponent" ADD CONSTRAINT "TaxGroupComponent_taxGroupId_fkey" FOREIGN KEY ("taxGroupId") REFERENCES "TaxGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxGroupComponent" ADD CONSTRAINT "TaxGroupComponent_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentTaxDefault" ADD CONSTRAINT "DepartmentTaxDefault_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentTaxDefault" ADD CONSTRAINT "DepartmentTaxDefault_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentTaxDefault" ADD CONSTRAINT "DepartmentTaxDefault_taxGroupId_fkey" FOREIGN KEY ("taxGroupId") REFERENCES "TaxGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChangeLog" ADD CONSTRAINT "PriceChangeLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChangeLog" ADD CONSTRAINT "PriceChangeLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPricingRule" ADD CONSTRAINT "CategoryPricingRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPricingRule" ADD CONSTRAINT "CategoryPricingRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "UnifiedCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryPricingRule" ADD CONSTRAINT "CategoryPricingRule_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreAccountTransaction" ADD CONSTRAINT "StoreAccountTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCount" ADD CONSTRAINT "CashCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeDrop" ADD CONSTRAINT "SafeDrop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositLog" ADD CONSTRAINT "DepositLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreException" ADD CONSTRAINT "StoreException_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPaymentProfile" ADD CONSTRAINT "LocationPaymentProfile_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationItemOverride" ADD CONSTRAINT "LocationItemOverride_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationItemOverride" ADD CONSTRAINT "LocationItemOverride_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationItemOverride" ADD CONSTRAINT "LocationItemOverride_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationItemOverride" ADD CONSTRAINT "LocationItemOverride_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationItemOverride" ADD CONSTRAINT "LocationItemOverride_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOnHand" ADD CONSTRAINT "StockOnHand_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOnHand" ADD CONSTRAINT "StockOnHand_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOnHand" ADD CONSTRAINT "StockOnHand_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCard" ADD CONSTRAINT "ClientCard_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentImpact" ADD CONSTRAINT "IncidentImpact_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentImpact" ADD CONSTRAINT "IncidentImpact_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentImpact" ADD CONSTRAINT "IncidentImpact_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_dealerBrandingId_fkey" FOREIGN KEY ("dealerBrandingId") REFERENCES "DealerBranding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestLocation" ADD CONSTRAINT "OnboardingRequestLocation_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestLocation" ADD CONSTRAINT "OnboardingRequestLocation_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestLocation" ADD CONSTRAINT "OnboardingRequestLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestDevice" ADD CONSTRAINT "OnboardingRequestDevice_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestDevice" ADD CONSTRAINT "OnboardingRequestDevice_requestLocationId_fkey" FOREIGN KEY ("requestLocationId") REFERENCES "OnboardingRequestLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestDevice" ADD CONSTRAINT "OnboardingRequestDevice_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestDevice" ADD CONSTRAINT "OnboardingRequestDevice_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestDocument" ADD CONSTRAINT "OnboardingRequestDocument_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestDocument" ADD CONSTRAINT "OnboardingRequestDocument_requestLocationId_fkey" FOREIGN KEY ("requestLocationId") REFERENCES "OnboardingRequestLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestDocument" ADD CONSTRAINT "OnboardingRequestDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestDocument" ADD CONSTRAINT "OnboardingRequestDocument_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentPackage" ADD CONSTRAINT "ShipmentPackage_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ShipmentPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestEvent" ADD CONSTRAINT "OnboardingRequestEvent_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequestEvent" ADD CONSTRAINT "OnboardingRequestEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTemplate" ADD CONSTRAINT "OrderTemplate_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTemplate" ADD CONSTRAINT "OrderTemplate_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTemplateItem" ADD CONSTRAINT "OrderTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OrderTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTemplateItem" ADD CONSTRAINT "OrderTemplateItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPayout" ADD CONSTRAINT "CashPayout_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPayout" ADD CONSTRAINT "CashPayout_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPayout" ADD CONSTRAINT "CashPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPayout" ADD CONSTRAINT "CashPayout_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashDrawerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScratchTicket" ADD CONSTRAINT "ScratchTicket_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterConfig" ADD CONSTRAINT "PrinterConfig_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationPlan" ADD CONSTRAINT "CompensationPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationPlan" ADD CONSTRAINT "CompensationPlan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserResource" ADD CONSTRAINT "UserResource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserResource" ADD CONSTRAINT "UserResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeServicePriceOverride" ADD CONSTRAINT "EmployeeServicePriceOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeServicePriceOverride" ADD CONSTRAINT "EmployeeServicePriceOverride_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarberAllowedService" ADD CONSTRAINT "BarberAllowedService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarberAllowedService" ADD CONSTRAINT "BarberAllowedService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubFranchisee" ADD CONSTRAINT "SubFranchisee_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubFranchisee" ADD CONSTRAINT "SubFranchisee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsUsageLedger" ADD CONSTRAINT "SmsUsageLedger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMonthlyUsage" ADD CONSTRAINT "SmsMonthlyUsage_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealSuggestion" ADD CONSTRAINT "DealSuggestion_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealCampaign" ADD CONSTRAINT "DealCampaign_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealCampaign" ADD CONSTRAINT "DealCampaign_dealSuggestionId_fkey" FOREIGN KEY ("dealSuggestionId") REFERENCES "DealSuggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealCampaign" ADD CONSTRAINT "DealCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmscImportBatch" ADD CONSTRAINT "RmscImportBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmscScanRecord" ADD CONSTRAINT "RmscScanRecord_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "RmscImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmscScanRecord" ADD CONSTRAINT "RmscScanRecord_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundFile" ADD CONSTRAINT "InboundFile_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoice" ADD CONSTRAINT "VendorInvoice_inboundFileId_fkey" FOREIGN KEY ("inboundFileId") REFERENCES "InboundFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorInvoiceItem" ADD CONSTRAINT "VendorInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "VendorInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBarcodeAlias" ADD CONSTRAINT "ProductBarcodeAlias_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostHistory" ADD CONSTRAINT "ProductCostHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCostHistory" ADD CONSTRAINT "ProductCostHistory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FtpConfig" ADD CONSTRAINT "FtpConfig_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerIssue" ADD CONSTRAINT "OwnerIssue_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerIssueEvent" ADD CONSTRAINT "OwnerIssueEvent_ownerIssueId_fkey" FOREIGN KEY ("ownerIssueId") REFERENCES "OwnerIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingProfile" ADD CONSTRAINT "BookingProfile_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontProfile" ADD CONSTRAINT "StorefrontProfile_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontOrder" ADD CONSTRAINT "StorefrontOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontOrderItem" ADD CONSTRAINT "StorefrontOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "StorefrontOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonLoyaltyProgramRule" ADD CONSTRAINT "SalonLoyaltyProgramRule_loyaltyProgramId_fkey" FOREIGN KEY ("loyaltyProgramId") REFERENCES "SalonLoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonCustomerLoyaltyMembership" ADD CONSTRAINT "SalonCustomerLoyaltyMembership_loyaltyProgramId_fkey" FOREIGN KEY ("loyaltyProgramId") REFERENCES "SalonLoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonCustomerLoyaltyMembership" ADD CONSTRAINT "SalonCustomerLoyaltyMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonLoyaltyLedgerEntry" ADD CONSTRAINT "SalonLoyaltyLedgerEntry_loyaltyProgramId_fkey" FOREIGN KEY ("loyaltyProgramId") REFERENCES "SalonLoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonLoyaltyLedgerEntry" ADD CONSTRAINT "SalonLoyaltyLedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonLoyaltyLedgerEntry" ADD CONSTRAINT "SalonLoyaltyLedgerEntry_sourceRefundTransactionId_fkey" FOREIGN KEY ("sourceRefundTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonTransactionLoyaltyRedemption" ADD CONSTRAINT "SalonTransactionLoyaltyRedemption_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
