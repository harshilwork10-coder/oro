-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "providerSmsConfigId" TEXT,
    CONSTRAINT "Provider_providerSmsConfigId_fkey" FOREIGN KEY ("providerSmsConfigId") REFERENCES "ProviderSmsConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "providerId" TEXT,
    "franchisorId" TEXT,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRoleAssignment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserRoleAssignment_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserRoleAssignment_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserRoleAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationPaymentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "processorName" TEXT,
    "processorMID" TEXT,
    "processorTID" TEXT,
    "gateway" TEXT,
    "surchargeType" TEXT,
    "surchargeValue" DECIMAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LocationPaymentProfile_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationItemOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "itemId" TEXT,
    "productId" TEXT,
    "serviceId" TEXT,
    "priceOverride" DECIMAL,
    "isActiveOverride" BOOLEAN,
    "taxGroupOverride" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LocationItemOverride_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LocationItemOverride_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LocationItemOverride_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LocationItemOverride_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LocationItemOverride_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockOnHand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qtyOnHand" DECIMAL NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockOnHand_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockOnHand_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockOnHand_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "posType" TEXT,
    "posVersion" TEXT,
    "dbType" TEXT,
    "healthJson" TEXT,
    "lastHealthAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientCard_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "assignedToUserId" TEXT,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "category" TEXT,
    "subject" TEXT NOT NULL,
    "slaDueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ticket_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ticket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TicketMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVESTIGATING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME
);

-- CreateTable
CREATE TABLE "IncidentImpact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT NOT NULL,
    "locationId" TEXT,
    "terminalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentImpact_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IncidentImpact_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IncidentImpact_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT,
    "docType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestNumber" TEXT NOT NULL,
    "requestType" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "franchisorId" TEXT,
    "franchiseId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "businessType" INTEGER NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastStatusAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "rejectedReason" TEXT,
    "activatedAt" DATETIME,
    CONSTRAINT "OnboardingRequest_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequest_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequest_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingRequestLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "onboardingRequestId" TEXT NOT NULL,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "locationName" TEXT NOT NULL,
    "phone" TEXT,
    "address1" TEXT NOT NULL,
    "address2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "requestedTerminals" INTEGER NOT NULL DEFAULT 0,
    "requestedStations" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingRequestLocation_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequestLocation_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequestLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingRequestDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "onboardingRequestId" TEXT NOT NULL,
    "requestLocationId" TEXT,
    "locationId" TEXT,
    "terminalId" TEXT,
    "deviceType" INTEGER NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "ipAddress" TEXT,
    "port" INTEGER,
    "assignmentStatus" INTEGER NOT NULL DEFAULT 1,
    "assignedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingRequestDevice_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequestDevice_requestLocationId_fkey" FOREIGN KEY ("requestLocationId") REFERENCES "OnboardingRequestLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequestDevice_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequestDevice_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingRequestDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "onboardingRequestId" TEXT NOT NULL,
    "requestLocationId" TEXT,
    "docType" INTEGER NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "fileName" TEXT,
    "contentType" TEXT,
    "fileUrl" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedAt" DATETIME,
    "verifiedByUserId" TEXT,
    "verifiedAt" DATETIME,
    "rejectReason" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingRequestDocument_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequestDocument_requestLocationId_fkey" FOREIGN KEY ("requestLocationId") REFERENCES "OnboardingRequestLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequestDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequestDocument_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "onboardingRequestId" TEXT,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "carrier" TEXT,
    "serviceLevel" TEXT,
    "trackingNumber" TEXT,
    "shipToName" TEXT,
    "shipToPhone" TEXT,
    "shipToAddress1" TEXT NOT NULL,
    "shipToAddress2" TEXT,
    "shipToCity" TEXT NOT NULL,
    "shipToState" TEXT NOT NULL,
    "shipToPostalCode" TEXT NOT NULL,
    "shipToCountry" TEXT NOT NULL DEFAULT 'USA',
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shippedAt" DATETIME,
    "deliveredAt" DATETIME,
    CONSTRAINT "Shipment_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Shipment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShipmentPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "packageNo" INTEGER NOT NULL,
    "weightLb" REAL,
    "lengthIn" REAL,
    "widthIn" REAL,
    "heightIn" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentPackage_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipmentId" TEXT NOT NULL,
    "packageId" TEXT,
    "itemType" INTEGER NOT NULL,
    "terminalId" TEXT,
    "serialNumber" TEXT,
    "sku" TEXT,
    "itemName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShipmentItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ShipmentPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ShipmentItem_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "Terminal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OnboardingRequestEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "onboardingRequestId" TEXT NOT NULL,
    "eventType" INTEGER NOT NULL,
    "message" TEXT,
    "actorUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnboardingRequestEvent_onboardingRequestId_fkey" FOREIGN KEY ("onboardingRequestId") REFERENCES "OnboardingRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OnboardingRequestEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderTemplate_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderTemplate_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderTemplateItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "defaultQty" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "OrderTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OrderTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderTemplateItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashPayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL,
    "ticketNumber" TEXT,
    "vendorName" TEXT,
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashPayout_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashPayout_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CashPayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashPayout_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashDrawerSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScratchTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScratchTicket_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MasterUpcProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "upc" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "category" TEXT,
    "size" TEXT,
    "weight" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PrinterConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "printerLang" TEXT NOT NULL DEFAULT 'ESCPOS',
    "agentUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stationId" TEXT,
    "macAddress" TEXT,
    "labelWidth" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrinterConfig_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LocationProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" DECIMAL NOT NULL DEFAULT 0,
    "costPrice" DECIMAL NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IDScanLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "transactionId" TEXT,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "type" TEXT NOT NULL,
    "customerDOB" DATETIME,
    "items" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "response" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "resourceId" TEXT,
    "recurringId" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "RecurringAppointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("clientId", "createdAt", "employeeId", "endTime", "id", "locationId", "notes", "recurringId", "resourceId", "serviceId", "startTime", "status", "updatedAt") SELECT "clientId", "createdAt", "employeeId", "endTime", "id", "locationId", "notes", "recurringId", "resourceId", "serviceId", "startTime", "status", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE TABLE "new_AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "details" TEXT,
    "amount" DECIMAL,
    "transactionId" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" DATETIME,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AuditEvent" ("amount", "createdAt", "details", "employeeId", "employeeName", "eventType", "franchiseId", "id", "locationId", "reviewNote", "reviewedAt", "reviewedById", "reviewedByName", "severity", "transactionId") SELECT "amount", "createdAt", "details", "employeeId", "employeeName", "eventType", "franchiseId", "id", "locationId", "reviewNote", "reviewedAt", "reviewedById", "reviewedByName", "severity", "transactionId" FROM "AuditEvent";
DROP TABLE "AuditEvent";
ALTER TABLE "new_AuditEvent" RENAME TO "AuditEvent";
CREATE INDEX "AuditEvent_locationId_idx" ON "AuditEvent"("locationId");
CREATE INDEX "AuditEvent_franchiseId_idx" ON "AuditEvent"("franchiseId");
CREATE INDEX "AuditEvent_employeeId_idx" ON "AuditEvent"("employeeId");
CREATE INDEX "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");
CREATE INDEX "AuditEvent_severity_idx" ON "AuditEvent"("severity");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
CREATE TABLE "new_CashCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "expectedCash" DECIMAL NOT NULL DEFAULT 0,
    "countedCash" DECIMAL NOT NULL,
    "variance" DECIMAL NOT NULL DEFAULT 0,
    "denominations" TEXT,
    "note" TEXT,
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashCount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CashCount" ("approvedAt", "approvedById", "approvedByName", "countedCash", "createdAt", "denominations", "employeeId", "employeeName", "expectedCash", "id", "locationId", "note", "type", "variance") SELECT "approvedAt", "approvedById", "approvedByName", "countedCash", "createdAt", "denominations", "employeeId", "employeeName", "expectedCash", "id", "locationId", "note", "type", "variance" FROM "CashCount";
DROP TABLE "CashCount";
ALTER TABLE "new_CashCount" RENAME TO "CashCount";
CREATE INDEX "CashCount_locationId_idx" ON "CashCount"("locationId");
CREATE INDEX "CashCount_employeeId_idx" ON "CashCount"("employeeId");
CREATE INDEX "CashCount_type_idx" ON "CashCount"("type");
CREATE INDEX "CashCount_createdAt_idx" ON "CashCount"("createdAt");
CREATE TABLE "new_CashDrawerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "startingCash" DECIMAL NOT NULL,
    "endingCash" DECIMAL,
    "expectedCash" DECIMAL,
    "variance" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CashDrawerSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CashDrawerSession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CashDrawerSession" ("createdAt", "employeeId", "endTime", "endingCash", "expectedCash", "id", "locationId", "notes", "startTime", "startingCash", "status", "updatedAt", "variance") SELECT "createdAt", "employeeId", "endTime", "endingCash", "expectedCash", "id", "locationId", "notes", "startTime", "startingCash", "status", "updatedAt", "variance" FROM "CashDrawerSession";
