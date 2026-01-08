-- CreateTable
CREATE TABLE "BusinessConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "usesCommissions" BOOLEAN NOT NULL DEFAULT true,
    "usesInventory" BOOLEAN NOT NULL DEFAULT true,
    "usesAppointments" BOOLEAN NOT NULL DEFAULT true,
    "usesScheduling" BOOLEAN NOT NULL DEFAULT true,
    "usesLoyalty" BOOLEAN NOT NULL DEFAULT true,
    "usesGiftCards" BOOLEAN NOT NULL DEFAULT true,
    "usesMemberships" BOOLEAN NOT NULL DEFAULT true,
    "usesReferrals" BOOLEAN NOT NULL DEFAULT true,
    "usesRoyalties" BOOLEAN NOT NULL DEFAULT false,
    "usesTipping" BOOLEAN NOT NULL DEFAULT true,
    "usesDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "usesRetailProducts" BOOLEAN NOT NULL DEFAULT true,
    "usesServices" BOOLEAN NOT NULL DEFAULT true,
    "usesEmailMarketing" BOOLEAN NOT NULL DEFAULT true,
    "usesSMSMarketing" BOOLEAN NOT NULL DEFAULT true,
    "usesReviewManagement" BOOLEAN NOT NULL DEFAULT true,
    "usesMultiLocation" BOOLEAN NOT NULL DEFAULT false,
    "usesFranchising" BOOLEAN NOT NULL DEFAULT false,
    "usesTimeTracking" BOOLEAN NOT NULL DEFAULT true,
    "usesPayroll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessConfig_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "liabilitySigned" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyJoined" BOOLEAN NOT NULL DEFAULT false,
    "franchiseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("createdAt", "email", "firstName", "franchiseId", "id", "lastName", "liabilitySigned", "loyaltyJoined", "phone", "updatedAt") SELECT "createdAt", "email", "firstName", "franchiseId", "id", "lastName", "liabilitySigned", "loyaltyJoined", "phone", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE TABLE "new_Franchise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "ssn" TEXT,
    "fein" TEXT,
    "routingNumber" TEXT,
    "accountNumber" TEXT,
    "voidCheckUrl" TEXT,
    "driverLicenseUrl" TEXT,
    "feinLetterUrl" TEXT,
    "needToDiscussProcessing" BOOLEAN NOT NULL DEFAULT false,
    "franchisorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Franchise_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Franchise" ("createdAt", "franchisorId", "id", "name", "slug", "updatedAt") SELECT "createdAt", "franchisorId", "id", "name", "slug", "updatedAt" FROM "Franchise";
DROP TABLE "Franchise";
ALTER TABLE "new_Franchise" RENAME TO "Franchise";
CREATE UNIQUE INDEX "Franchise_slug_key" ON "Franchise"("slug");
CREATE TABLE "new_Franchisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
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
INSERT INTO "new_Franchisor" ("address", "approvalStatus", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "ebt", "faviconUrl", "fein", "id", "logoUrl", "name", "needToDiscussProcessing", "ownerId", "phone", "processingType", "ss4", "ssn", "updatedAt") SELECT "address", "approvalStatus", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "ebt", "faviconUrl", "fein", "id", "logoUrl", "name", coalesce("needToDiscussProcessing", false) AS "needToDiscussProcessing", "ownerId", "phone", "processingType", "ss4", "ssn", "updatedAt" FROM "Franchisor";
DROP TABLE "Franchisor";
ALTER TABLE "new_Franchisor" RENAME TO "Franchisor";
CREATE UNIQUE INDEX "Franchisor_ownerId_key" ON "Franchisor"("ownerId");
CREATE TABLE "new_GlobalProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultPrice" DECIMAL NOT NULL,
    "defaultCost" DECIMAL,
    "sku" TEXT,
    "category" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "GlobalProduct_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GlobalProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GlobalProduct" ("category", "createdAt", "defaultCost", "defaultPrice", "description", "franchisorId", "id", "isArchived", "name", "sku", "updatedAt", "userId") SELECT "category", "createdAt", "defaultCost", "defaultPrice", "description", "franchisorId", "id", "isArchived", "name", "sku", "updatedAt", "userId" FROM "GlobalProduct";
DROP TABLE "GlobalProduct";
ALTER TABLE "new_GlobalProduct" RENAME TO "GlobalProduct";
CREATE TABLE "new_GlobalService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "defaultPrice" DECIMAL NOT NULL,
    "category" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "GlobalService_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GlobalService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GlobalService" ("category", "createdAt", "defaultPrice", "description", "duration", "franchisorId", "id", "isArchived", "name", "updatedAt", "userId") SELECT "category", "createdAt", "defaultPrice", "description", "duration", "franchisorId", "id", "isArchived", "name", "updatedAt", "userId" FROM "GlobalService";
