-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "cashDiscountEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Franchisor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Franchisor" ("accountNumber", "address", "approvalStatus", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "driverLicenseUrl", "ebt", "faviconUrl", "fein", "feinLetterUrl", "id", "logoUrl", "name", "needToDiscussProcessing", "ownerId", "phone", "processingType", "routingNumber", "ss4", "ssn", "updatedAt", "voidCheckUrl") SELECT "accountNumber", "address", "approvalStatus", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "driverLicenseUrl", "ebt", "faviconUrl", "fein", "feinLetterUrl", "id", "logoUrl", "name", "needToDiscussProcessing", "ownerId", "phone", "processingType", "routingNumber", "ss4", "ssn", "updatedAt", "voidCheckUrl" FROM "Franchisor";
DROP TABLE "Franchisor";
ALTER TABLE "new_Franchisor" RENAME TO "Franchisor";
CREATE UNIQUE INDEX "Franchisor_ownerId_key" ON "Franchisor"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