DROP TABLE "CashDrawerSession";
ALTER TABLE "new_CashDrawerSession" RENAME TO "CashDrawerSession";
CREATE INDEX "CashDrawerSession_locationId_idx" ON "CashDrawerSession"("locationId");
CREATE INDEX "CashDrawerSession_employeeId_idx" ON "CashDrawerSession"("employeeId");
CREATE INDEX "CashDrawerSession_status_idx" ON "CashDrawerSession"("status");
CREATE INDEX "CashDrawerSession_startTime_idx" ON "CashDrawerSession"("startTime");
CREATE TABLE "new_CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CheckIn" ("checkedInAt", "clientId", "id", "locationId", "status", "updatedAt") SELECT "checkedInAt", "clientId", "id", "locationId", "status", "updatedAt" FROM "CheckIn";
DROP TABLE "CheckIn";
ALTER TABLE "new_CheckIn" RENAME TO "CheckIn";
CREATE INDEX "CheckIn_locationId_idx" ON "CheckIn"("locationId");
CREATE INDEX "CheckIn_status_idx" ON "CheckIn"("status");
CREATE INDEX "CheckIn_checkedInAt_idx" ON "CheckIn"("checkedInAt");
CREATE TABLE "new_ClientMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextBillingDate" DATETIME NOT NULL,
    "paymentMethodId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientMembership_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientMembership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClientMembership" ("clientId", "createdAt", "id", "nextBillingDate", "paymentMethodId", "planId", "startDate", "status", "updatedAt") SELECT "clientId", "createdAt", "id", "nextBillingDate", "paymentMethodId", "planId", "startDate", "status", "updatedAt" FROM "ClientMembership";
DROP TABLE "ClientMembership";
ALTER TABLE "new_ClientMembership" RENAME TO "ClientMembership";
CREATE TABLE "new_CommissionRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "servicePercent" DECIMAL NOT NULL,
    "productPercent" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionRule_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CommissionRule" ("createdAt", "franchiseId", "id", "name", "productPercent", "servicePercent") SELECT "createdAt", "franchiseId", "id", "name", "productPercent", "servicePercent" FROM "CommissionRule";
DROP TABLE "CommissionRule";
ALTER TABLE "new_CommissionRule" RENAME TO "CommissionRule";
CREATE TABLE "new_CustomerPromo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME NOT NULL,
    "redeemedAt" DATETIME,
    "excludeFromLoyalty" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerPromo_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerPromo_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CustomerPromo" ("clientId", "createdAt", "discountType", "discountValue", "excludeFromLoyalty", "expiresAt", "franchiseId", "id", "redeemedAt", "ruleName", "ruleType", "status") SELECT "clientId", "createdAt", "discountType", "discountValue", "excludeFromLoyalty", "expiresAt", "franchiseId", "id", "redeemedAt", "ruleName", "ruleType", "status" FROM "CustomerPromo";
DROP TABLE "CustomerPromo";
ALTER TABLE "new_CustomerPromo" RENAME TO "CustomerPromo";
CREATE TABLE "new_DepositLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "expectedAmount" DECIMAL NOT NULL,
    "depositedAmount" DECIMAL NOT NULL,
    "variance" DECIMAL NOT NULL DEFAULT 0,
    "bankDate" DATETIME NOT NULL,
    "slipNumber" TEXT,
    "slipImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "loggedById" TEXT,
    "loggedByName" TEXT,
    "reconciledById" TEXT,
    "reconciledByName" TEXT,
    "reconciledAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DepositLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DepositLog" ("bankDate", "createdAt", "depositedAmount", "expectedAmount", "id", "locationId", "loggedById", "loggedByName", "note", "reconciledAt", "reconciledById", "reconciledByName", "slipImageUrl", "slipNumber", "status", "updatedAt", "variance") SELECT "bankDate", "createdAt", "depositedAmount", "expectedAmount", "id", "locationId", "loggedById", "loggedByName", "note", "reconciledAt", "reconciledById", "reconciledByName", "slipImageUrl", "slipNumber", "status", "updatedAt", "variance" FROM "DepositLog";
DROP TABLE "DepositLog";
ALTER TABLE "new_DepositLog" RENAME TO "DepositLog";
CREATE INDEX "DepositLog_locationId_idx" ON "DepositLog"("locationId");
CREATE INDEX "DepositLog_status_idx" ON "DepositLog"("status");
CREATE INDEX "DepositLog_bankDate_idx" ON "DepositLog"("bankDate");
CREATE TABLE "new_Discount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "type" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "itemIds" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discount_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Discount" ("appliesTo", "code", "createdAt", "endDate", "franchiseId", "id", "isActive", "itemIds", "name", "startDate", "type", "updatedAt", "value") SELECT "appliesTo", "code", "createdAt", "endDate", "franchiseId", "id", "isActive", "itemIds", "name", "startDate", "type", "updatedAt", "value" FROM "Discount";
DROP TABLE "Discount";
ALTER TABLE "new_Discount" RENAME TO "Discount";
CREATE TABLE "new_DrawerActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "note" TEXT,
    "amount" REAL,
    "employeeId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shiftId" TEXT,
    "locationId" TEXT NOT NULL,
    "transactionId" TEXT,
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "alertLevel" TEXT,
    CONSTRAINT "DrawerActivity_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DrawerActivity_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashDrawerSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DrawerActivity_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DrawerActivity_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DrawerActivity" ("alertLevel", "alertSent", "amount", "employeeId", "id", "locationId", "note", "reason", "shiftId", "timestamp", "transactionId", "type") SELECT "alertLevel", "alertSent", "amount", "employeeId", "id", "locationId", "note", "reason", "shiftId", "timestamp", "transactionId", "type" FROM "DrawerActivity";
DROP TABLE "DrawerActivity";
ALTER TABLE "new_DrawerActivity" RENAME TO "DrawerActivity";
CREATE INDEX "DrawerActivity_locationId_idx" ON "DrawerActivity"("locationId");
CREATE INDEX "DrawerActivity_employeeId_idx" ON "DrawerActivity"("employeeId");
CREATE INDEX "DrawerActivity_type_idx" ON "DrawerActivity"("type");
CREATE INDEX "DrawerActivity_timestamp_idx" ON "DrawerActivity"("timestamp");
CREATE INDEX "DrawerActivity_shiftId_idx" ON "DrawerActivity"("shiftId");
CREATE TABLE "new_ExpansionRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseeId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "proposedName" TEXT NOT NULL,
    "proposedAddress" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpansionRequest_franchiseeId_fkey" FOREIGN KEY ("franchiseeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpansionRequest_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ExpansionRequest" ("createdAt", "franchiseId", "franchiseeId", "id", "notes", "proposedAddress", "proposedName", "responseNotes", "status", "updatedAt") SELECT "createdAt", "franchiseId", "franchiseeId", "id", "notes", "proposedAddress", "proposedName", "responseNotes", "status", "updatedAt" FROM "ExpansionRequest";
