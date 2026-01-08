-- CreateTable
CREATE TABLE "TagAlongItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TagAlongItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TagAlongItem_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TagAlongItem_parentId_idx" ON "TagAlongItem"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "TagAlongItem_parentId_childId_key" ON "TagAlongItem"("parentId", "childId");
