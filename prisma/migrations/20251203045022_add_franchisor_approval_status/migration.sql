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
INSERT INTO "new_Franchisor" ("address", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "ebt", "faviconUrl", "fein", "id", "logoUrl", "name", "needToDiscussProcessing", "ownerId", "phone", "processingType", "ss4", "ssn", "updatedAt") SELECT "address", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "ebt", "faviconUrl", "fein", "id", "logoUrl", "name", "needToDiscussProcessing", "ownerId", "phone", "processingType", "ss4", "ssn", "updatedAt" FROM "Franchisor";
DROP TABLE "Franchisor";
ALTER TABLE "new_Franchisor" RENAME TO "Franchisor";
CREATE UNIQUE INDEX "Franchisor_ownerId_key" ON "Franchisor"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