DROP TABLE "ExpansionRequest";
ALTER TABLE "new_ExpansionRequest" RENAME TO "ExpansionRequest";
CREATE TABLE "new_Franchise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "ssn" TEXT,
    "fein" TEXT,
    "routingNumber" TEXT,
    "accountNumber" TEXT,
    "voidCheckUrl" TEXT,
    "driverLicenseUrl" TEXT,
    "feinLetterUrl" TEXT,
    "needToDiscussProcessing" BOOLEAN NOT NULL DEFAULT false,
    "franchisorId" TEXT NOT NULL,
    "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" DATETIME,
    "suspendedReason" TEXT,
    "suspendedBy" TEXT,
    "scheduledDeletionAt" DATETIME,
    "deletedAt" DATETIME,
    "dataExportedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Franchise_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Franchise" ("accountNumber", "approvalStatus", "createdAt", "driverLicenseUrl", "fein", "feinLetterUrl", "franchisorId", "id", "name", "needToDiscussProcessing", "routingNumber", "slug", "ssn", "updatedAt", "voidCheckUrl") SELECT "accountNumber", "approvalStatus", "createdAt", "driverLicenseUrl", "fein", "feinLetterUrl", "franchisorId", "id", "name", "needToDiscussProcessing", "routingNumber", "slug", "ssn", "updatedAt", "voidCheckUrl" FROM "Franchise";
DROP TABLE "Franchise";
ALTER TABLE "new_Franchise" RENAME TO "Franchise";
CREATE UNIQUE INDEX "Franchise_slug_key" ON "Franchise"("slug");
CREATE TABLE "new_FranchiseSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "storeLogo" TEXT,
    "storeDisplayName" TEXT,
    "storeAddress" TEXT,
    "storeAddress2" TEXT,
    "storeCity" TEXT,
    "storeState" TEXT,
    "storeZip" TEXT,
    "storePhone" TEXT,
    "receiptHeader" TEXT,
    "receiptFooter" TEXT,
    "primaryColor" TEXT,
    "pricingModel" TEXT NOT NULL DEFAULT 'DUAL_PRICING',
    "cardSurchargeType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "cardSurcharge" DECIMAL NOT NULL DEFAULT 3.99,
    "showDualPricing" BOOLEAN NOT NULL DEFAULT true,
    "enablePackages" BOOLEAN NOT NULL DEFAULT true,
    "enableResources" BOOLEAN NOT NULL DEFAULT false,
    "enableClientPhotos" BOOLEAN NOT NULL DEFAULT false,
    "enableRecurringBooking" BOOLEAN NOT NULL DEFAULT true,
    "promoStackingMode" TEXT NOT NULL DEFAULT 'BEST_ONLY',
    "maxDiscountPercent" DECIMAL NOT NULL DEFAULT 50,
    "receiptPrintMode" TEXT NOT NULL DEFAULT 'ALL',
    "openDrawerOnCash" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FranchiseSettings_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FranchiseSettings" ("cardSurcharge", "cardSurchargeType", "createdAt", "enableClientPhotos", "enablePackages", "enableRecurringBooking", "enableResources", "franchiseId", "id", "maxDiscountPercent", "pricingModel", "promoStackingMode", "showDualPricing", "updatedAt") SELECT "cardSurcharge", "cardSurchargeType", "createdAt", "enableClientPhotos", "enablePackages", "enableRecurringBooking", "enableResources", "franchiseId", "id", "maxDiscountPercent", "pricingModel", "promoStackingMode", "showDualPricing", "updatedAt" FROM "FranchiseSettings";
DROP TABLE "FranchiseSettings";
ALTER TABLE "new_FranchiseSettings" RENAME TO "FranchiseSettings";
CREATE UNIQUE INDEX "FranchiseSettings_franchiseId_key" ON "FranchiseSettings"("franchiseId");
CREATE TABLE "new_Franchisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "providerId" TEXT,
    "name" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" DATETIME,
    "suspendedReason" TEXT,
    "businessType" TEXT NOT NULL DEFAULT 'MULTI_LOCATION_OWNER',
    "industryType" TEXT NOT NULL DEFAULT 'SERVICE',
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "integrations" TEXT,
    CONSTRAINT "Franchisor_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Franchisor_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Franchisor" ("accountNumber", "accountStatus", "address", "approvalStatus", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "driverLicenseUrl", "ebt", "faviconUrl", "fein", "feinLetterUrl", "id", "industryType", "integrations", "logoUrl", "name", "needToDiscussProcessing", "ownerId", "phone", "processingType", "routingNumber", "ss4", "ssn", "suspendedAt", "suspendedReason", "updatedAt", "voidCheckUrl") SELECT "accountNumber", "accountStatus", "address", "approvalStatus", "brandColorPrimary", "brandColorSecondary", "businessType", "corpAddress", "corpName", "createdAt", "documents", "documentsLater", "domain", "driverLicenseUrl", "ebt", "faviconUrl", "fein", "feinLetterUrl", "id", "industryType", "integrations", "logoUrl", "name", "needToDiscussProcessing", "ownerId", "phone", "processingType", "routingNumber", "ss4", "ssn", "suspendedAt", "suspendedReason", "updatedAt", "voidCheckUrl" FROM "Franchisor";
DROP TABLE "Franchisor";
ALTER TABLE "new_Franchisor" RENAME TO "Franchisor";
CREATE UNIQUE INDEX "Franchisor_ownerId_key" ON "Franchisor"("ownerId");
CREATE TABLE "new_GiftCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "initialAmount" DECIMAL NOT NULL,
    "currentBalance" DECIMAL NOT NULL,
    "purchaserId" TEXT,
    "recipientEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GiftCard_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GiftCard" ("code", "createdAt", "currentBalance", "expiresAt", "franchiseId", "id", "initialAmount", "isActive", "purchaserId", "recipientEmail", "updatedAt") SELECT "code", "createdAt", "currentBalance", "expiresAt", "franchiseId", "id", "initialAmount", "isActive", "purchaserId", "recipientEmail", "updatedAt" FROM "GiftCard";
DROP TABLE "GiftCard";
ALTER TABLE "new_GiftCard" RENAME TO "GiftCard";
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "franchiseId" TEXT NOT NULL,
    "setupCode" TEXT,
    "voidCheckUrl" TEXT,
    "ownerId" TEXT,
    "processorName" TEXT,
    "processorMID" TEXT,
    "processorTID" TEXT,
    "processorVAR" TEXT,
    "paxTerminalIP" TEXT,
    "paxTerminalPort" TEXT NOT NULL DEFAULT '10009',
    "googlePlaceId" TEXT,
    "showInDirectory" BOOLEAN NOT NULL DEFAULT false,
    "publicName" TEXT,
    "publicDescription" TEXT,
    "publicPhone" TEXT,
    "businessType" TEXT NOT NULL DEFAULT 'RETAIL',
    "latitude" REAL,
    "longitude" REAL,
    "operatingHours" TEXT,
    "publicLogoUrl" TEXT,
    "publicBannerUrl" TEXT,
    "pulseStoreCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Location_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Location_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("address", "createdAt", "franchiseId", "googlePlaceId", "id", "name", "ownerId", "paxTerminalIP", "paxTerminalPort", "processorMID", "processorName", "processorTID", "processorVAR", "pulseStoreCode", "slug", "updatedAt", "voidCheckUrl") SELECT "address", "createdAt", "franchiseId", "googlePlaceId", "id", "name", "ownerId", "paxTerminalIP", "paxTerminalPort", "processorMID", "processorName", "processorTID", "processorVAR", "pulseStoreCode", "slug", "updatedAt", "voidCheckUrl" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");
CREATE UNIQUE INDEX "Location_setupCode_key" ON "Location"("setupCode");
CREATE UNIQUE INDEX "Location_pulseStoreCode_key" ON "Location"("pulseStoreCode");
CREATE TABLE "new_LotteryGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "gameNumber" TEXT NOT NULL,
    "ticketPrice" DECIMAL NOT NULL,
    "prizePool" DECIMAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LotteryGame_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LotteryGame" ("createdAt", "franchiseId", "gameName", "gameNumber", "id", "isActive", "prizePool", "ticketPrice", "updatedAt") SELECT "createdAt", "franchiseId", "gameName", "gameNumber", "id", "isActive", "prizePool", "ticketPrice", "updatedAt" FROM "LotteryGame";
