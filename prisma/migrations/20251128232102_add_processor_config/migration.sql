-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_Location" ("address", "createdAt", "franchiseId", "id", "name", "slug", "updatedAt") SELECT "address", "createdAt", "franchiseId", "id", "name", "slug", "updatedAt" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
