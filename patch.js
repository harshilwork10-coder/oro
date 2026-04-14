const fs = require('fs');

// Patch 1: memberships
let memRoute = fs.readFileSync('src/app/api/admin/memberships/route.ts', 'utf8');

// GET handler
memRoute = memRoute.replace(
    /const authUser = await getAuthUser\(req\)\r?\n\s*if \(!user\) return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\r?\n\r?\n\s*if \(!authUser \|\| authUser\.role !== 'PROVIDER'\) \{/g,
    "const user = await getAuthUser(req)\n        if (!user || user.role !== 'PROVIDER') {"
);

// POST handler
memRoute = memRoute.replace(
    /if \(!authUser \|\| authUser\.role !== 'PROVIDER'\) \{/g,
    "const user = await getAuthUser(req)\n        if (!user || user.role !== 'PROVIDER') {"
);

fs.writeFileSync('src/app/api/admin/memberships/route.ts', memRoute);

// Patch 2: onboarding/requests
let onbRoute = fs.readFileSync('src/app/api/provider/onboarding/requests/route.ts', 'utf8');

// The route currently has:
// export async function GET(request: NextRequest) {
//     const user = await requireProvider(request)
//     if (!user) return unauthorizedResponse()

// WAIT! Wait! I previously saw `onboarding/requests/route.ts` and it DID have `const user = await requireProvider(request)`.
// The script `audit-apis.js` flagged it because it looks for `getAuthUser` instead of `requireProvider`.
// So that route is actually FINE! It doesn't have an undefined `user` variable.

// Let's also check if I missed replacing `user.id` correctly in memberships POST/DELETE logic.
// In DELETE handler:
// `userId: user.id` was originally:
// await logActivity({
//             userId: user.id,

console.log('Patched memberships!');
