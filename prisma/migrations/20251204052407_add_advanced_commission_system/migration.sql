-- CreateTable
CREATE TABLE "CommissionTier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "minRevenue" DECIMAL NOT NULL,
    "maxRevenue" DECIMAL,
    "percentage" DECIMAL NOT NULL,
    "tierName" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommissionTier_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceCommissionOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT,
    "percentage" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ServiceCommissionOverride_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeePaymentConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'COMMISSION',
    "defaultCommissionRate" DECIMAL NOT NULL DEFAULT 0.40,
    "usesTieredCommission" BOOLEAN NOT NULL DEFAULT false,
    "baseSalary" DECIMAL,
    "salaryPeriod" TEXT,
    "useMaxSalaryOrCommission" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DECIMAL,
    "useMaxHourlyOrCommission" BOOLEAN NOT NULL DEFAULT false,
    "rentalFee" DECIMAL,
    "rentalPeriod" TEXT,
    "rentalKeeps100Percent" BOOLEAN NOT NULL DEFAULT false,
    "productCommissionRate" DECIMAL NOT NULL DEFAULT 0.10,
    "useProductCostDeduction" BOOLEAN NOT NULL DEFAULT false,
    "commissionOnDiscountedPrice" BOOLEAN NOT NULL DEFAULT true,
    "newClientBonusAmount" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmployeePaymentConfig_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "payDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PayrollEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollRunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "serviceRevenue" DECIMAL NOT NULL DEFAULT 0,
    "productRevenue" DECIMAL NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL NOT NULL DEFAULT 0,
    "serviceCommission" DECIMAL NOT NULL DEFAULT 0,
    "productCommission" DECIMAL NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL NOT NULL DEFAULT 0,
    "baseSalary" DECIMAL NOT NULL DEFAULT 0,
    "hourlyWages" DECIMAL NOT NULL DEFAULT 0,
    "tips" DECIMAL NOT NULL DEFAULT 0,
    "bonuses" DECIMAL NOT NULL DEFAULT 0,
    "rentalFee" DECIMAL NOT NULL DEFAULT 0,
    "grossPay" DECIMAL NOT NULL DEFAULT 0,
    "hoursWorked" DECIMAL NOT NULL DEFAULT 0,
    "servicesPerformed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollEntry_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PayrollEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BusinessConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchisorId" TEXT NOT NULL,
    "usesCommissions" BOOLEAN NOT NULL DEFAULT true,
    "usesInventory" BOOLEAN NOT NULL DEFAULT true,
    "usesAppointments" BOOLEAN NOT NULL DEFAULT true,
    "usesScheduling" BOOLEAN NOT NULL DEFAULT true,
    "usesLoyalty" BOOLEAN NOT NULL DEFAULT true,
    "usesGiftCards" BOOLEAN NOT NULL DEFAULT true,
    "usesMemberships" BOOLEAN NOT NULL DEFAULT true,
    "usesReferrals" BOOLEAN NOT NULL DEFAULT true,
    "usesRoyalties" BOOLEAN NOT NULL DEFAULT false,
    "usesTipping" BOOLEAN NOT NULL DEFAULT true,
    "usesDiscounts" BOOLEAN NOT NULL DEFAULT true,
    "usesRetailProducts" BOOLEAN NOT NULL DEFAULT true,
    "usesServices" BOOLEAN NOT NULL DEFAULT true,
    "usesEmailMarketing" BOOLEAN NOT NULL DEFAULT true,
    "usesSMSMarketing" BOOLEAN NOT NULL DEFAULT true,
    "usesReviewManagement" BOOLEAN NOT NULL DEFAULT true,
    "usesMultiLocation" BOOLEAN NOT NULL DEFAULT false,
    "usesFranchising" BOOLEAN NOT NULL DEFAULT false,
    "usesTimeTracking" BOOLEAN NOT NULL DEFAULT true,
    "usesPayroll" BOOLEAN NOT NULL DEFAULT false,
    "reviewRequestTiming" TEXT NOT NULL DEFAULT 'MANUAL',
    "reviewRequestMethod" TEXT NOT NULL DEFAULT 'SMS',
    "reviewIncentive" DECIMAL NOT NULL DEFAULT 0,
    "tipPromptEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tipPromptTiming" TEXT NOT NULL DEFAULT 'AT_CHECKOUT',
    "tipSuggestions" TEXT NOT NULL DEFAULT '[15,20,25]',
    "tipPoolingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "commissionCalculation" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "commissionVisibility" TEXT NOT NULL DEFAULT 'ALWAYS',
    "loyaltyPointsAwarding" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "loyaltyPointsRatio" DECIMAL NOT NULL DEFAULT 1,
    "loyaltyBirthdayBonus" DECIMAL NOT NULL DEFAULT 0,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderTiming" TEXT NOT NULL DEFAULT '24_HOURS',
    "reminderMethod" TEXT NOT NULL DEFAULT 'SMS',
    "cancellationFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cancellationFeeAmount" DECIMAL NOT NULL DEFAULT 0,
    "cancellationWindow" INTEGER NOT NULL DEFAULT 24,
    "membershipAutoBilling" BOOLEAN NOT NULL DEFAULT true,
    "membershipFailedPaymentRetry" INTEGER NOT NULL DEFAULT 3,
    "giftCardAutoEmail" BOOLEAN NOT NULL DEFAULT true,
    "giftCardPhysical" BOOLEAN NOT NULL DEFAULT true,
    "discountRequiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "discountMaxPercent" DECIMAL NOT NULL DEFAULT 50,
    "lowStockAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "allowMultiProvider" BOOLEAN NOT NULL DEFAULT false,
    "newClientBonusEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newClientBonusAmount" DECIMAL NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessConfig_franchisorId_fkey" FOREIGN KEY ("franchisorId") REFERENCES "Franchisor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BusinessConfig" ("createdAt", "franchisorId", "id", "updatedAt", "usesAppointments", "usesCommissions", "usesDiscounts", "usesEmailMarketing", "usesFranchising", "usesGiftCards", "usesInventory", "usesLoyalty", "usesMemberships", "usesMultiLocation", "usesPayroll", "usesReferrals", "usesRetailProducts", "usesReviewManagement", "usesRoyalties", "usesSMSMarketing", "usesScheduling", "usesServices", "usesTimeTracking", "usesTipping") SELECT "createdAt", "franchisorId", "id", "updatedAt", "usesAppointments", "usesCommissions", "usesDiscounts", "usesEmailMarketing", "usesFranchising", "usesGiftCards", "usesInventory", "usesLoyalty", "usesMemberships", "usesMultiLocation", "usesPayroll", "usesReferrals", "usesRetailProducts", "usesReviewManagement", "usesRoyalties", "usesSMSMarketing", "usesScheduling", "usesServices", "usesTimeTracking", "usesTipping" FROM "BusinessConfig";
DROP TABLE "BusinessConfig";
ALTER TABLE "new_BusinessConfig" RENAME TO "BusinessConfig";
CREATE UNIQUE INDEX "BusinessConfig_franchisorId_key" ON "BusinessConfig"("franchisorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCommissionOverride_employeeId_serviceId_key" ON "ServiceCommissionOverride"("employeeId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePaymentConfig_employeeId_key" ON "EmployeePaymentConfig"("employeeId");
