-- CreateTable
CREATE TABLE "EndOfDayReport" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tzDate" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closingManagerId" TEXT NOT NULL,
    "closedByRole" TEXT NOT NULL,
    "grossSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cardSales" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "splitCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "splitCard" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tips" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashRefunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refunds" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "voids" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discounts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "noSaleCount" INTEGER NOT NULL DEFAULT 0,
    "paidInTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidOutTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cashDropsTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "openingCashTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "varianceNote" TEXT,
    "isVarianceApproved" BOOLEAN NOT NULL DEFAULT false,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "printedAt" TIMESTAMP(3),
    "reportPayload" JSONB,
    "shiftBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EndOfDayReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EndOfDayReport_locationId_closedAt_idx" ON "EndOfDayReport"("locationId", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EndOfDayReport_locationId_tzDate_key" ON "EndOfDayReport"("locationId", "tzDate");

-- AddForeignKey
ALTER TABLE "EndOfDayReport" ADD CONSTRAINT "EndOfDayReport_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndOfDayReport" ADD CONSTRAINT "EndOfDayReport_closingManagerId_fkey" FOREIGN KEY ("closingManagerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
