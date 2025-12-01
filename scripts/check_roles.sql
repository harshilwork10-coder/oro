-- Quick SQL to check and update your current user role to PROVIDER
-- Run this in SQLite browser or via prisma studio

-- Check current users and theirroles
SELECT id, email, role FROM User;

-- If you need to update your test user to be a PROVIDER, run:
-- UPDATE User SET role = 'PROVIDER' WHERE email = 'your@email.com';

-- Or login with the existing provider account:
-- Email: provider@aura.com
-- Password: password123
