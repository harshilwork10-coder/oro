-- Migration: Convert existing ownerId relationships to FranchisorMembership
-- This script creates membership records for all existing franchisor owners

INSERT INTO "FranchisorMembership" (id, "userId", "franchisorId", role, "isPrimary", "createdAt")
SELECT 
  gen_random_uuid()::text,
  "ownerId",
  id,
  'OWNER',
  true,
  NOW()
FROM "Franchisor"
WHERE "ownerId" IS NOT NULL
ON CONFLICT ("userId", "franchisorId") DO NOTHING;