DROP TABLE "LotteryGame";
ALTER TABLE "new_LotteryGame" RENAME TO "LotteryGame";
CREATE INDEX "LotteryGame_franchiseId_idx" ON "LotteryGame"("franchiseId");
CREATE TABLE "new_LotteryPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "packNumber" TEXT NOT NULL,
    "ticketCount" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'INVENTORY',
    "activatedAt" DATETIME,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LotteryPack_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "LotteryGame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LotteryPack_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LotteryPack" ("activatedAt", "createdAt", "gameId", "id", "locationId", "packNumber", "settledAt", "soldCount", "status", "ticketCount", "updatedAt") SELECT "activatedAt", "createdAt", "gameId", "id", "locationId", "packNumber", "settledAt", "soldCount", "status", "ticketCount", "updatedAt" FROM "LotteryPack";
DROP TABLE "LotteryPack";
ALTER TABLE "new_LotteryPack" RENAME TO "LotteryPack";
CREATE INDEX "LotteryPack_locationId_idx" ON "LotteryPack"("locationId");
CREATE INDEX "LotteryPack_status_idx" ON "LotteryPack"("status");
CREATE UNIQUE INDEX "LotteryPack_gameId_packNumber_key" ON "LotteryPack"("gameId", "packNumber");
CREATE TABLE "new_LotteryTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "packId" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "ticketNumber" TEXT,
    "employeeId" TEXT NOT NULL,
    "transactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LotteryTransaction_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LotteryTransaction_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LotteryTransaction_packId_fkey" FOREIGN KEY ("packId") REFERENCES "LotteryPack" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LotteryTransaction" ("amount", "createdAt", "employeeId", "franchiseId", "id", "locationId", "packId", "ticketNumber", "transactionId", "type") SELECT "amount", "createdAt", "employeeId", "franchiseId", "id", "locationId", "packId", "ticketNumber", "transactionId", "type" FROM "LotteryTransaction";
DROP TABLE "LotteryTransaction";
ALTER TABLE "new_LotteryTransaction" RENAME TO "LotteryTransaction";
CREATE INDEX "LotteryTransaction_franchiseId_idx" ON "LotteryTransaction"("franchiseId");
CREATE INDEX "LotteryTransaction_locationId_idx" ON "LotteryTransaction"("locationId");
CREATE INDEX "LotteryTransaction_packId_idx" ON "LotteryTransaction"("packId");
CREATE INDEX "LotteryTransaction_createdAt_idx" ON "LotteryTransaction"("createdAt");
CREATE TABLE "new_ManufacturerConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "storeId" TEXT,
    "accountNumber" TEXT,
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "portalUrl" TEXT,
    "rebatePerPack" DECIMAL NOT NULL DEFAULT 0.04,
    "rebatePerCarton" DECIMAL NOT NULL DEFAULT 0.40,
    "loyaltyBonus" DECIMAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManufacturerConfig_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ManufacturerConfig" ("accountNumber", "apiKey", "apiSecret", "createdAt", "franchiseId", "id", "isActive", "lastSyncAt", "loyaltyBonus", "manufacturer", "portalUrl", "rebatePerCarton", "rebatePerPack", "storeId", "updatedAt") SELECT "accountNumber", "apiKey", "apiSecret", "createdAt", "franchiseId", "id", "isActive", "lastSyncAt", "loyaltyBonus", "manufacturer", "portalUrl", "rebatePerCarton", "rebatePerPack", "storeId", "updatedAt" FROM "ManufacturerConfig";
DROP TABLE "ManufacturerConfig";
ALTER TABLE "new_ManufacturerConfig" RENAME TO "ManufacturerConfig";
CREATE INDEX "ManufacturerConfig_franchiseId_idx" ON "ManufacturerConfig"("franchiseId");
CREATE UNIQUE INDEX "ManufacturerConfig_franchiseId_manufacturer_key" ON "ManufacturerConfig"("franchiseId", "manufacturer");
CREATE TABLE "new_MembershipPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "description" TEXT,
    "discountPercent" DECIMAL NOT NULL DEFAULT 0,
    "includedServices" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MembershipPlan_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MembershipPlan" ("billingInterval", "createdAt", "description", "discountPercent", "franchiseId", "id", "includedServices", "isActive", "name", "price") SELECT "billingInterval", "createdAt", "description", "discountPercent", "franchiseId", "id", "includedServices", "isActive", "name", "price" FROM "MembershipPlan";
DROP TABLE "MembershipPlan";
ALTER TABLE "new_MembershipPlan" RENAME TO "MembershipPlan";
CREATE TABLE "new_PointsTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" TEXT,
    "masterAccountId" TEXT,
    "memberId" TEXT,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "transactionId" TEXT,
    "locationId" TEXT,
    "franchiseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointsTransaction_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PointsTransaction_masterAccountId_fkey" FOREIGN KEY ("masterAccountId") REFERENCES "LoyaltyMasterAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PointsTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LoyaltyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PointsTransaction" ("createdAt", "description", "franchiseId", "id", "masterAccountId", "points", "programId", "transactionId", "type") SELECT "createdAt", "description", "franchiseId", "id", "masterAccountId", "points", "programId", "transactionId", "type" FROM "PointsTransaction";
DROP TABLE "PointsTransaction";
ALTER TABLE "new_PointsTransaction" RENAME TO "PointsTransaction";
CREATE INDEX "PointsTransaction_programId_createdAt_idx" ON "PointsTransaction"("programId", "createdAt");
CREATE INDEX "PointsTransaction_masterAccountId_createdAt_idx" ON "PointsTransaction"("masterAccountId", "createdAt");
CREATE INDEX "PointsTransaction_memberId_idx" ON "PointsTransaction"("memberId");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "cost" DECIMAL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "categoryId" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reorderPoint" INTEGER,
    "minStock" INTEGER,
    "maxStock" INTEGER,
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
    "minimumAge" INTEGER,
    "brand" TEXT,
    "vendor" TEXT,
    "size" TEXT,
    "productType" TEXT,
    "isEbtEligible" BOOLEAN NOT NULL DEFAULT false,
    "isTobacco" BOOLEAN NOT NULL DEFAULT false,
    "alcoholType" TEXT,
    "volumeMl" INTEGER,
    "abvPercent" DECIMAL,
    "unitsPerCase" INTEGER,
    "casePrice" DECIMAL,
    "sellByCase" BOOLEAN NOT NULL DEFAULT false,
    "stockCases" INTEGER NOT NULL DEFAULT 0,
    "globalProductId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("abvPercent", "ageRestricted", "alcoholType", "barcode", "brand", "casePrice", "category", "categoryId", "cost", "createdAt", "description", "franchiseId", "globalProductId", "id", "isActive", "isEbtEligible", "isTobacco", "maxStock", "minStock", "minimumAge", "name", "price", "productType", "reorderPoint", "sellByCase", "size", "sku", "stock", "stockCases", "unitsPerCase", "updatedAt", "vendor", "volumeMl") SELECT "abvPercent", "ageRestricted", "alcoholType", "barcode", "brand", "casePrice", "category", "categoryId", "cost", "createdAt", "description", "franchiseId", "globalProductId", "id", "isActive", "isEbtEligible", "isTobacco", "maxStock", "minStock", "minimumAge", "name", "price", "productType", "reorderPoint", "sellByCase", "size", "sku", "stock", "stockCases", "unitsPerCase", "updatedAt", "vendor", "volumeMl" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_franchiseId_idx" ON "Product"("franchiseId");
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX "Product_vendor_idx" ON "Product"("vendor");
CREATE INDEX "Product_brand_idx" ON "Product"("brand");
CREATE INDEX "Product_franchiseId_barcode_idx" ON "Product"("franchiseId", "barcode");
CREATE INDEX "Product_franchiseId_sku_idx" ON "Product"("franchiseId", "sku");
CREATE INDEX "Product_franchiseId_isActive_idx" ON "Product"("franchiseId", "isActive");
CREATE INDEX "Product_franchiseId_categoryId_idx" ON "Product"("franchiseId", "categoryId");
CREATE TABLE "new_PromotionProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promotionId" TEXT NOT NULL,
    "categoryId" TEXT,
    "productId" TEXT,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PromotionProduct_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromotionProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PromotionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PromotionProduct" ("categoryId", "id", "isExcluded", "productId", "promotionId") SELECT "categoryId", "id", "isExcluded", "productId", "promotionId" FROM "PromotionProduct";
