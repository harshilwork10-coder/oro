-- AlterTable
ALTER TABLE "Franchise" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN "deletedAt" DATETIME;

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
    CONSTRAINT "Franchisor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Franchisor" ("createdAt", "id", "name", "ownerId", "supportFee", "updatedAt") SELECT "createdAt", "id", "name", "ownerId", "supportFee", "updatedAt" FROM "Franchisor";
DROP TABLE "Franchisor";
ALTER TABLE "new_Franchisor" RENAME TO "Franchisor";
CREATE UNIQUE INDEX "Franchisor_ownerId_key" ON "Franchisor"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
