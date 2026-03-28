/**
 * AUTH-701 Fix Script
 * 
 * Fix #1: Where authUser is declared but user.* is referenced downstream,
 *         rename const authUser → const user (smaller change, preserves all role checks)
 * 
 * Fix #2: Where admin routes have franchiseId guard BEFORE PROVIDER check,
 *         replace the franchiseId guard with a combined auth+role check
 * 
 * Fix #3: Fix admin/team which still references session?.user
 * 
 * Fix #4: Fix provider routes with mixed variable names (authUser && user.role)
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
let fixed = 0;
let fixDetails = [];

function findRouteFiles(dir) {
    let results = [];
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) results.push(...findRouteFiles(full));
            else if (entry.name === 'route.ts') results.push(full);
        }
    } catch {}
    return results;
}

for (const file of findRouteFiles(API_DIR)) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    const rel = path.relative(API_DIR, file);
    const fixes = [];

    // FIX #1: authUser declared but user.* referenced downstream
    // Rename authUser → user ONLY if there's no separate 'const user' or 'let user' 
    // (other than the prisma query result named differently)
    const hasAuthUser = /const authUser\s*=\s*await getAuthUser/.test(content);
    const hasUserDotRole = /\buser\.role\b/.test(content);
    
    if (hasAuthUser && hasUserDotRole) {
        // Check if there's a separate user variable from prisma
        const hasSeparateUser = /(?:const|let)\s+user\s*=\s*(?:await\s+prisma|existing|null|undefined|{)/.test(content);
        
        if (!hasSeparateUser) {
            // Safe to rename authUser → user
            content = content.replace(/const authUser\s*=\s*await getAuthUser\(req\)/g, 'const user = await getAuthUser(req)');
            content = content.replace(/const authUser\s*=\s*await getAuthUser\(request\)/g, 'const user = await getAuthUser(request)');
            content = content.replace(/if \(!authUser\?\./g, 'if (!user?.');
            content = content.replace(/if \(!authUser\)/g, 'if (!user)');
            content = content.replace(/authUser\./g, 'user.');
            content = content.replace(/authUser\?/g, 'user?');
            if (content !== original) fixes.push('authUser→user');
        }
    }

    // FIX #2: Admin routes with franchiseId guard BEFORE provider check
    // Pattern: const authUser = await getAuthUser(req)\n  if (!authUser?.franchiseId) return 401\n  if (authUser.role !== 'PROVIDER') return 403
    // Fix: Replace franchiseId guard with simple null check for admin routes
    if (rel.startsWith('admin\\') || rel.startsWith('admin/')) {
        // Replace: if (!user?.franchiseId) return 401 → if (!user) return 401
        // This is safe because admin routes should check PROVIDER role, not franchiseId
        const adminPattern = /if \(!(?:user|authUser)\?\.franchiseId\) return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/g;
        if (adminPattern.test(content)) {
            content = content.replace(
                /if \(!(?:user|authUser)\?\.franchiseId\) return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/g,
                "if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })"
            );
            fixes.push('admin:franchiseId→null check');
        }
    }

    // FIX #3: session?.user references that still exist
    if (/session\?\s*\.user/.test(content) && /getAuthUser/.test(content)) {
        content = content.replace(/if \(!session\?\s*\.user\s*\|\|\s*session\.user\.role\s*!==\s*'PROVIDER'\)\s*\{/g,
            "if (!user || user.role !== 'PROVIDER') {");
        if (content !== original) fixes.push('session?.user→user');
    }

    // FIX #4: provider routes with !authUser?.id || user.role check  
    if (/!authUser\?\s*\.id\s*\|\|\s*user\.role/.test(content)) {
        content = content.replace(/!authUser\?\s*\.id\s*\|\|\s*user\.role/g, '!user?.id || user.role');
        if (content !== original) fixes.push('mixed authUser/user ref');
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`🔧 ${rel} (${fixes.join(', ')})`);
        fixDetails.push({ file: rel, fixes });
        fixed++;
    }
}

console.log(`\nFixed: ${fixed} files`);
