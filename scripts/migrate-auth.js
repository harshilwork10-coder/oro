/**
 * Batch Migration Script — Phase 3 Legacy Auth Sweep
 * 
 * Replaces:
 *   1. import { getServerSession } from 'next-auth'
 *   2. import { authOptions } from '@/lib/auth'
 *   3. import { ApiResponse } from '@/lib/api-response'
 *   4. const session = await getServerSession(authOptions) / if (!session?.user) ...
 *   5. const user = session.user as any  OR  await prisma.user.findUnique(...)
 *   6. ApiResponse.success({...})  →  NextResponse.json({...})
 *   7. ApiResponse.error(msg, code?)  →  NextResponse.json({ error: msg }, { status: code })
 *   8. ApiResponse.unauthorized()  →  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 *   9. ApiResponse.badRequest(msg?)  →  NextResponse.json({ error: msg }, { status: 400 })
 *   10. ApiResponse.notFound(msg?)  →  NextResponse.json({ error: msg }, { status: 404 })
 *   11. ApiResponse.forbidden(msg?)  →  NextResponse.json({ error: msg }, { status: 403 })
 *   12. import { auditLog } from '@/lib/audit'  →  import { logActivity } from '@/lib/auditLog'
 *   13. auditLog({...})  →  logActivity({...})
 * 
 * The script processes each file and does the replacements.
 * It only modifies files that import getServerSession from 'next-auth'.
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');

// Find all route.ts files
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

function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // Skip files that don't use getServerSession
    if (!content.includes("getServerSession")) return { path: filePath, status: 'SKIP', reason: 'no getServerSession' };

    // Skip webhooks (they use signature auth, not session auth)
    if (filePath.includes('webhooks')) return { path: filePath, status: 'SKIP', reason: 'webhook' };

    // Track what we changed
    const changes = [];

    // 1. Remove import { getServerSession } from 'next-auth'
    content = content.replace(/import\s*\{\s*getServerSession\s*\}\s*from\s*['"]next-auth['"]\s*\n?/g, () => { changes.push('rm getServerSession import'); return ''; });

    // 2. Remove import { authOptions } from '@/lib/auth'
    content = content.replace(/import\s*\{\s*authOptions\s*\}\s*from\s*['"]@\/lib\/auth['"]\s*\n?/g, () => { changes.push('rm authOptions import'); return ''; });

    // 3. Replace import { ApiResponse } from '@/lib/api-response'
    content = content.replace(/import\s*\{\s*ApiResponse\s*\}\s*from\s*['"]@\/lib\/api-response['"]\s*\n?/g, () => { changes.push('rm ApiResponse import'); return ''; });

    // 4. Replace import { auditLog } from '@/lib/audit' → import { logActivity } from '@/lib/auditLog'
    content = content.replace(/import\s*\{\s*auditLog\s*\}\s*from\s*['"]@\/lib\/audit['"]/g, () => { changes.push('auditLog→logActivity import'); return "import { logActivity } from '@/lib/auditLog'"; });

    // 5. Add getAuthUser import if not already present
    if (!content.includes("getAuthUser")) {
        // Find the last import line and add after it
        const importPattern = /^(import\s+.+\n)(?!import)/m;
        if (content.match(importPattern)) {
            content = content.replace(/^(import\s+[^\n]+\n)(?=\n|[^i]|$(?!import))/m, (match) => {
                changes.push('add getAuthUser import');
                return match + "import { getAuthUser } from '@/lib/auth/mobileAuth'\n";
            });
        }
    }

    // 6. Ensure NextResponse is imported
    if (!content.includes('NextResponse')) {
        content = content.replace(
            /import\s*\{([^}]*)\}\s*from\s*['"]next\/server['"]/,
            (match, imports) => {
                changes.push('add NextResponse');
                return `import {${imports.trim()}, NextResponse } from 'next/server'`;
            }
        );
    }
    // If file uses import { NextRequest } but doesn't have NextResponse yet
    if (!content.includes('NextResponse') && content.includes('NextRequest')) {
        content = content.replace(
            /import\s*\{\s*NextRequest\s*\}\s*from\s*['"]next\/server['"]/,
            () => {
                changes.push('add NextResponse to existing import');
                return "import { NextRequest, NextResponse } from 'next/server'";
            }
        );
    }

    // 7. Replace session pattern blocks:
    //    const session = await getServerSession(authOptions)
    //    if (!session?.user) return ApiResponse.unauthorized()
    //    const user = session.user as any
    // OR:
    //    const session = await getServerSession(authOptions)
    //    if (!session?.user) return NextResponse.json(...)
    //    ...prisma.user.findUnique({ where: { id: session.user.id } ...
    
    // Replace: const session = await getServerSession(authOptions)\n    if (!session?.user) return ... \n    const user = session.user as any
    content = content.replace(
        /const\s+session\s*=\s*await\s+getServerSession\s*\(\s*authOptions\s*\)\s*\n\s*if\s*\(\s*!session\s*\?\s*\.user\s*\)\s*return\s+[^\n]+\n(\s*\n)*\s*(const\s+user\s*=\s*session\.user\s+as\s+any\s*\n?)?/g,
        (match) => {
            changes.push('replace session→getAuthUser block');
            return '';
        }
    );

    // Replace remaining: const session = await getServerSession(authOptions)
    content = content.replace(
        /const\s+session\s*=\s*await\s+getServerSession\s*\(\s*authOptions\s*\)\s*\n?/g,
        () => { changes.push('replace standalone getServerSession'); return ''; }
    );

    // Replace remaining: if (!session?.user) return ...
    content = content.replace(
        /\s*if\s*\(\s*!session\s*\?\s*\.user\s*\)\s*return\s+[^\n]+\n/g,
        () => { changes.push('rm session check'); return '\n'; }
    );

    // Replace: const user = session.user as any
    content = content.replace(
        /\s*const\s+user\s*=\s*session\.user\s+as\s+any\s*\n?/g,
        () => { changes.push('rm session.user cast'); return '\n'; }
    );

    // Replace: const user = await prisma.user.findUnique({ where: { id: session.user.id }, ... })
    content = content.replace(
        /const\s+user\s*=\s*await\s+prisma\.user\.findUnique\s*\(\s*\{[\s\S]*?where:\s*\{\s*id:\s*session\.user\.id\s*\}[\s\S]*?\}\s*\)\s*\n?/g,
        () => { changes.push('rm prisma.user.findUnique(session)'); return ''; }
    );

    // Replace: if (!user?.franchiseId) return ...
    // This stays as-is since getAuthUser provides franchiseId

    // 8. Inject getAuthUser call at the start of each handler
    // Find: export async function GET( or POST( or PUT( or DELETE(
    // After the opening try { or after the function signature, add auth
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of methods) {
        const pattern = new RegExp(
            `(export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*\\{\\s*\\n\\s*)(try\\s*\\{\\s*\\n)`,
            'g'
        );
        if (content.match(pattern) && !content.includes(`const user = await getAuthUser(`)) {
            content = content.replace(pattern, (match, sig, tryBlock) => {
                changes.push(`inject getAuthUser in ${method}`);
                return `${sig}${tryBlock}        const user = await getAuthUser(req)\n        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n\n`;
            });
        }
    }

    // Also handle functions without try block
    for (const method of methods) {
        const pattern = new RegExp(
            `(export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*\\{\\s*\\n)(?!\\s*try\\s*\\{)(?!\\s*const\\s+user)`,
            'g'
        );
        if (content.match(pattern) && !content.includes(`const user = await getAuthUser(`)) {
            content = content.replace(pattern, (match, sig) => {
                changes.push(`inject getAuthUser in ${method} (no try)`);
                return `${sig}    const user = await getAuthUser(req)\n    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n\n`;
            });
        }
    }

    // 9. Fix function parameter — change 'request' to 'req'
    content = content.replace(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*request\s*:\s*NextRequest\s*\)/g, 
        (match, method) => { changes.push(`rename request→req in ${method}`); return `export async function ${method}(req: NextRequest)`; }
    );

    // Also fix: (request: NextRequest) in function body reference
    content = content.replace(/new URL\(request\.url\)/g, () => { changes.push('request.url→req.url'); return 'new URL(req.url)'; });
    content = content.replace(/await request\.json\(\)/g, () => { changes.push('request.json→req.json'); return 'await req.json()'; });
    content = content.replace(/request\.headers/g, () => { changes.push('request.headers→req.headers'); return 'req.headers'; });

    // 10. Replace ApiResponse calls
    content = content.replace(/ApiResponse\.success\(\s*\{/g, () => { changes.push('ApiResponse.success→NextResponse.json'); return 'NextResponse.json({'; });
    content = content.replace(/ApiResponse\.success\(\s*\[/g, () => { changes.push('ApiResponse.success(arr)→NextResponse.json'); return 'NextResponse.json(['; });
    
    // ApiResponse.error('msg', code) → NextResponse.json({ error: 'msg' }, { status: code })
    content = content.replace(/ApiResponse\.error\(\s*['"]([^'"]+)['"]\s*,\s*(\d+)\s*\)/g, 
        (_, msg, code) => { changes.push('ApiResponse.error→NextResponse.json'); return `NextResponse.json({ error: '${msg}' }, { status: ${code} })`; });
    content = content.replace(/ApiResponse\.error\(\s*['"]([^'"]+)['"]\s*\)/g, 
        (_, msg) => { changes.push('ApiResponse.error→NextResponse.json'); return `NextResponse.json({ error: '${msg}' }, { status: 500 })`; });

    content = content.replace(/ApiResponse\.unauthorized\(\)/g, () => { changes.push('ApiResponse.unauthorized→NextResponse.json'); return "NextResponse.json({ error: 'Unauthorized' }, { status: 401 })"; });
    content = content.replace(/ApiResponse\.badRequest\(\s*['"]([^'"]+)['"]\s*\)/g, 
        (_, msg) => { changes.push('ApiResponse.badRequest→NextResponse.json'); return `NextResponse.json({ error: '${msg}' }, { status: 400 })`; });
    content = content.replace(/ApiResponse\.notFound\(\s*['"]([^'"]+)['"]\s*\)/g, 
        (_, msg) => { changes.push('ApiResponse.notFound→NextResponse.json'); return `NextResponse.json({ error: '${msg}' }, { status: 404 })`; });
    content = content.replace(/ApiResponse\.forbidden\(\s*['"]([^'"]+)['"]\s*\)/g, 
        (_, msg) => { changes.push('ApiResponse.forbidden→NextResponse.json'); return `NextResponse.json({ error: '${msg}' }, { status: 403 })`; });

    // 11. Replace auditLog → logActivity
    content = content.replace(/await\s+auditLog\s*\(/g, () => { changes.push('auditLog→logActivity call'); return 'await logActivity('; });

    // 12. Replace remaining session.user references
    content = content.replace(/session\.user\.id/g, () => { changes.push('session.user.id→user.id'); return 'user.id'; });
    content = content.replace(/session\.user\.email/g, () => { changes.push('session.user.email→user.email'); return 'user.email'; });
    content = content.replace(/\(session\.user\s+as\s+any\)\.(\w+)/g, (_, prop) => { changes.push(`(session.user as any).${prop}→user.${prop}`); return `user.${prop}`; });

    // 13. Replace user.franchiseId from manual lookup
    // The getAuthUser already provides franchiseId, role, locationId

    // 14. Clean up extra blank lines
    content = content.replace(/\n{4,}/g, '\n\n');

    // 15. Handle the case where function takes no args like GET()
    content = content.replace(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*\)\s*\{/g,
        (match, method) => {
            if (content.includes('const user = await getAuthUser(req)')) {
                changes.push(`add req param to ${method}()`);
                return `export async function ${method}(req: NextRequest) {`;
            }
            return match;
        }
    );

    if (content === original) return { path: filePath, status: 'NOCHANGE', changes };

    fs.writeFileSync(filePath, content, 'utf8');
    return { path: filePath, status: 'MIGRATED', changes };
}

// Main
const files = findRouteFiles(API_DIR);
let migrated = 0, skipped = 0, nochange = 0;

console.log(`Found ${files.length} route.ts files\n`);

for (const file of files) {
    const result = migrateFile(file);
    const rel = path.relative(API_DIR, result.path);
    if (result.status === 'MIGRATED') {
        migrated++;
        console.log(`✅ ${rel} (${result.changes.length} changes: ${result.changes.slice(0, 5).join(', ')}${result.changes.length > 5 ? '...' : ''})`);
    } else if (result.status === 'SKIP') {
        skipped++;
    } else {
        nochange++;
    }
}

console.log(`\n=== RESULTS ===`);
console.log(`Migrated: ${migrated}`);
console.log(`Skipped: ${skipped}`);
console.log(`No change: ${nochange}`);
console.log(`Total files: ${files.length}`);