DROP TABLE "PromotionProduct";
ALTER TABLE "new_PromotionProduct" RENAME TO "PromotionProduct";
CREATE INDEX "PromotionProduct_promotionId_idx" ON "PromotionProduct"("promotionId");
CREATE INDEX "PromotionProduct_productId_idx" ON "PromotionProduct"("productId");
CREATE INDEX "PromotionProduct_categoryId_idx" ON "PromotionProduct"("categoryId");
CREATE TABLE "new_PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalCost" DECIMAL NOT NULL,
    "expectedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseOrder" ("createdAt", "expectedDate", "franchiseId", "id", "locationId", "status", "supplierId", "totalCost", "updatedAt") SELECT "createdAt", "expectedDate", "franchiseId", "id", "locationId", "status", "supplierId", "totalCost", "updatedAt" FROM "PurchaseOrder";
DROP TABLE "PurchaseOrder";
ALTER TABLE "new_PurchaseOrder" RENAME TO "PurchaseOrder";
CREATE INDEX "PurchaseOrder_franchiseId_idx" ON "PurchaseOrder"("franchiseId");
CREATE INDEX "PurchaseOrder_locationId_idx" ON "PurchaseOrder"("locationId");
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");
CREATE TABLE "new_RecurringAppointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "employeeId" TEXT,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "preferredTime" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "maxOccurrences" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringAppointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringAppointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecurringAppointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RecurringAppointment" ("clientId", "createdAt", "dayOfMonth", "dayOfWeek", "employeeId", "endDate", "frequency", "id", "isActive", "lastGeneratedDate", "locationId", "maxOccurrences", "preferredTime", "serviceId", "startDate", "updatedAt") SELECT "clientId", "createdAt", "dayOfMonth", "dayOfWeek", "employeeId", "endDate", "frequency", "id", "isActive", "lastGeneratedDate", "locationId", "maxOccurrences", "preferredTime", "serviceId", "startDate", "updatedAt" FROM "RecurringAppointment";
DROP TABLE "RecurringAppointment";
ALTER TABLE "new_RecurringAppointment" RENAME TO "RecurringAppointment";
CREATE TABLE "new_ReminderSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "confirmationEmail" BOOLEAN NOT NULL DEFAULT true,
    "reminder24hEmail" BOOLEAN NOT NULL DEFAULT true,
    "reminder2hEmail" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsApproved" BOOLEAN NOT NULL DEFAULT false,
    "smsRequestedAt" DATETIME,
    "confirmationSms" BOOLEAN NOT NULL DEFAULT false,
    "reminder24hSms" BOOLEAN NOT NULL DEFAULT false,
    "reminder2hSms" BOOLEAN NOT NULL DEFAULT false,
    "approvalSms" BOOLEAN NOT NULL DEFAULT true,
    "cancellationSms" BOOLEAN NOT NULL DEFAULT true,
    "waitlistSms" BOOLEAN NOT NULL DEFAULT true,
    "twilioAccountSid" TEXT,
    "twilioAuthToken" TEXT,
    "twilioPhoneNumber" TEXT,
    "emailSubject" TEXT NOT NULL DEFAULT 'Appointment Reminder',
    "emailTemplate" TEXT,
    "smsTemplate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReminderSettings_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ReminderSettings" ("approvalSms", "cancellationSms", "confirmationEmail", "confirmationSms", "createdAt", "emailEnabled", "emailSubject", "emailTemplate", "franchiseId", "id", "reminder24hEmail", "reminder24hSms", "reminder2hEmail", "reminder2hSms", "smsApproved", "smsEnabled", "smsRequestedAt", "smsTemplate", "twilioAccountSid", "twilioAuthToken", "twilioPhoneNumber", "updatedAt", "waitlistSms") SELECT "approvalSms", "cancellationSms", "confirmationEmail", "confirmationSms", "createdAt", "emailEnabled", "emailSubject", "emailTemplate", "franchiseId", "id", "reminder24hEmail", "reminder24hSms", "reminder2hEmail", "reminder2hSms", "smsApproved", "smsEnabled", "smsRequestedAt", "smsTemplate", "twilioAccountSid", "twilioAuthToken", "twilioPhoneNumber", "updatedAt", "waitlistSms" FROM "ReminderSettings";
DROP TABLE "ReminderSettings";
ALTER TABLE "new_ReminderSettings" RENAME TO "ReminderSettings";
CREATE UNIQUE INDEX "ReminderSettings_franchiseId_key" ON "ReminderSettings"("franchiseId");
CREATE TABLE "new_Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CHAIR',
    "description" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "allowedServiceIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Resource" ("allowedServiceIds", "capacity", "createdAt", "description", "id", "isActive", "locationId", "name", "sortOrder", "type", "updatedAt") SELECT "allowedServiceIds", "capacity", "createdAt", "description", "id", "isActive", "locationId", "name", "sortOrder", "type", "updatedAt" FROM "Resource";
DROP TABLE "Resource";
ALTER TABLE "new_Resource" RENAME TO "Resource";
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "transactionRef" TEXT,
    "rating" INTEGER NOT NULL,
    "feedbackTag" TEXT,
    "comment" TEXT,
    "locationId" TEXT,
    "googleReviewId" TEXT,
    "postedToGoogle" BOOLEAN NOT NULL DEFAULT false,
    "redirectedToGoogle" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Review_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("clientId", "comment", "createdAt", "feedbackTag", "franchiseId", "googleReviewId", "id", "locationId", "postedAt", "postedToGoogle", "rating", "redirectedToGoogle", "transactionRef", "updatedAt") SELECT "clientId", "comment", "createdAt", "feedbackTag", "franchiseId", "googleReviewId", "id", "locationId", "postedAt", "postedToGoogle", "rating", "redirectedToGoogle", "transactionRef", "updatedAt" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
CREATE TABLE "new_RoyaltyRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "grossRevenue" DECIMAL NOT NULL,
    "royaltyAmount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoyaltyRecord_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RoyaltyRecord" ("createdAt", "franchiseId", "grossRevenue", "id", "notes", "paidAt", "periodEnd", "periodStart", "royaltyAmount", "status", "updatedAt") SELECT "createdAt", "franchiseId", "grossRevenue", "id", "notes", "paidAt", "periodEnd", "periodStart", "royaltyAmount", "status", "updatedAt" FROM "RoyaltyRecord";
DROP TABLE "RoyaltyRecord";
ALTER TABLE "new_RoyaltyRecord" RENAME TO "RoyaltyRecord";
CREATE TABLE "new_SafeDrop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT,
    "amount" DECIMAL NOT NULL,
    "witnessedById" TEXT,
    "witnessedByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SafeDrop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SafeDrop" ("amount", "createdAt", "employeeId", "employeeName", "id", "locationId", "witnessedById", "witnessedByName") SELECT "amount", "createdAt", "employeeId", "employeeName", "id", "locationId", "witnessedById", "witnessedByName" FROM "SafeDrop";
DROP TABLE "SafeDrop";
ALTER TABLE "new_SafeDrop" RENAME TO "SafeDrop";
CREATE INDEX "SafeDrop_locationId_idx" ON "SafeDrop"("locationId");
CREATE INDEX "SafeDrop_createdAt_idx" ON "SafeDrop"("createdAt");
CREATE TABLE "new_Schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Schedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Schedule" ("createdAt", "date", "employeeId", "endTime", "id", "locationId", "startTime", "updatedAt") SELECT "createdAt", "date", "employeeId", "endTime", "id", "locationId", "startTime", "updatedAt" FROM "Schedule";
DROP TABLE "Schedule";
ALTER TABLE "new_Schedule" RENAME TO "Schedule";
CREATE TABLE "new_ServicePackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceId" TEXT NOT NULL,
    "sessionsIncluded" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "validityDays" INTEGER NOT NULL DEFAULT 365,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServicePackage_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServicePackage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ServicePackage" ("createdAt", "description", "franchiseId", "id", "isActive", "name", "price", "serviceId", "sessionsIncluded", "updatedAt", "validityDays") SELECT "createdAt", "description", "franchiseId", "id", "isActive", "name", "price", "serviceId", "sessionsIncluded", "updatedAt", "validityDays" FROM "ServicePackage";
