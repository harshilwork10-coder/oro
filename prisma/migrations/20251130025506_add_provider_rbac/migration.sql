-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "providerPermissions" TEXT;
ALTER TABLE "User" ADD COLUMN "providerRole" TEXT;
