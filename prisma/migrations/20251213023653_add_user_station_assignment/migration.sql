-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "assignedStationId" TEXT,
    "commissionRuleId" TEXT,
    CONSTRAINT "User_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_assignedStationId_fkey" FOREIGN KEY ("assignedStationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("acceptedTermsAt", "acceptedTermsVersion", "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "dailyGoal", "email", "failedLoginAttempts", "franchiseId", "id", "image", "locationId", "lockedUntil", "name", "password", "pin", "role", "updatedAt") SELECT "acceptedTermsAt", "acceptedTermsVersion", "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "dailyGoal", "email", "failedLoginAttempts", "franchiseId", "id", "image", "locationId", "lockedUntil", "name", "password", "pin", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