DROP TABLE "GlobalService";
ALTER TABLE "new_GlobalService" RENAME TO "GlobalService";
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "city" TEXT,
    "state" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "assignedTo" TEXT,
    "estimatedValue" REAL,
    "proposedFee" REAL,
    "score" INTEGER,
    "rating" TEXT,
    "probability" REAL,
    "expectedClose" DATETIME,
    "competitors" TEXT,
    "painPoints" TEXT,
    "decisionMakers" TEXT,
    "lastActivityAt" DATETIME,
    "emailOpens" INTEGER NOT NULL DEFAULT 0,
    "emailClicks" INTEGER NOT NULL DEFAULT 0,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "meetingCount" INTEGER NOT NULL DEFAULT 0,
    "lastContact" DATETIME,
    "nextFollowUp" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("assignedTo", "callCount", "city", "company", "competitors", "createdAt", "decisionMakers", "email", "emailClicks", "emailOpens", "estimatedValue", "expectedClose", "franchisorId", "id", "lastActivityAt", "lastContact", "meetingCount", "name", "nextFollowUp", "painPoints", "phone", "probability", "proposedFee", "rating", "score", "source", "state", "status", "updatedAt") SELECT "assignedTo", "callCount", "city", "company", "competitors", "createdAt", "decisionMakers", "email", "emailClicks", "emailOpens", "estimatedValue", "expectedClose", "franchisorId", "id", "lastActivityAt", "lastContact", "meetingCount", "name", "nextFollowUp", "painPoints", "phone", "probability", "proposedFee", "rating", "score", "source", "state", "status", "updatedAt" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "franchiseId" TEXT NOT NULL,
    "processorName" TEXT,
    "processorMID" TEXT,
    "processorTID" TEXT,
    "processorVAR" TEXT,
    "paxTerminalIP" TEXT,
    "paxTerminalPort" TEXT NOT NULL DEFAULT '10009',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Location_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("address", "createdAt", "franchiseId", "id", "name", "paxTerminalIP", "paxTerminalPort", "processorMID", "processorName", "processorTID", "processorVAR", "slug", "updatedAt") SELECT "address", "createdAt", "franchiseId", "id", "name", "paxTerminalIP", "paxTerminalPort", "processorMID", "processorName", "processorTID", "processorVAR", "slug", "updatedAt" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");
CREATE TABLE "new_RoyaltyConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "percentage" DECIMAL NOT NULL,
    "minimumMonthlyFee" DECIMAL,
    "calculationPeriod" TEXT NOT NULL DEFAULT 'MONTHLY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoyaltyConfig_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RoyaltyConfig" ("calculationPeriod", "createdAt", "franchisorId", "id", "minimumMonthlyFee", "percentage", "updatedAt") SELECT "calculationPeriod", "createdAt", "franchisorId", "id", "minimumMonthlyFee", "percentage", "updatedAt" FROM "RoyaltyConfig";
DROP TABLE "RoyaltyConfig";
ALTER TABLE "new_RoyaltyConfig" RENAME TO "RoyaltyConfig";
CREATE UNIQUE INDEX "RoyaltyConfig_franchisorId_key" ON "RoyaltyConfig"("franchisorId");
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "category" TEXT,
    "categoryId" TEXT,
    "franchiseId" TEXT NOT NULL,
    "globalServiceId" TEXT,
    CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Service_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Service_globalServiceId_fkey" FOREIGN KEY ("globalServiceId") REFERENCES "GlobalService" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("category", "categoryId", "description", "duration", "franchiseId", "globalServiceId", "id", "name", "price") SELECT "category", "categoryId", "description", "duration", "franchiseId", "globalServiceId", "id", "name", "price" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE TABLE "new_ServiceCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceCategory_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ServiceCategory" ("createdAt", "franchiseId", "id", "isActive", "name", "sortOrder", "updatedAt") SELECT "createdAt", "franchiseId", "id", "isActive", "name", "sortOrder", "updatedAt" FROM "ServiceCategory";
DROP TABLE "ServiceCategory";
ALTER TABLE "new_ServiceCategory" RENAME TO "ServiceCategory";
CREATE TABLE "new_Territory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "states" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Territory_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Territory" ("createdAt", "franchisorId", "id", "isAvailable", "name", "price", "states", "updatedAt") SELECT "createdAt", "franchisorId", "id", "isAvailable", "name", "price", "states", "updatedAt" FROM "Territory";
DROP TABLE "Territory";
ALTER TABLE "new_Territory" RENAME TO "Territory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BusinessConfig_franchisorId_key" ON "BusinessConfig"("franchisorId");
