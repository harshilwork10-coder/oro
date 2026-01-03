-- Add MagicLink table if it doesn't exist
CREATE TABLE IF NOT EXISTS "MagicLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MagicLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "MagicLink_token_key" ON "MagicLink"("token");
