-- CreateTable
CREATE TABLE "PaymentTerminal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "terminalType" TEXT NOT NULL DEFAULT 'PAX',
    "terminalIP" TEXT NOT NULL,
    "terminalPort" TEXT NOT NULL DEFAULT '10009',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentTerminal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "paymentMode" TEXT NOT NULL DEFAULT 'CASH_ONLY',
    "dedicatedTerminalId" TEXT,
    "currentUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Station_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Station_dedicatedTerminalId_fkey" FOREIGN KEY ("dedicatedTerminalId") REFERENCES "PaymentTerminal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Station" ("createdAt", "currentUserId", "id", "isActive", "locationId", "name", "updatedAt") SELECT "createdAt", "currentUserId", "id", "isActive", "locationId", "name", "updatedAt" FROM "Station";
DROP TABLE "Station";
ALTER TABLE "new_Station" RENAME TO "Station";
CREATE UNIQUE INDEX "Station_dedicatedTerminalId_key" ON "Station"("dedicatedTerminalId");
CREATE INDEX "Station_locationId_idx" ON "Station"("locationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PaymentTerminal_locationId_idx" ON "PaymentTerminal"("locationId");