DROP TABLE "ServicePackage";
ALTER TABLE "new_ServicePackage" RENAME TO "ServicePackage";
CREATE TABLE "new_SmsCredits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "creditsRemaining" INTEGER NOT NULL DEFAULT 0,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastTopupAt" DATETIME,
    "lastPackage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SmsCredits_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SmsCredits" ("createdAt", "creditsRemaining", "creditsUsed", "franchiseId", "id", "lastPackage", "lastTopupAt", "updatedAt") SELECT "createdAt", "creditsRemaining", "creditsUsed", "franchiseId", "id", "lastPackage", "lastTopupAt", "updatedAt" FROM "SmsCredits";
DROP TABLE "SmsCredits";
ALTER TABLE "new_SmsCredits" RENAME TO "SmsCredits";
CREATE UNIQUE INDEX "SmsCredits_franchiseId_key" ON "SmsCredits"("franchiseId");
CREATE TABLE "new_SmsMarketingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "daysInactive" INTEGER DEFAULT 28,
    "daysInactiveMax" INTEGER,
    "minSpendTotal" DECIMAL,
    "maxSpendTotal" DECIMAL,
    "minSpendPerVisit" DECIMAL,
    "minVisitCount" INTEGER,
    "maxVisitCount" INTEGER,
    "lastServiceId" TEXT,
    "anyServiceId" TEXT,
    "hasPhone" BOOLEAN NOT NULL DEFAULT true,
    "hasEmail" BOOLEAN NOT NULL DEFAULT false,
    "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL NOT NULL DEFAULT 10,
    "validityDays" INTEGER NOT NULL DEFAULT 7,
    "messageTemplate" TEXT,
    "maxSendsPerDay" INTEGER,
    "maxSendsTotal" INTEGER,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SmsMarketingRule_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SmsMarketingRule" ("anyServiceId", "createdAt", "daysInactive", "daysInactiveMax", "discountType", "discountValue", "franchiseId", "hasEmail", "hasPhone", "id", "isActive", "lastServiceId", "maxSendsPerDay", "maxSendsTotal", "maxSpendTotal", "maxVisitCount", "messageTemplate", "minSpendPerVisit", "minSpendTotal", "minVisitCount", "name", "redeemedCount", "ruleType", "sentCount", "updatedAt", "validityDays") SELECT "anyServiceId", "createdAt", "daysInactive", "daysInactiveMax", "discountType", "discountValue", "franchiseId", "hasEmail", "hasPhone", "id", "isActive", "lastServiceId", "maxSendsPerDay", "maxSendsTotal", "maxSpendTotal", "maxVisitCount", "messageTemplate", "minSpendPerVisit", "minSpendTotal", "minVisitCount", "name", "redeemedCount", "ruleType", "sentCount", "updatedAt", "validityDays" FROM "SmsMarketingRule";
DROP TABLE "SmsMarketingRule";
ALTER TABLE "new_SmsMarketingRule" RENAME TO "SmsMarketingRule";
CREATE TABLE "new_SplitPayoutConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "royaltyPercent" DECIMAL NOT NULL,
    "marketingPercent" DECIMAL NOT NULL DEFAULT 0,
    "franchisorAccountId" TEXT,
    "franchiseeAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SplitPayoutConfig_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SplitPayoutConfig" ("createdAt", "franchiseId", "franchiseeAccountId", "franchisorAccountId", "id", "isEnabled", "marketingPercent", "royaltyPercent", "updatedAt") SELECT "createdAt", "franchiseId", "franchiseeAccountId", "franchisorAccountId", "id", "isEnabled", "marketingPercent", "royaltyPercent", "updatedAt" FROM "SplitPayoutConfig";
DROP TABLE "SplitPayoutConfig";
ALTER TABLE "new_SplitPayoutConfig" RENAME TO "SplitPayoutConfig";
CREATE UNIQUE INDEX "SplitPayoutConfig_franchiseId_key" ON "SplitPayoutConfig"("franchiseId");
CREATE TABLE "new_StockAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "performedBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockAdjustment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockAdjustment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StockAdjustment" ("createdAt", "id", "locationId", "notes", "performedBy", "productId", "quantity", "reason") SELECT "createdAt", "id", "locationId", "notes", "performedBy", "productId", "quantity", "reason" FROM "StockAdjustment";
DROP TABLE "StockAdjustment";
ALTER TABLE "new_StockAdjustment" RENAME TO "StockAdjustment";
CREATE INDEX "StockAdjustment_productId_idx" ON "StockAdjustment"("productId");
CREATE INDEX "StockAdjustment_locationId_idx" ON "StockAdjustment"("locationId");
CREATE INDEX "StockAdjustment_reason_idx" ON "StockAdjustment"("reason");
CREATE INDEX "StockAdjustment_createdAt_idx" ON "StockAdjustment"("createdAt");
CREATE TABLE "new_StoreException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "franchiseId" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedById" TEXT,
    "acknowledgedByName" TEXT,
    "acknowledgedAt" DATETIME,
    "resolvedById" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoreException_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StoreException" ("acknowledgedAt", "acknowledgedById", "acknowledgedByName", "createdAt", "description", "exceptionType", "franchiseId", "id", "locationId", "relatedEntityId", "relatedEntityType", "resolutionNote", "resolvedAt", "resolvedById", "resolvedByName", "severity", "status", "title", "updatedAt") SELECT "acknowledgedAt", "acknowledgedById", "acknowledgedByName", "createdAt", "description", "exceptionType", "franchiseId", "id", "locationId", "relatedEntityId", "relatedEntityType", "resolutionNote", "resolvedAt", "resolvedById", "resolvedByName", "severity", "status", "title", "updatedAt" FROM "StoreException";
DROP TABLE "StoreException";
ALTER TABLE "new_StoreException" RENAME TO "StoreException";
CREATE INDEX "StoreException_locationId_idx" ON "StoreException"("locationId");
CREATE INDEX "StoreException_franchiseId_idx" ON "StoreException"("franchiseId");
CREATE INDEX "StoreException_exceptionType_idx" ON "StoreException"("exceptionType");
CREATE INDEX "StoreException_severity_idx" ON "StoreException"("severity");
CREATE INDEX "StoreException_status_idx" ON "StoreException"("status");
CREATE INDEX "StoreException_createdAt_idx" ON "StoreException"("createdAt");
CREATE TABLE "new_Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Supplier_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Supplier" ("address", "contactName", "createdAt", "email", "franchiseId", "id", "name", "phone") SELECT "address", "contactName", "createdAt", "email", "franchiseId", "id", "name", "phone" FROM "Supplier";
DROP TABLE "Supplier";
ALTER TABLE "new_Supplier" RENAME TO "Supplier";
CREATE TABLE "new_Terminal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serialNumber" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Terminal_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Terminal" ("createdAt", "id", "ipAddress", "locationId", "macAddress", "model", "serialNumber", "status", "updatedAt") SELECT "createdAt", "id", "ipAddress", "locationId", "macAddress", "model", "serialNumber", "status", "updatedAt" FROM "Terminal";
DROP TABLE "Terminal";
ALTER TABLE "new_Terminal" RENAME TO "Terminal";
CREATE UNIQUE INDEX "Terminal_serialNumber_key" ON "Terminal"("serialNumber");
CREATE TABLE "new_TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "clockIn" DATETIME NOT NULL,
    "clockOut" DATETIME,
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "totalHours" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TimeEntry" ("breakDuration", "clockIn", "clockOut", "createdAt", "id", "locationId", "status", "totalHours", "updatedAt", "userId") SELECT "breakDuration", "clockIn", "clockOut", "createdAt", "id", "locationId", "status", "totalHours", "updatedAt", "userId" FROM "TimeEntry";
DROP TABLE "TimeEntry";
ALTER TABLE "new_TimeEntry" RENAME TO "TimeEntry";
CREATE TABLE "new_TobaccoDeal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "dealName" TEXT NOT NULL,
    "dealType" TEXT NOT NULL,
    "buyQuantity" INTEGER,
    "getFreeQuantity" INTEGER,
    "discountType" TEXT NOT NULL,
    "discountAmount" DECIMAL NOT NULL,
    "applicableUpcs" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timesApplied" INTEGER NOT NULL DEFAULT 0,
    "totalSavings" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "manufacturerPLU" TEXT,
    "manufacturerName" TEXT,
    "redemptionProgram" TEXT,
    "name" TEXT,
    "brand" TEXT,
    "description" TEXT,
    "itemId" TEXT,
    CONSTRAINT "TobaccoDeal_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TobaccoDeal_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TobaccoDeal" ("applicableUpcs", "brand", "buyQuantity", "createdAt", "dealName", "dealType", "description", "discountAmount", "discountType", "endDate", "franchiseId", "getFreeQuantity", "id", "isActive", "itemId", "manufacturer", "manufacturerName", "manufacturerPLU", "name", "redemptionProgram", "startDate", "timesApplied", "totalSavings", "updatedAt") SELECT "applicableUpcs", "brand", "buyQuantity", "createdAt", "dealName", "dealType", "description", "discountAmount", "discountType", "endDate", "franchiseId", "getFreeQuantity", "id", "isActive", "itemId", "manufacturer", "manufacturerName", "manufacturerPLU", "name", "redemptionProgram", "startDate", "timesApplied", "totalSavings", "updatedAt" FROM "TobaccoDeal";
