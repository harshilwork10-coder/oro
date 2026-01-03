-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "franchiseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
    "minimumAge" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductCategory_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "ageRestricted" BOOLEAN NOT NULL DEFAULT false,
    "minimumAge" INTEGER,
    "vendor" TEXT,
    "globalProductId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "GlobalProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("ageRestricted", "barcode", "category", "cost", "createdAt", "description", "franchiseId", "globalProductId", "id", "isActive", "minimumAge", "name", "price", "reorderPoint", "sku", "stock", "updatedAt", "vendor") SELECT "ageRestricted", "barcode", "category", "cost", "createdAt", "description", "franchiseId", "globalProductId", "id", "isActive", "minimumAge", "name", "price", "reorderPoint", "sku", "stock", "updatedAt", "vendor" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
