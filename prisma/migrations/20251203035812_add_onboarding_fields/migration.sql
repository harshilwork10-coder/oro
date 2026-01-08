/*
  Warnings:

  - You are about to drop the `License` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RegisteredTerminal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TerminalTransferLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `deletedAt` on the `Franchise` table. All the data in the column will be lost.
  - You are about to drop the column `baseRate` on the `Franchisor` table. All the data in the column will be lost.
  - You are about to drop the column `billingMethod` on the `Franchisor` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Franchisor` table. All the data in the column will be lost.
  - You are about to drop the column `enableCommission` on the `Franchisor` table. All the data in the column will be lost.
  - You are about to drop the column `salesAgentId` on the `Franchisor` table. All the data in the column will be lost.
  - You are about to drop the column `supportFee` on the `Franchisor` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Franchisor` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Location` table. All the data in the column will be lost.
  - You are about to drop the column `acceptedTermsAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `acceptedTermsVersion` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `commissionRate` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `providerPermissions` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `providerRole` on the `User` table. All the data in the column will be lost.
  - Made the column `ownerId` on table `Franchisor` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "License_locationId_key";

-- DropIndex
DROP INDEX "License_licenseKey_key";

-- DropIndex
DROP INDEX "RegisteredTerminal_serialNumber_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "License";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RegisteredTerminal";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TerminalTransferLog";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Lead" (
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
    CONSTRAINT "Lead_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT DEFAULT 'GENERAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "notes" TEXT,
    "duration" INTEGER,
    "outcome" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Territory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "states" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Territory_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT NOT NULL,
    "completedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Franchise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Franchise_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Franchise" ("createdAt", "franchisorId", "id", "name", "slug", "updatedAt") SELECT "createdAt", "franchisorId", "id", "name", "slug", "updatedAt" FROM "Franchise";
DROP TABLE "Franchise";
ALTER TABLE "new_Franchise" RENAME TO "Franchise";
CREATE UNIQUE INDEX "Franchise_slug_key" ON "Franchise"("slug");
CREATE TABLE "new_Franchisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT,
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
    "needToDiscussProcessing" BOOLEAN,
    "brandColorPrimary" TEXT,
    "brandColorSecondary" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "domain" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Franchisor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Franchisor" ("createdAt", "id", "name", "ownerId", "updatedAt") SELECT "createdAt", "id", "name", "ownerId", "updatedAt" FROM "Franchisor";
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
    CONSTRAINT "GlobalProduct_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GlobalProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GlobalProduct" ("category", "createdAt", "defaultCost", "defaultPrice", "description", "franchisorId", "id", "isArchived", "name", "sku", "updatedAt") SELECT "category", "createdAt", "defaultCost", "defaultPrice", "description", "franchisorId", "id", "isArchived", "name", "sku", "updatedAt" FROM "GlobalProduct";
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
    CONSTRAINT "GlobalService_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GlobalService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GlobalService" ("category", "createdAt", "defaultPrice", "description", "duration", "franchisorId", "id", "isArchived", "name", "updatedAt") SELECT "category", "createdAt", "defaultPrice", "description", "duration", "franchisorId", "id", "isArchived", "name", "updatedAt" FROM "GlobalService";
DROP TABLE "GlobalService";
ALTER TABLE "new_GlobalService" RENAME TO "GlobalService";
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
    CONSTRAINT "Location_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("address", "createdAt", "franchiseId", "id", "name", "paxTerminalIP", "paxTerminalPort", "processorMID", "processorName", "processorTID", "processorVAR", "slug", "updatedAt") SELECT "address", "createdAt", "franchiseId", "id", "name", "paxTerminalIP", "paxTerminalPort", "processorMID", "processorName", "processorTID", "processorVAR", "slug", "updatedAt" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "pin" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "customPermissions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
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
INSERT INTO "new_User" ("canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "email", "franchiseId", "id", "image", "locationId", "name", "password", "pin", "role", "updatedAt") SELECT "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "email", "franchiseId", "id", "image", "locationId", "name", "password", "pin", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