DROP TABLE "TobaccoDeal";
ALTER TABLE "new_TobaccoDeal" RENAME TO "TobaccoDeal";
CREATE INDEX "TobaccoDeal_franchiseId_idx" ON "TobaccoDeal"("franchiseId");
CREATE INDEX "TobaccoDeal_manufacturer_idx" ON "TobaccoDeal"("manufacturer");
CREATE INDEX "TobaccoDeal_isActive_idx" ON "TobaccoDeal"("isActive");
CREATE INDEX "TobaccoDeal_manufacturerPLU_idx" ON "TobaccoDeal"("manufacturerPLU");
CREATE TABLE "new_TobaccoScanSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "weekEndDate" DATETIME NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "totalAmount" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" DATETIME,
    "confirmedAt" DATETIME,
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TobaccoScanSubmission_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TobaccoScanSubmission_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TobaccoScanSubmission" ("confirmedAt", "createdAt", "fileUrl", "franchiseId", "id", "locationId", "manufacturer", "notes", "recordCount", "status", "submittedAt", "totalAmount", "updatedAt", "weekEndDate", "weekStartDate") SELECT "confirmedAt", "createdAt", "fileUrl", "franchiseId", "id", "locationId", "manufacturer", "notes", "recordCount", "status", "submittedAt", "totalAmount", "updatedAt", "weekEndDate", "weekStartDate" FROM "TobaccoScanSubmission";
DROP TABLE "TobaccoScanSubmission";
ALTER TABLE "new_TobaccoScanSubmission" RENAME TO "TobaccoScanSubmission";
CREATE INDEX "TobaccoScanSubmission_franchiseId_idx" ON "TobaccoScanSubmission"("franchiseId");
CREATE INDEX "TobaccoScanSubmission_locationId_idx" ON "TobaccoScanSubmission"("locationId");
CREATE INDEX "TobaccoScanSubmission_manufacturer_idx" ON "TobaccoScanSubmission"("manufacturer");
CREATE INDEX "TobaccoScanSubmission_weekStartDate_idx" ON "TobaccoScanSubmission"("weekStartDate");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT,
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
    "gatewayTxId" TEXT,
    "authCode" TEXT,
    "cardLast4" TEXT,
    "cardType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "voidedById" TEXT,
    "voidedAt" DATETIME,
    "voidReason" TEXT,
    "cashDrawerSessionId" TEXT,
    "originalTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_cashDrawerSessionId_fkey" FOREIGN KEY ("cashDrawerSessionId") REFERENCES "CashDrawerSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_originalTransactionId_fkey" FOREIGN KEY ("originalTransactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("authCode", "cardAmount", "cardFee", "cardLast4", "cardType", "cashAmount", "cashDrawerSessionId", "clientId", "createdAt", "discount", "employeeId", "franchiseId", "gatewayTxId", "id", "invoiceNumber", "originalTransactionId", "paymentMethod", "processingPlan", "status", "subtotal", "tax", "tip", "total", "updatedAt", "voidReason", "voidedAt", "voidedById") SELECT "authCode", "cardAmount", "cardFee", "cardLast4", "cardType", "cashAmount", "cashDrawerSessionId", "clientId", "createdAt", "discount", "employeeId", "franchiseId", "gatewayTxId", "id", "invoiceNumber", "originalTransactionId", "paymentMethod", "processingPlan", "status", "subtotal", "tax", "tip", "total", "updatedAt", "voidReason", "voidedAt", "voidedById" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_invoiceNumber_key" ON "Transaction"("invoiceNumber");
CREATE INDEX "Transaction_franchiseId_idx" ON "Transaction"("franchiseId");
CREATE INDEX "Transaction_clientId_idx" ON "Transaction"("clientId");
CREATE INDEX "Transaction_employeeId_idx" ON "Transaction"("employeeId");
CREATE INDEX "Transaction_paymentMethod_idx" ON "Transaction"("paymentMethod");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");
CREATE INDEX "Transaction_invoiceNumber_idx" ON "Transaction"("invoiceNumber");
CREATE TABLE "new_TransactionLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "serviceId" TEXT,
    "staffId" TEXT,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionLineItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionLineItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransactionLineItem_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransactionLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TransactionLineItem" ("createdAt", "discount", "id", "price", "productId", "quantity", "serviceId", "staffId", "total", "transactionId", "type") SELECT "createdAt", "discount", "id", "price", "productId", "quantity", "serviceId", "staffId", "total", "transactionId", "type" FROM "TransactionLineItem";
DROP TABLE "TransactionLineItem";
ALTER TABLE "new_TransactionLineItem" RENAME TO "TransactionLineItem";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT,
    "pin" TEXT,
    "image" TEXT,
    "dailyGoal" REAL NOT NULL DEFAULT 500,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "providerId" TEXT,
    "customPermissions" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "acceptedTermsAt" DATETIME,
    "acceptedTermsVersion" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "mfaBackupCodes" TEXT,
    "mfaSetupAt" DATETIME,
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
    "hasPulseAccess" BOOLEAN NOT NULL DEFAULT false,
    "pulseLocationIds" TEXT,
    "franchiseId" TEXT,
    "locationId" TEXT,
    "assignedStationId" TEXT,
    "commissionRuleId" TEXT,
    CONSTRAINT "User_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_assignedStationId_fkey" FOREIGN KEY ("assignedStationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("acceptedTermsAt", "acceptedTermsVersion", "assignedStationId", "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "dailyGoal", "email", "failedLoginAttempts", "franchiseId", "hasPulseAccess", "id", "image", "locationId", "lockedUntil", "mfaBackupCodes", "mfaEnabled", "mfaSecret", "mfaSetupAt", "name", "password", "pin", "role", "updatedAt") SELECT "acceptedTermsAt", "acceptedTermsVersion", "assignedStationId", "canAddProducts", "canAddServices", "canClockIn", "canClockOut", "canManageEmployees", "canManageInventory", "canManageSchedule", "canManageShifts", "canProcessRefunds", "canViewReports", "commissionRuleId", "createdAt", "customPermissions", "dailyGoal", "email", "failedLoginAttempts", "franchiseId", "hasPulseAccess", "id", "image", "locationId", "lockedUntil", "mfaBackupCodes", "mfaEnabled", "mfaSecret", "mfaSetupAt", "name", "password", "pin", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE TABLE "new_WaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locationId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "serviceId" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "position" INTEGER NOT NULL,
    "estimatedWait" INTEGER,
    "checkedInAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seatedAt" DATETIME,
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WaitlistEntry_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WaitlistEntry" ("checkedInAt", "createdAt", "customerEmail", "customerName", "customerPhone", "estimatedWait", "id", "locationId", "notes", "notifiedAt", "partySize", "position", "seatedAt", "serviceId", "status", "updatedAt") SELECT "checkedInAt", "createdAt", "customerEmail", "customerName", "customerPhone", "estimatedWait", "id", "locationId", "notes", "notifiedAt", "partySize", "position", "seatedAt", "serviceId", "status", "updatedAt" FROM "WaitlistEntry";
DROP TABLE "WaitlistEntry";
ALTER TABLE "new_WaitlistEntry" RENAME TO "WaitlistEntry";
CREATE INDEX "WaitlistEntry_locationId_idx" ON "WaitlistEntry"("locationId");
CREATE INDEX "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");
CREATE INDEX "WaitlistEntry_checkedInAt_idx" ON "WaitlistEntry"("checkedInAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Provider_publicId_key" ON "Provider"("publicId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_userId_idx" ON "UserRoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_providerId_idx" ON "UserRoleAssignment"("providerId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_franchisorId_idx" ON "UserRoleAssignment"("franchisorId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_franchiseId_idx" ON "UserRoleAssignment"("franchiseId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_locationId_idx" ON "UserRoleAssignment"("locationId");

-- CreateIndex
CREATE INDEX "LocationPaymentProfile_locationId_idx" ON "LocationPaymentProfile"("locationId");

-- CreateIndex
CREATE INDEX "LocationPaymentProfile_processorMID_idx" ON "LocationPaymentProfile"("processorMID");

-- CreateIndex
CREATE INDEX "LocationPaymentProfile_processorTID_idx" ON "LocationPaymentProfile"("processorTID");

-- CreateIndex
CREATE INDEX "LocationItemOverride_locationId_idx" ON "LocationItemOverride"("locationId");

-- CreateIndex
CREATE INDEX "LocationItemOverride_franchiseId_idx" ON "LocationItemOverride"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationItemOverride_locationId_itemId_key" ON "LocationItemOverride"("locationId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationItemOverride_locationId_productId_key" ON "LocationItemOverride"("locationId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationItemOverride_locationId_serviceId_key" ON "LocationItemOverride"("locationId", "serviceId");

-- CreateIndex
CREATE INDEX "StockOnHand_locationId_idx" ON "StockOnHand"("locationId");

-- CreateIndex
CREATE INDEX "StockOnHand_itemId_idx" ON "StockOnHand"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "StockOnHand_locationId_itemId_key" ON "StockOnHand"("locationId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientCard_locationId_key" ON "ClientCard"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_publicId_key" ON "Ticket"("publicId");

-- CreateIndex
CREATE INDEX "Ticket_status_severity_idx" ON "Ticket"("status", "severity");

-- CreateIndex
CREATE INDEX "Ticket_locationId_idx" ON "Ticket"("locationId");

-- CreateIndex
CREATE INDEX "Ticket_franchiseId_idx" ON "Ticket"("franchiseId");

-- CreateIndex
CREATE INDEX "Ticket_assignedToUserId_idx" ON "Ticket"("assignedToUserId");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_publicId_key" ON "Incident"("publicId");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "IncidentImpact_incidentId_idx" ON "IncidentImpact"("incidentId");

-- CreateIndex
CREATE INDEX "Document_franchiseId_docType_idx" ON "Document"("franchiseId", "docType");

-- CreateIndex
CREATE INDEX "Document_locationId_idx" ON "Document"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingRequest_requestNumber_key" ON "OnboardingRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "OnboardingRequest_status_submittedAt_idx" ON "OnboardingRequest"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "OnboardingRequest_assignedToUserId_status_idx" ON "OnboardingRequest"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "OnboardingRequest_franchisorId_status_idx" ON "OnboardingRequest"("franchisorId", "status");

-- CreateIndex
CREATE INDEX "OnboardingRequest_franchiseId_idx" ON "OnboardingRequest"("franchiseId");

-- CreateIndex
CREATE INDEX "OnboardingRequestLocation_onboardingRequestId_idx" ON "OnboardingRequestLocation"("onboardingRequestId");

-- CreateIndex
CREATE INDEX "OnboardingRequestLocation_locationId_idx" ON "OnboardingRequestLocation"("locationId");

-- CreateIndex
CREATE INDEX "OnboardingRequestDevice_onboardingRequestId_assignmentStatus_idx" ON "OnboardingRequestDevice"("onboardingRequestId", "assignmentStatus");

-- CreateIndex
CREATE INDEX "OnboardingRequestDevice_terminalId_idx" ON "OnboardingRequestDevice"("terminalId");

-- CreateIndex
CREATE INDEX "OnboardingRequestDocument_onboardingRequestId_status_idx" ON "OnboardingRequestDocument"("onboardingRequestId", "status");

-- CreateIndex
CREATE INDEX "Shipment_onboardingRequestId_status_idx" ON "Shipment"("onboardingRequestId", "status");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_locationId_status_idx" ON "Shipment"("locationId", "status");

-- CreateIndex
CREATE INDEX "ShipmentPackage_shipmentId_idx" ON "ShipmentPackage"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentPackage_shipmentId_packageNo_key" ON "ShipmentPackage"("shipmentId", "packageNo");

-- CreateIndex
CREATE INDEX "ShipmentItem_shipmentId_idx" ON "ShipmentItem"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentItem_terminalId_idx" ON "ShipmentItem"("terminalId");

-- CreateIndex
CREATE INDEX "OnboardingRequestEvent_onboardingRequestId_createdAt_idx" ON "OnboardingRequestEvent"("onboardingRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderTemplate_franchiseId_idx" ON "OrderTemplate"("franchiseId");

-- CreateIndex
CREATE INDEX "OrderTemplateItem_templateId_idx" ON "OrderTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "CashPayout_franchiseId_idx" ON "CashPayout"("franchiseId");

-- CreateIndex
CREATE INDEX "CashPayout_type_idx" ON "CashPayout"("type");

-- CreateIndex
CREATE INDEX "CashPayout_createdAt_idx" ON "CashPayout"("createdAt");

-- CreateIndex
CREATE INDEX "ScratchTicket_franchiseId_idx" ON "ScratchTicket"("franchiseId");

-- CreateIndex
CREATE INDEX "ScratchTicket_barcode_idx" ON "ScratchTicket"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "ScratchTicket_franchiseId_barcode_key" ON "ScratchTicket"("franchiseId", "barcode");

-- CreateIndex
CREATE INDEX "Notification_franchiseId_idx" ON "Notification"("franchiseId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MasterUpcProduct_upc_key" ON "MasterUpcProduct"("upc");

-- CreateIndex
CREATE INDEX "MasterUpcProduct_upc_idx" ON "MasterUpcProduct"("upc");

-- CreateIndex
CREATE INDEX "MasterUpcProduct_brand_idx" ON "MasterUpcProduct"("brand");

-- CreateIndex
CREATE INDEX "MasterUpcProduct_category_idx" ON "MasterUpcProduct"("category");

-- CreateIndex
CREATE INDEX "PrinterConfig_franchiseId_idx" ON "PrinterConfig"("franchiseId");

-- CreateIndex
CREATE INDEX "PrinterConfig_type_idx" ON "PrinterConfig"("type");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "LocationProduct_locationId_idx" ON "LocationProduct"("locationId");

-- CreateIndex
CREATE INDEX "LocationProduct_productId_idx" ON "LocationProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationProduct_locationId_productId_key" ON "LocationProduct"("locationId", "productId");

-- CreateIndex
CREATE INDEX "IDScanLog_locationId_idx" ON "IDScanLog"("locationId");

-- CreateIndex
CREATE INDEX "IDScanLog_franchiseId_idx" ON "IDScanLog"("franchiseId");

-- CreateIndex
CREATE INDEX "IDScanLog_createdAt_idx" ON "IDScanLog"("createdAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_franchiseId_key" ON "IdempotencyKey"("key", "franchiseId");
