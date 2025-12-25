/*
  Warnings:

  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Note` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Territory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[pulseStoreCode]` on the table `Location` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Location" ADD COLUMN "pulseStoreCode" TEXT;
ALTER TABLE "Location" ADD COLUMN "voidCheckUrl" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Activity";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Lead";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Note";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Task";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Territory";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PulseDeviceToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT,
    "tokenHash" TEXT NOT NULL,
    "lastUsed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIP" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" DATETIME,
    "revokedReason" TEXT,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PulseDeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharedUPCProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "description" TEXT,
    "size" TEXT,
    "imageUrl" TEXT,
    "avgPrice" DECIMAL,
    "contributorCount" INTEGER NOT NULL DEFAULT 1,
    "lastVerifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalSource" TEXT,
    "contributedByUserId" TEXT,
    "contributedByFranchiseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UnifiedCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnifiedCategory_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UnifiedCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "UnifiedCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PRODUCT',
    "categoryId" TEXT,
    "duration" INTEGER,
    "requiresDeposit" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" DECIMAL,
    "barcode" TEXT,
    "sku" TEXT,
    "stock" INTEGER,
    "cost" DECIMAL,
    "reorderPoint" INTEGER,
    "brand" TEXT,
    "size" TEXT,
    "preparationTime" INTEGER,
    "calories" INTEGER,
    "allergens" TEXT,
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
    "minimumAge" INTEGER,
    "isEbtEligible" BOOLEAN NOT NULL DEFAULT false,
    "isTobacco" BOOLEAN NOT NULL DEFAULT false,
    "isAlcohol" BOOLEAN NOT NULL DEFAULT false,
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "taxRate" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "UnifiedCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "performedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemLineItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemLineItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ItemLineItem_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Department_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountType" TEXT NOT NULL DEFAULT 'PERCENT',
    "discountValue" DECIMAL NOT NULL DEFAULT 0,
    "requiredQty" INTEGER,
    "getQty" INTEGER,
    "priceTiers" TEXT,
    "minSpend" DECIMAL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "timeStart" TEXT,
    "timeEnd" TEXT,
    "daysOfWeek" TEXT,
    "appliesTo" TEXT NOT NULL DEFAULT 'ALL',
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "maxUsesPerTransaction" INTEGER,
    "promoCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Promotion_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromotionProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promotionId" TEXT NOT NULL,
    "categoryId" TEXT,
    "productId" TEXT,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LotteryGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "gameNumber" TEXT NOT NULL,
    "ticketPrice" DECIMAL NOT NULL,
    "prizePool" DECIMAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LotteryGame_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LotteryPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "packNumber" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'INVENTORY',
    "activatedAt" DATETIME,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LotteryPack_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "LotteryGame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LotteryPack_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LotteryTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "packId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "ticketNumber" TEXT,
    "employeeId" TEXT NOT NULL,
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LotteryTransaction_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LotteryTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LotteryTransaction_packId_fkey" FOREIGN KEY ("packId") REFERENCES "LotteryPack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TobaccoScanSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "weekEndDate" DATETIME NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "totalAmount" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME,
    "confirmedAt" DATETIME,
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TobaccoScanSubmission_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TobaccoScanSubmission_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManufacturerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "storeId" TEXT,
    "accountNumber" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "portalUrl" TEXT,
    "rebatePerPack" DECIMAL NOT NULL DEFAULT 0.04,
    "rebatePerCarton" DECIMAL NOT NULL DEFAULT 0.40,
    "loyaltyBonus" DECIMAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManufacturerConfig_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TobaccoDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "dealName" TEXT NOT NULL,
    "dealType" TEXT NOT NULL,
    "buyQuantity" INTEGER,
    "getFreeQuantity" INTEGER,
    "discountType" TEXT NOT NULL,
    "discountAmount" DECIMAL NOT NULL,
    "applicableUpcs" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timesApplied" INTEGER NOT NULL DEFAULT 0,
    "totalSavings" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "manufacturerPLU" TEXT,
    "manufacturerName" TEXT,
    "redemptionProgram" TEXT,
    "name" TEXT,
    "brand" TEXT,
    "description" TEXT,
    "itemId" TEXT,
    CONSTRAINT "TobaccoDeal_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TobaccoDeal_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaxJurisdiction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT,
    "salesTaxRate" DECIMAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxJurisdiction_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExciseTaxRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jurisdictionId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "ratePerGallon" DECIMAL,
    "ratePerUnit" DECIMAL,
    "ratePerOz" DECIMAL,
    "minAbv" DECIMAL,
    "maxAbv" DECIMAL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExciseTaxRule_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationTaxJurisdiction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LocationTaxJurisdiction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LocationTaxJurisdiction_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "TaxJurisdiction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreAccountTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "balanceAfter" DECIMAL NOT NULL,
    "transactionId" TEXT,
    "invoiceNumber" TEXT,
    "paymentMethod" TEXT,
    "checkNumber" TEXT,
    "note" TEXT,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoreAccountTransaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "shippedAt" DATETIME,
    "receivedAt" DATETIME,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemSku" TEXT,
    "itemBarcode" TEXT,
    "quantitySent" INTEGER NOT NULL,
    "quantityReceived" INTEGER,
    "unitCost" DECIMAL NOT NULL DEFAULT 0,
    "discrepancyNote" TEXT,
    CONSTRAINT "TransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransferItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "expectedCash" DECIMAL NOT NULL DEFAULT 0,
    "countedCash" DECIMAL NOT NULL,
    "variance" DECIMAL NOT NULL DEFAULT 0,
    "denominations" TEXT,
    "note" TEXT,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SafeDrop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "amount" DECIMAL NOT NULL,
    "witnessedById" TEXT,
    "witnessedByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SafeDrop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DepositLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "expectedAmount" DECIMAL NOT NULL,
    "depositedAmount" DECIMAL NOT NULL,
    "variance" DECIMAL NOT NULL DEFAULT 0,
    "bankDate" DATETIME NOT NULL,
    "slipNumber" TEXT,
    "slipImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "loggedById" TEXT,
    "loggedByName" TEXT,
    "reconciledById" TEXT,
    "reconciledByName" TEXT,
    "reconciledAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DepositLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "details" TEXT,
    "amount" DECIMAL,
    "transactionId" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" DATETIME,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedById" TEXT,
    "acknowledgedByName" TEXT,
    "acknowledgedAt" DATETIME,
    "resolvedById" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoreException_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "subscriptionTier" TEXT NOT NULL DEFAULT 'STARTER',
    "maxLocations" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "acceptsEbt" BOOLEAN NOT NULL DEFAULT false,
    "acceptsChecks" BOOLEAN NOT NULL DEFAULT false,
    "acceptsOnAccount" BOOLEAN NOT NULL DEFAULT false,
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
    "canExportData" BOOLEAN NOT NULL DEFAULT false,
    "canExportReports" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessConfig_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BusinessConfig" ("allowMultiProvider", "canExportData", "canExportReports", "cancellationFeeAmount", "cancellationFeeEnabled", "cancellationWindow", "cashDiscountEnabled", "cashDiscountPercent", "commissionCalculation", "commissionVisibility", "createdAt", "discountMaxPercent", "discountRequiresApproval", "franchisorId", "giftCardAutoEmail", "giftCardPhysical", "id", "lowStockAlertEnabled", "lowStockThreshold", "loyaltyBirthdayBonus", "loyaltyPointsAwarding", "loyaltyPointsRatio", "membershipAutoBilling", "membershipFailedPaymentRetry", "newClientBonusAmount", "newClientBonusEnabled", "reminderEnabled", "reminderMethod", "reminderTiming", "reviewIncentive", "reviewRequestMethod", "reviewRequestTiming", "shiftRequirement", "taxProducts", "taxRate", "taxServices", "tipPoolingEnabled", "tipPromptEnabled", "tipPromptTiming", "tipSuggestions", "tipType", "updatedAt", "usesAppointments", "usesCommissions", "usesDiscounts", "usesEmailMarketing", "usesFranchising", "usesGiftCards", "usesInventory", "usesLoyalty", "usesMemberships", "usesMultiLocation", "usesPayroll", "usesReferrals", "usesRetailProducts", "usesReviewManagement", "usesRoyalties", "usesSMSMarketing", "usesScheduling", "usesServices", "usesTimeTracking", "usesTipping", "usesVirtualKeypad") SELECT "allowMultiProvider", "canExportData", "canExportReports", "cancellationFeeAmount", "cancellationFeeEnabled", "cancellationWindow", "cashDiscountEnabled", "cashDiscountPercent", "commissionCalculation", "commissionVisibility", "createdAt", "discountMaxPercent", "discountRequiresApproval", "franchisorId", "giftCardAutoEmail", "giftCardPhysical", "id", "lowStockAlertEnabled", "lowStockThreshold", "loyaltyBirthdayBonus", "loyaltyPointsAwarding", "loyaltyPointsRatio", "membershipAutoBilling", "membershipFailedPaymentRetry", "newClientBonusAmount", "newClientBonusEnabled", "reminderEnabled", "reminderMethod", "reminderTiming", "reviewIncentive", "reviewRequestMethod", "reviewRequestTiming", "shiftRequirement", "taxProducts", "taxRate", "taxServices", "tipPoolingEnabled", "tipPromptEnabled", "tipPromptTiming", "tipSuggestions", "tipType", "updatedAt", "usesAppointments", "usesCommissions", "usesDiscounts", "usesEmailMarketing", "usesFranchising", "usesGiftCards", "usesInventory", "usesLoyalty", "usesMemberships", "usesMultiLocation", "usesPayroll", "usesReferrals", "usesRetailProducts", "usesReviewManagement", "usesRoyalties", "usesSMSMarketing", "usesScheduling", "usesServices", "usesTimeTracking", "usesTipping", "usesVirtualKeypad" FROM "BusinessConfig";
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
    "taxExempt" BOOLEAN NOT NULL DEFAULT false,
    "exemptCertificateNumber" TEXT,
    "exemptCertificateExpiry" DATETIME,
    "hasStoreAccount" BOOLEAN NOT NULL DEFAULT false,
    "storeAccountBalance" DECIMAL NOT NULL DEFAULT 0,
    "storeAccountLimit" DECIMAL NOT NULL DEFAULT 500,
    "storeAccountApprovedBy" TEXT,
    "storeAccountApprovedAt" DATETIME,
    "franchiseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("allergies", "createdAt", "email", "firstName", "franchiseId", "id", "internalNotes", "lastName", "liabilitySigned", "loyaltyJoined", "phone", "photoConsent", "photoConsentDate", "preferences", "updatedAt", "vipStatus") SELECT "allergies", "createdAt", "email", "firstName", "franchiseId", "id", "internalNotes", "lastName", "liabilitySigned", "loyaltyJoined", "phone", "photoConsent", "photoConsentDate", "preferences", "updatedAt", "vipStatus" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE INDEX "Client_franchiseId_idx" ON "Client"("franchiseId");
CREATE INDEX "Client_phone_idx" ON "Client"("phone");
CREATE INDEX "Client_email_idx" ON "Client"("email");
CREATE INDEX "Client_lastName_idx" ON "Client"("lastName");
CREATE INDEX "Client_loyaltyJoined_idx" ON "Client"("loyaltyJoined");
CREATE INDEX "Client_hasStoreAccount_idx" ON "Client"("hasStoreAccount");
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
    "promoStackingMode" TEXT NOT NULL DEFAULT 'BEST_ONLY',
    "maxDiscountPercent" DECIMAL NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FranchiseSettings_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FranchiseSettings" ("cardSurcharge", "cardSurchargeType", "createdAt", "enableClientPhotos", "enablePackages", "enableRecurringBooking", "enableResources", "franchiseId", "id", "pricingModel", "showDualPricing", "updatedAt") SELECT "cardSurcharge", "cardSurchargeType", "createdAt", "enableClientPhotos", "enablePackages", "enableRecurringBooking", "enableResources", "franchiseId", "id", "pricingModel", "showDualPricing", "updatedAt" FROM "FranchiseSettings";
DROP TABLE "FranchiseSettings";
ALTER TABLE "new_FranchiseSettings" RENAME TO "FranchiseSettings";
CREATE UNIQUE INDEX "FranchiseSettings_franchiseId_key" ON "FranchiseSettings"("franchiseId");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "cost" DECIMAL,
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
    "isTobacco" BOOLEAN NOT NULL DEFAULT false,
    "alcoholType" TEXT,
    "volumeMl" INTEGER,
    "abvPercent" DECIMAL,
    "unitsPerCase" INTEGER,
    "casePrice" DECIMAL,
    "sellByCase" BOOLEAN NOT NULL DEFAULT false,
    "stockCases" INTEGER NOT NULL DEFAULT 0,
    "globalProductId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("ageRestricted", "barcode", "category", "categoryId", "cost", "createdAt", "description", "franchiseId", "globalProductId", "id", "isActive", "minimumAge", "name", "price", "reorderPoint", "sku", "stock", "updatedAt", "vendor") SELECT "ageRestricted", "barcode", "category", "categoryId", "cost", "createdAt", "description", "franchiseId", "globalProductId", "id", "isActive", "minimumAge", "name", "price", "reorderPoint", "sku", "stock", "updatedAt", "vendor" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE TABLE "new_ProductCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "departmentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
    "minimumAge" INTEGER,
    "isEbtEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductCategory_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProductCategory" ("ageRestricted", "createdAt", "description", "franchiseId", "id", "isActive", "minimumAge", "name", "sortOrder", "updatedAt") SELECT "ageRestricted", "createdAt", "description", "franchiseId", "id", "isActive", "minimumAge", "name", "sortOrder", "updatedAt" FROM "ProductCategory";
DROP TABLE "ProductCategory";
ALTER TABLE "new_ProductCategory" RENAME TO "ProductCategory";
CREATE INDEX "ProductCategory_franchiseId_idx" ON "ProductCategory"("franchiseId");
CREATE INDEX "ProductCategory_departmentId_idx" ON "ProductCategory"("departmentId");
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
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaBackupCodes" TEXT,
    "mfaSetupAt" DATETIME,
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
    "hasPulseAccess" BOOLEAN NOT NULL DEFAULT false,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "assignedStationId" TEXT,
    "commissionRuleId" TEXT,
    CONSTRAINT "User_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_assignedStationId_fkey" FOREIGN KEY ("assignedStationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("acceptedTermsAt", "acceptedTermsVersion", "assignedStationId", "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "dailyGoal", "email", "failedLoginAttempts", "franchiseId", "id", "image", "locationId", "lockedUntil", "name", "password", "pin", "role", "updatedAt") SELECT "acceptedTermsAt", "acceptedTermsVersion", "assignedStationId", "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "dailyGoal", "email", "failedLoginAttempts", "franchiseId", "id", "image", "locationId", "lockedUntil", "name", "password", "pin", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PulseDeviceToken_deviceId_idx" ON "PulseDeviceToken"("deviceId");

-- CreateIndex
CREATE INDEX "PulseDeviceToken_userId_idx" ON "PulseDeviceToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PulseDeviceToken_userId_deviceId_key" ON "PulseDeviceToken"("userId", "deviceId");

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
CREATE INDEX "Department_franchiseId_idx" ON "Department"("franchiseId");

-- CreateIndex
CREATE INDEX "Promotion_franchiseId_idx" ON "Promotion"("franchiseId");

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "Promotion"("isActive");

-- CreateIndex
CREATE INDEX "PromotionProduct_promotionId_idx" ON "PromotionProduct"("promotionId");

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
CREATE INDEX "TobaccoScanSubmission_franchiseId_idx" ON "TobaccoScanSubmission"("franchiseId");

-- CreateIndex
CREATE INDEX "TobaccoScanSubmission_locationId_idx" ON "TobaccoScanSubmission"("locationId");

-- CreateIndex
CREATE INDEX "TobaccoScanSubmission_manufacturer_idx" ON "TobaccoScanSubmission"("manufacturer");

-- CreateIndex
CREATE INDEX "TobaccoScanSubmission_weekStartDate_idx" ON "TobaccoScanSubmission"("weekStartDate");

-- CreateIndex
CREATE INDEX "ManufacturerConfig_franchiseId_idx" ON "ManufacturerConfig"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerConfig_franchiseId_manufacturer_key" ON "ManufacturerConfig"("franchiseId", "manufacturer");

-- CreateIndex
CREATE INDEX "TobaccoDeal_franchiseId_idx" ON "TobaccoDeal"("franchiseId");

-- CreateIndex
CREATE INDEX "TobaccoDeal_manufacturer_idx" ON "TobaccoDeal"("manufacturer");

-- CreateIndex
CREATE INDEX "TobaccoDeal_isActive_idx" ON "TobaccoDeal"("isActive");

-- CreateIndex
CREATE INDEX "TobaccoDeal_manufacturerPLU_idx" ON "TobaccoDeal"("manufacturerPLU");

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
CREATE INDEX "CashDrawerSession_locationId_idx" ON "CashDrawerSession"("locationId");

-- CreateIndex
CREATE INDEX "CashDrawerSession_employeeId_idx" ON "CashDrawerSession"("employeeId");

-- CreateIndex
CREATE INDEX "CashDrawerSession_status_idx" ON "CashDrawerSession"("status");

-- CreateIndex
CREATE INDEX "CashDrawerSession_startTime_idx" ON "CashDrawerSession"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Location_pulseStoreCode_key" ON "Location"("pulseStoreCode");

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
