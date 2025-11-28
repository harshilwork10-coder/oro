/*
  Warnings:

  - Added the required column `slug` to the `Franchise` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Location` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceCategory_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "transactionRef" TEXT,
    "rating" INTEGER NOT NULL,
    "feedbackTag" TEXT,
    "comment" TEXT,
    "googleReviewId" TEXT,
    "postedToGoogle" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    CONSTRAINT "Client_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Client" ("createdAt", "email", "firstName", "franchiseId", "id", "lastName", "phone", "updatedAt") SELECT "createdAt", "email", "firstName", "franchiseId", "id", "lastName", "phone", "updatedAt" FROM "Client";
DROP TABLE "Client";
ALTER TABLE "new_Client" RENAME TO "Client";
CREATE TABLE "new_Franchise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "franchisorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Franchise_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Franchise" ("createdAt", "franchisorId", "id", "name", "updatedAt") SELECT "createdAt", "franchisorId", "id", "name", "updatedAt" FROM "Franchise";
DROP TABLE "Franchise";
ALTER TABLE "new_Franchise" RENAME TO "Franchise";
CREATE UNIQUE INDEX "Franchise_slug_key" ON "Franchise"("slug");
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "franchiseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Location_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("address", "createdAt", "franchiseId", "id", "name", "updatedAt") SELECT "address", "createdAt", "franchiseId", "id", "name", "updatedAt" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");
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
    CONSTRAINT "Service_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Service_globalServiceId_fkey" FOREIGN KEY ("globalServiceId") REFERENCES "GlobalService" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Service" ("category", "description", "duration", "franchiseId", "globalServiceId", "id", "name", "price") SELECT "category", "description", "duration", "franchiseId", "globalServiceId", "id", "name", "price" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT,
    "employeeId" TEXT,
    "subtotal" DECIMAL NOT NULL,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "tip" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "cardFee" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "processingPlan" TEXT,
    "cashAmount" DECIMAL NOT NULL DEFAULT 0,
    "cardAmount" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "cashDrawerSessionId" TEXT,
    "originalTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_cashDrawerSessionId_fkey" FOREIGN KEY ("cashDrawerSessionId") REFERENCES "CashDrawerSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_originalTransactionId_fkey" FOREIGN KEY ("originalTransactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("cardFee", "cashDrawerSessionId", "clientId", "createdAt", "discount", "employeeId", "franchiseId", "id", "originalTransactionId", "paymentMethod", "processingPlan", "status", "subtotal", "tax", "tip", "total", "updatedAt") SELECT "cardFee", "cashDrawerSessionId", "clientId", "createdAt", "discount", "employeeId", "franchiseId", "id", "originalTransactionId", "paymentMethod", "processingPlan", "status", "subtotal", "tax", "tip", "total", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
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
INSERT INTO "new_User" ("canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "email", "franchiseId", "id", "image", "locationId", "name", "password", "pin", "role", "updatedAt") SELECT "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "email", "franchiseId", "id", "image", "locationId", "name", "password", "pin", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
