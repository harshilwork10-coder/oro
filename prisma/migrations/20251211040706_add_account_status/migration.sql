/*
  Warnings:

  - You are about to drop the column `cashDiscountEnabled` on the `Franchisor` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Service` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `LoyaltyProgram` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "voidReason" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "voidedAt" DATETIME;
ALTER TABLE "Transaction" ADD COLUMN "voidedById" TEXT;

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoleDefaultPermission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "RoleDefaultPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReminderSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "confirmationEmail" BOOLEAN NOT NULL DEFAULT true,
    "reminder24hEmail" BOOLEAN NOT NULL DEFAULT true,
    "reminder2hEmail" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsApproved" BOOLEAN NOT NULL DEFAULT false,
    "smsRequestedAt" DATETIME,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReminderSettings_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProviderSmsConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "package1Name" TEXT NOT NULL DEFAULT 'Starter',
    "package1Credits" INTEGER NOT NULL DEFAULT 100,
    "package1Price" DECIMAL NOT NULL DEFAULT 4.99,
    "package2Name" TEXT NOT NULL DEFAULT 'Growth',
    "package2Credits" INTEGER NOT NULL DEFAULT 200,
    "package2Price" DECIMAL NOT NULL DEFAULT 8.99,
    "package3Name" TEXT NOT NULL DEFAULT 'Business',
    "package3Credits" INTEGER NOT NULL DEFAULT 500,
    "package3Price" DECIMAL NOT NULL DEFAULT 19.99,
    "package4Name" TEXT NOT NULL DEFAULT 'Enterprise',
    "package4Credits" INTEGER NOT NULL DEFAULT 1000,
    "package4Price" DECIMAL NOT NULL DEFAULT 34.99,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SmsCredits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "creditsRemaining" INTEGER NOT NULL DEFAULT 0,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastTopupAt" DATETIME,
    "lastPackage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SmsCredits_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "toPhone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "twilioSid" TEXT,
    "errorMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SmsMarketingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "daysInactive" INTEGER DEFAULT 28,
    "daysInactiveMax" INTEGER,
    "minSpendTotal" DECIMAL,
    "maxSpendTotal" DECIMAL,
    "minSpendPerVisit" DECIMAL,
    "minVisitCount" INTEGER,
    "maxVisitCount" INTEGER,
    "lastServiceId" TEXT,
    "anyServiceId" TEXT,
    "hasPhone" BOOLEAN NOT NULL DEFAULT true,
    "hasEmail" BOOLEAN NOT NULL DEFAULT false,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL NOT NULL DEFAULT 10,
    "validityDays" INTEGER NOT NULL DEFAULT 7,
    "messageTemplate" TEXT,
    "maxSendsPerDay" INTEGER,
    "maxSendsTotal" INTEGER,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SmsMarketingRule_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerPromo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME NOT NULL,
    "redeemedAt" DATETIME,
    "excludeFromLoyalty" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerPromo_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CustomerPromo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpansionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseeId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "proposedName" TEXT NOT NULL,
    "proposedAddress" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpansionRequest_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpansionRequest_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RateLimitRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FeatureRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestNotes" TEXT,
    "responseNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeatureRequest_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DrawerActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "amount" REAL,
    "employeeId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shiftId" TEXT,
    "locationId" TEXT NOT NULL,
    "transactionId" TEXT,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "alertLevel" TEXT,
    CONSTRAINT "DrawerActivity_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DrawerActivity_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashDrawerSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DrawerActivity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DrawerActivity_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "clientId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "lastMessageAt" DATETIME,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatConversation_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatConversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChatConversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seatedAt" DATETIME,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WaitlistEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientWaiver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT,
    "appointmentId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "waiverVersion" TEXT NOT NULL DEFAULT '1.0',
    "waiverText" TEXT NOT NULL,
    "signatureName" TEXT NOT NULL,
    "signatureDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupportChat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "subject" TEXT,
    "assigneeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    CONSTRAINT "SupportChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupportChat_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "senderId" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "SupportChat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoyaltyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSpend" DECIMAL NOT NULL DEFAULT 0,
    "masterAccountId" TEXT,
    "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyMember_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoyaltyMember_masterAccountId_fkey" FOREIGN KEY ("masterAccountId") REFERENCES "LoyaltyMasterAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoyaltyMasterAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "pooledBalance" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PointsTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT,
    "masterAccountId" TEXT,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "transactionId" TEXT,
    "franchiseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsTransaction_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PointsTransaction_masterAccountId_fkey" FOREIGN KEY ("masterAccountId") REFERENCES "LoyaltyMasterAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceId" TEXT NOT NULL,
    "sessionsIncluded" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 365,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServicePackage_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ServicePackage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackagePurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "packageId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sessionsUsed" INTEGER NOT NULL DEFAULT 0,
    "sessionsRemaining" INTEGER NOT NULL,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackagePurchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PackagePurchase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PackageUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseId" TEXT NOT NULL,
    "usedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointmentId" TEXT,
    "employeeId" TEXT,
    "notes" TEXT,
    CONSTRAINT "PackageUsage_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PackagePurchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CHAIR',
    "description" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "allowedServiceIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoType" TEXT NOT NULL DEFAULT 'PROGRESS',
    "caption" TEXT,
    "serviceId" TEXT,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientPhoto_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'GENERAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecurringAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "employeeId" TEXT,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "preferredTime" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "maxOccurrences" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringAppointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringAppointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringAppointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "resourceId" TEXT,
    "recurringId" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "RecurringAppointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("clientId", "createdAt", "employeeId", "endTime", "id", "locationId", "notes", "serviceId", "startTime", "status", "updatedAt") SELECT "clientId", "createdAt", "employeeId", "endTime", "id", "locationId", "notes", "serviceId", "startTime", "status", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE TABLE "new_AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT,
    "userRole" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AuditLog" ("action", "changes", "createdAt", "entityId", "entityType", "id", "ipAddress", "userAgent", "userId") SELECT "action", "changes", "createdAt", "entityId", "entityType", "id", "ipAddress", "userAgent", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE TABLE "new_BusinessConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "usesCommissions" BOOLEAN NOT NULL DEFAULT true,
    "usesInventory" BOOLEAN NOT NULL DEFAULT true,
    "usesAppointments" BOOLEAN NOT NULL DEFAULT true,
    "usesScheduling" BOOLEAN NOT NULL DEFAULT true,
    "usesVirtualKeypad" BOOLEAN NOT NULL DEFAULT true,
    "usesLoyalty" BOOLEAN NOT NULL DEFAULT true,
    "usesGiftCards" BOOLEAN NOT NULL DEFAULT true,
    "usesMemberships" BOOLEAN NOT NULL DEFAULT true,
    "usesReferrals" BOOLEAN NOT NULL DEFAULT true,
    "usesRoyalties" BOOLEAN NOT NULL DEFAULT false,
    "usesTipping" BOOLEAN NOT NULL DEFAULT true,
    "usesDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "taxRate" REAL NOT NULL DEFAULT 0.08,
    "taxServices" BOOLEAN NOT NULL DEFAULT true,
    "taxProducts" BOOLEAN NOT NULL DEFAULT true,
    "usesRetailProducts" BOOLEAN NOT NULL DEFAULT true,
    "usesServices" BOOLEAN NOT NULL DEFAULT true,
    "usesEmailMarketing" BOOLEAN NOT NULL DEFAULT true,
    "usesSMSMarketing" BOOLEAN NOT NULL DEFAULT true,
    "usesReviewManagement" BOOLEAN NOT NULL DEFAULT true,
    "usesMultiLocation" BOOLEAN NOT NULL DEFAULT false,
    "usesFranchising" BOOLEAN NOT NULL DEFAULT false,
    "usesTimeTracking" BOOLEAN NOT NULL DEFAULT true,
    "usesPayroll" BOOLEAN NOT NULL DEFAULT false,
    "shiftRequirement" TEXT NOT NULL DEFAULT 'BOTH',
    "reviewRequestTiming" TEXT NOT NULL DEFAULT 'MANUAL',
    "reviewRequestMethod" TEXT NOT NULL DEFAULT 'SMS',
    "reviewIncentive" DECIMAL NOT NULL DEFAULT 0,
    "tipPromptEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tipPromptTiming" TEXT NOT NULL DEFAULT 'AT_CHECKOUT',
    "tipSuggestions" TEXT NOT NULL DEFAULT '[15,20,25]',
    "tipType" TEXT NOT NULL DEFAULT 'PERCENT',
    "tipPoolingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "commissionCalculation" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "commissionVisibility" TEXT NOT NULL DEFAULT 'ALWAYS',
    "loyaltyPointsAwarding" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "loyaltyPointsRatio" DECIMAL NOT NULL DEFAULT 1,
    "loyaltyBirthdayBonus" DECIMAL NOT NULL DEFAULT 0,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderTiming" TEXT NOT NULL DEFAULT '24_HOURS',
    "reminderMethod" TEXT NOT NULL DEFAULT 'SMS',
    "cancellationFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cancellationFeeAmount" DECIMAL NOT NULL DEFAULT 0,
    "cancellationWindow" INTEGER NOT NULL DEFAULT 24,
    "membershipAutoBilling" BOOLEAN NOT NULL DEFAULT true,
    "membershipFailedPaymentRetry" INTEGER NOT NULL DEFAULT 3,
    "giftCardAutoEmail" BOOLEAN NOT NULL DEFAULT true,
    "giftCardPhysical" BOOLEAN NOT NULL DEFAULT true,
    "discountRequiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "discountMaxPercent" DECIMAL NOT NULL DEFAULT 50,
    "lowStockAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "allowMultiProvider" BOOLEAN NOT NULL DEFAULT false,
    "newClientBonusEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newClientBonusAmount" DECIMAL NOT NULL DEFAULT 10,
    "cashDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cashDiscountPercent" DECIMAL NOT NULL DEFAULT 3.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessConfig_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BusinessConfig" ("allowMultiProvider", "cancellationFeeAmount", "cancellationFeeEnabled", "cancellationWindow", "commissionCalculation", "commissionVisibility", "createdAt", "discountMaxPercent", "discountRequiresApproval", "franchisorId", "giftCardAutoEmail", "giftCardPhysical", "id", "lowStockAlertEnabled", "lowStockThreshold", "loyaltyBirthdayBonus", "loyaltyPointsAwarding", "loyaltyPointsRatio", "membershipAutoBilling", "membershipFailedPaymentRetry", "newClientBonusAmount", "newClientBonusEnabled", "reminderEnabled", "reminderMethod", "reminderTiming", "reviewIncentive", "reviewRequestMethod", "reviewRequestTiming", "tipPoolingEnabled", "tipPromptEnabled", "tipPromptTiming", "tipSuggestions", "updatedAt", "usesAppointments", "usesCommissions", "usesDiscounts", "usesEmailMarketing", "usesFranchising", "usesGiftCards", "usesInventory", "usesLoyalty", "usesMemberships", "usesMultiLocation", "usesPayroll", "usesReferrals", "usesRetailProducts", "usesReviewManagement", "usesRoyalties", "usesSMSMarketing", "usesScheduling", "usesServices", "usesTimeTracking", "usesTipping") SELECT "allowMultiProvider", "cancellationFeeAmount", "cancellationFeeEnabled", "cancellationWindow", "commissionCalculation", "commissionVisibility", "createdAt", "discountMaxPercent", "discountRequiresApproval", "franchisorId", "giftCardAutoEmail", "giftCardPhysical", "id", "lowStockAlertEnabled", "lowStockThreshold", "loyaltyBirthdayBonus", "loyaltyPointsAwarding", "loyaltyPointsRatio", "membershipAutoBilling", "membershipFailedPaymentRetry", "newClientBonusAmount", "newClientBonusEnabled", "reminderEnabled", "reminderMethod", "reminderTiming", "reviewIncentive", "reviewRequestMethod", "reviewRequestTiming", "tipPoolingEnabled", "tipPromptEnabled", "tipPromptTiming", "tipSuggestions", "updatedAt", "usesAppointments", "usesCommissions", "usesDiscounts", "usesEmailMarketing", "usesFranchising", "usesGiftCards", "usesInventory", "usesLoyalty", "usesMemberships", "usesMultiLocation", "usesPayroll", "usesReferrals", "usesRetailProducts", "usesReviewManagement", "usesRoyalties", "usesSMSMarketing", "usesScheduling", "usesServices", "usesTimeTracking", "usesTipping" FROM "BusinessConfig";
DROP TABLE "BusinessConfig";
ALTER TABLE "new_BusinessConfig" RENAME TO "BusinessConfig";
CREATE UNIQUE INDEX "BusinessConfig_franchisorId_key" ON "BusinessConfig"("franchisorId");
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "photoConsentDate" DATETIME,
    "franchiseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("createdAt", "email", "firstName", "franchiseId", "id", "lastName", "liabilitySigned", "loyaltyJoined", "phone", "updatedAt") SELECT "createdAt", "email", "firstName", "franchiseId", "id", "lastName", "liabilitySigned", "loyaltyJoined", "phone", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE TABLE "new_EmployeePaymentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'COMMISSION',
    "defaultCommissionRate" DECIMAL NOT NULL DEFAULT 0.40,
    "usesTieredCommission" BOOLEAN NOT NULL DEFAULT false,
    "baseSalary" DECIMAL,
    "salaryPeriod" TEXT,
    "useMaxSalaryOrCommission" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DECIMAL,
    "useMaxHourlyOrCommission" BOOLEAN NOT NULL DEFAULT false,
    "rentalFee" DECIMAL,
    "rentalPeriod" TEXT,
    "rentalKeeps100Percent" BOOLEAN NOT NULL DEFAULT false,
    "productCommissionRate" DECIMAL NOT NULL DEFAULT 0.10,
    "useProductCostDeduction" BOOLEAN NOT NULL DEFAULT false,
    "commissionOnDiscountedPrice" BOOLEAN NOT NULL DEFAULT true,
    "newClientBonusEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newClientBonusAmount" DECIMAL NOT NULL DEFAULT 10,
    "cashDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cashDiscountPercent" DECIMAL NOT NULL DEFAULT 3.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeePaymentConfig_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EmployeePaymentConfig" ("baseSalary", "commissionOnDiscountedPrice", "createdAt", "defaultCommissionRate", "employeeId", "hourlyRate", "id", "newClientBonusAmount", "paymentType", "productCommissionRate", "rentalFee", "rentalKeeps100Percent", "rentalPeriod", "salaryPeriod", "updatedAt", "useMaxHourlyOrCommission", "useMaxSalaryOrCommission", "useProductCostDeduction", "usesTieredCommission") SELECT "baseSalary", "commissionOnDiscountedPrice", "createdAt", "defaultCommissionRate", "employeeId", "hourlyRate", "id", "newClientBonusAmount", "paymentType", "productCommissionRate", "rentalFee", "rentalKeeps100Percent", "rentalPeriod", "salaryPeriod", "updatedAt", "useMaxHourlyOrCommission", "useMaxSalaryOrCommission", "useProductCostDeduction", "usesTieredCommission" FROM "EmployeePaymentConfig";
DROP TABLE "EmployeePaymentConfig";
ALTER TABLE "new_EmployeePaymentConfig" RENAME TO "EmployeePaymentConfig";
CREATE UNIQUE INDEX "EmployeePaymentConfig_employeeId_key" ON "EmployeePaymentConfig"("employeeId");
CREATE TABLE "new_FranchiseSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "pricingModel" TEXT NOT NULL DEFAULT 'DUAL_PRICING',
    "cardSurchargeType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "cardSurcharge" DECIMAL NOT NULL DEFAULT 3.99,
    "showDualPricing" BOOLEAN NOT NULL DEFAULT true,
    "enablePackages" BOOLEAN NOT NULL DEFAULT true,
    "enableResources" BOOLEAN NOT NULL DEFAULT false,
    "enableClientPhotos" BOOLEAN NOT NULL DEFAULT false,
    "enableRecurringBooking" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FranchiseSettings_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FranchiseSettings" ("cardSurcharge", "cardSurchargeType", "createdAt", "franchiseId", "id", "pricingModel", "showDualPricing", "updatedAt") SELECT "cardSurcharge", "cardSurchargeType", "createdAt", "franchiseId", "id", "pricingModel", "showDualPricing", "updatedAt" FROM "FranchiseSettings";
DROP TABLE "FranchiseSettings";
ALTER TABLE "new_FranchiseSettings" RENAME TO "FranchiseSettings";
CREATE UNIQUE INDEX "FranchiseSettings_franchiseId_key" ON "FranchiseSettings"("franchiseId");
CREATE TABLE "new_Franchisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" DATETIME,
    "suspendedReason" TEXT,
    "businessType" TEXT NOT NULL DEFAULT 'MULTI_LOCATION_OWNER',
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
    "needToDiscussProcessing" BOOLEAN NOT NULL DEFAULT false,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Franchisor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Franchisor" ("accountNumber", "address", "approvalStatus", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "driverLicenseUrl", "ebt", "faviconUrl", "fein", "feinLetterUrl", "id", "logoUrl", "name", "needToDiscussProcessing", "ownerId", "phone", "processingType", "routingNumber", "ss4", "ssn", "updatedAt", "voidCheckUrl") SELECT "accountNumber", "address", "approvalStatus", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "driverLicenseUrl", "ebt", "faviconUrl", "fein", "feinLetterUrl", "id", "logoUrl", "name", "needToDiscussProcessing", "ownerId", "phone", "processingType", "routingNumber", "ss4", "ssn", "updatedAt", "voidCheckUrl" FROM "Franchisor";
DROP TABLE "Franchisor";
ALTER TABLE "new_Franchisor" RENAME TO "Franchisor";
CREATE UNIQUE INDEX "Franchisor_ownerId_key" ON "Franchisor"("ownerId");
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "franchiseId" TEXT NOT NULL,
    "ownerId" TEXT,
    "processorName" TEXT,
    "processorMID" TEXT,
    "processorTID" TEXT,
    "processorVAR" TEXT,
    "paxTerminalIP" TEXT,
    "paxTerminalPort" TEXT NOT NULL DEFAULT '10009',
    "googlePlaceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Location_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Location_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("address", "createdAt", "franchiseId", "id", "name", "paxTerminalIP", "paxTerminalPort", "processorMID", "processorName", "processorTID", "processorVAR", "slug", "updatedAt") SELECT "address", "createdAt", "franchiseId", "id", "name", "paxTerminalIP", "paxTerminalPort", "processorMID", "processorName", "processorTID", "processorVAR", "slug", "updatedAt" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");
CREATE TABLE "new_LoyaltyProgram" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Rewards',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerDollar" DECIMAL NOT NULL DEFAULT 1,
    "redemptionRatio" DECIMAL NOT NULL DEFAULT 0.01,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoyaltyProgram_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LoyaltyProgram" ("createdAt", "franchiseId", "id", "isEnabled", "pointsPerDollar", "redemptionRatio") SELECT "createdAt", "franchiseId", "id", "isEnabled", "pointsPerDollar", "redemptionRatio" FROM "LoyaltyProgram";
DROP TABLE "LoyaltyProgram";
ALTER TABLE "new_LoyaltyProgram" RENAME TO "LoyaltyProgram";
CREATE UNIQUE INDEX "LoyaltyProgram_franchiseId_key" ON "LoyaltyProgram"("franchiseId");
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "postedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("clientId", "comment", "createdAt", "feedbackTag", "franchiseId", "googleReviewId", "id", "postedAt", "postedToGoogle", "rating", "transactionRef", "updatedAt") SELECT "clientId", "comment", "createdAt", "feedbackTag", "franchiseId", "googleReviewId", "id", "postedAt", "postedToGoogle", "rating", "transactionRef", "updatedAt" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "categoryId" TEXT,
    "franchiseId" TEXT NOT NULL,
    "globalServiceId" TEXT,
    CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Service_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Service_globalServiceId_fkey" FOREIGN KEY ("globalServiceId") REFERENCES "GlobalService" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("categoryId", "description", "duration", "franchiseId", "globalServiceId", "id", "name", "price") SELECT "categoryId", "description", "duration", "franchiseId", "globalServiceId", "id", "name", "price" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "pin" TEXT,
    "image" TEXT,
    "dailyGoal" REAL NOT NULL DEFAULT 500,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "customPermissions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "acceptedTermsAt" DATETIME,
    "acceptedTermsVersion" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "canAddServices" BOOLEAN NOT NULL DEFAULT false,
    "canAddProducts" BOOLEAN NOT NULL DEFAULT false,
    "canManageInventory" BOOLEAN NOT NULL DEFAULT false,
    "canViewReports" BOOLEAN NOT NULL DEFAULT false,
    "canProcessRefunds" BOOLEAN NOT NULL DEFAULT false,
    "canManageSchedule" BOOLEAN NOT NULL DEFAULT false,
    "canManageEmployees" BOOLEAN NOT NULL DEFAULT false,
    "canManageShifts" BOOLEAN NOT NULL DEFAULT false,
    "canClockIn" BOOLEAN NOT NULL DEFAULT true,
    "canClockOut" BOOLEAN NOT NULL DEFAULT true,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "commissionRuleId" TEXT,
    CONSTRAINT "User_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("acceptedTermsAt", "acceptedTermsVersion", "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "email", "franchiseId", "id", "image", "locationId", "name", "password", "pin", "role", "updatedAt") SELECT "acceptedTermsAt", "acceptedTermsVersion", "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "email", "franchiseId", "id", "image", "locationId", "name", "password", "pin", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key" ON "UserPermission"("userId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefaultPermission_role_permissionId_key" ON "RoleDefaultPermission"("role", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSettings_franchiseId_key" ON "ReminderSettings"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "SmsCredits_franchiseId_key" ON "SmsCredits"("franchiseId");

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
CREATE INDEX "CheckIn_locationId_idx" ON "CheckIn"("locationId");

-- CreateIndex
CREATE INDEX "CheckIn_status_idx" ON "CheckIn"("status");

-- CreateIndex
CREATE INDEX "CheckIn_checkedInAt_idx" ON "CheckIn"("checkedInAt");
