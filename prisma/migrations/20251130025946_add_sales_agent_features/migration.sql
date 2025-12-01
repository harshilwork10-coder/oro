-- AlterTable
ALTER TABLE "User" ADD COLUMN "commissionRate" DECIMAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Franchisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "supportFee" DECIMAL NOT NULL DEFAULT 99.00,
    "type" TEXT NOT NULL DEFAULT 'BRAND',
    "deletedAt" DATETIME,
    "billingMethod" TEXT NOT NULL DEFAULT 'DIRECT',
    "salesAgentId" TEXT,
    CONSTRAINT "Franchisor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Franchisor_salesAgentId_fkey" FOREIGN KEY ("salesAgentId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Franchisor" ("createdAt", "deletedAt", "id", "name", "ownerId", "supportFee", "type", "updatedAt") SELECT "createdAt", "deletedAt", "id", "name", "ownerId", "supportFee", "type", "updatedAt" FROM "Franchisor";
DROP TABLE "Franchisor";
ALTER TABLE "new_Franchisor" RENAME TO "Franchisor";
CREATE UNIQUE INDEX "Franchisor_ownerId_key" ON "Franchisor"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
