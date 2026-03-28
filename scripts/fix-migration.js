/**
 * Fixup Script — Phase 3 Migration Cleanup
 * 
 * Fixes issues caused by the initial migration script:
 * 1. Duplicate `const user` declarations (where getAuthUser was injected 
 *    but the original `const user = session?.user` wasn't removed)
 * 2. Residual `session` references that should be `user`
 * 3. Files that still reference `session` without having it defined
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

function findRouteFiles(dir) {
    let results = [];
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) results.push(...findRouteFiles(full));
            else if (entry.name === 'route.ts' && !full.includes('node_modules')) results.push(full);
        }
    } catch {}
    return results;
}

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    const changes = [];

    // Fix 1: Remove duplicate `const user = session?.user` lines (the script injected getAuthUser BUT old code still has session?.user)
    if (content.includes('const user = await getAuthUser(req)') && content.includes('const user = session?.user')) {
        content = content.replace(/\s*const\s+user\s*=\s*session\?\s*\.user;?\s*\n/g, () => { changes.push('rm duplicate session?.user'); return '\n'; });
    }

    // Fix 2: Remove `const user = session.user as any` that wasn't caught before
    if (content.includes('const user = await getAuthUser(req)') && content.includes('const user = session.user as any')) {
        content = content.replace(/\s*const\s+user\s*=\s*session\.user\s+as\s+any;?\s*\n/g, () => { changes.push('rm duplicate session.user as any'); return '\n'; });
    }

    // Fix 3: Files where getAuthUser was injected BUT there's a `const user = await prisma.user.create(...)` or `let user`
    // In these cases, rename the getAuthUser result to `authUser`
    const hasGetAuthUser = content.includes('const user = await getAuthUser(req)');
    if (hasGetAuthUser) {
        // Count how many `const user` declarations there are
        const userDeclarations = (content.match(/(?:const|let|var)\s+user\s*=/g) || []).length;
        if (userDeclarations > 1) {
            // Check if the other declaration is a prisma.user.create / prisma.user.findUnique / let user
            // Rename the getAuthUser declaration to authUser
            content = content.replace(
                /const\s+user\s*=\s*await\s+getAuthUser\s*\(\s*req\s*\)\s*\n\s*if\s*\(\s*!user\?\s*\.franchiseId\s*\)\s*return\s*NextResponse\.json\(\s*\{\s*error:\s*'Unauthorized'\s*\}\s*,\s*\{\s*status:\s*401\s*\}\s*\)/,
                () => {
                    changes.push('rename user→authUser (conflict)');
                    return "const authUser = await getAuthUser(req)\n        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })";
                }
            );
        }
    }

    // Fix 4: Remove residual `if (!user || user.role !== 'PROVIDER')` → these already checked via getAuthUser
    // Don't touch these — they serve a different purpose (role checking, not auth)

    // Fix 5: Remove leftover `const user = session?.user as any;` with semicolons
    if (hasGetAuthUser) {
        content = content.replace(/\s*const\s+user\s*=\s*session\?\s*\.user\s*(as\s+any)?\s*;?\s*\n/g, (match) => {
            if (!changes.includes('rm duplicate session?.user') && !changes.includes('rm duplicate session?.user as any')) {
                changes.push('rm leftover session?.user');
            }
            return '\n';
        });
    }

    // Fix 6: Replace remaining `session?.user` references in the body → `user`
    if (hasGetAuthUser || content.includes('const authUser = await getAuthUser(req)')) {
        // Only replace if `session` is no longer declared
        if (!content.includes('const session =') && !content.includes('let session =')) {
            const authVar = content.includes('const authUser = await getAuthUser(req)') ? 'authUser' : 'user';
            content = content.replace(/session\?\s*\.user\s*\.(\w+)/g, (_, prop) => { changes.push(`session?.user.${prop}→${authVar}.${prop}`); return `${authVar}.${prop}`; });
            content = content.replace(/session\?\s*\.user/g, () => { changes.push(`session?.user→${authVar}`); return authVar; });
            content = content.replace(/session\.user\.(\w+)/g, (_, prop) => { changes.push(`session.user.${prop}→${authVar}.${prop}`); return `${authVar}.${prop}`; });
            content = content.replace(/session\.user/g, () => { changes.push(`session.user→${authVar}`); return authVar; });
        }
    }

    // Fix 7: Clean up `if (!user || user.role !== 'PROVIDER') {` where user was referencing session.user 
    // and now references getAuthUser — this is fine, keep it

    // Fix 8: Remove empty try blocks or duplicate newlines
    content = content.replace(/\n{4,}/g, '\n\n');

    if (content === original) return null;

    fs.writeFileSync(filePath, content, 'utf8');
    return { path: path.relative(API_DIR, filePath), changes };
}

// Main
const files = findRouteFiles(API_DIR);
let fixed = 0;

for (const file of files) {
    const result = fixFile(file);
    if (result) {
        fixed++;
        console.log(`🔧 ${result.path} (${result.changes.slice(0, 4).join(', ')}${result.changes.length > 4 ? '...' : ''})`);
    }
}

console.log(`\nFixed: ${fixed} files`);
