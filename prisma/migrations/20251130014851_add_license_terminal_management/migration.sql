-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "licenseKey" TEXT NOT NULL,
    "locationId" TEXT,
    "franchiseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "maxTerminals" INTEGER,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "License_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegisteredTerminal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "model" TEXT,
    "licenseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" DATETIME,
    "lastIpAddress" TEXT,
    "replacedByTerminalId" TEXT,
    "replacementNotes" TEXT,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RegisteredTerminal_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TerminalTransferLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "terminalId" TEXT NOT NULL,
    "fromLicenseId" TEXT,
    "toTerminalId" TEXT,
    "transferType" TEXT NOT NULL,
    "reason" TEXT,
    "performedBy" TEXT,
    "notes" TEXT,
    "transferredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TerminalTransferLog_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "RegisteredTerminal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TerminalTransferLog_fromLicenseId_fkey" FOREIGN KEY ("fromLicenseId") REFERENCES "License" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TerminalTransferLog_toTerminalId_fkey" FOREIGN KEY ("toTerminalId") REFERENCES "RegisteredTerminal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "License_licenseKey_key" ON "License"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "License_locationId_key" ON "License"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredTerminal_serialNumber_key" ON "RegisteredTerminal"("serialNumber");
