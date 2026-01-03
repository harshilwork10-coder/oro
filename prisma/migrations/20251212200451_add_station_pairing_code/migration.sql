/*
  Warnings:

  - A unique constraint covering the columns `[pairingCode]` on the table `Station` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Station" ADD COLUMN "pairingCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Station_pairingCode_key" ON "Station"("pairingCode");
