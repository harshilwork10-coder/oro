-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "authCode" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "cardLast4" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "cardType" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "gatewayTxId" TEXT;
