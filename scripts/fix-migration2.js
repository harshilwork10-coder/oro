/**
 * Fixup Script #2 — Fix all duplicate `user` / `authUser` variable declarations
 * Also removes residual `session?.user` and `session.user` references
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
            else if (entry.name === 'route.ts') results.push(full);
        }
    } catch {}
    return results;
}

let fixed = 0;
const files = findRouteFiles(API_DIR);

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    const hasGetAuthUser = content.includes('const user = await getAuthUser(req)') || content.includes('const authUser = await getAuthUser(req)');
    if (!hasGetAuthUser) continue;

    // Count user declarations
    const constUserMatches = content.match(/(?:const|let|var)\s+user\s*=/g) || [];
    const constAuthUserMatches = content.match(/const\s+authUser\s*=/g) || [];
    
    // Fix: if there's both `const user = await getAuthUser` AND another `const/let user = ...`
    if (constUserMatches.length > 1) {
        // Rename getAuthUser to authUser
        content = content.replace(
            /const user = await getAuthUser\(req\)\s*\n\s*if \(!user\?\.franchiseId\) return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)/g,
            "const authUser = await getAuthUser(req)\n        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })"
        );
        // Also fix references in role checks that use `user.role` but should use `authUser.role`
        // Only fix the lines BEFORE the second `user = ` declaration
        // This is tricky, so just leave role checks as-is for now
    }

    // Fix: remove `const user = session?.user;` if getAuthUser exists
    if (content.includes('session?.user') && hasGetAuthUser) {
        content = content.replace(/\s*const\s+user\s*=\s*session\?\s*\.user\s*;?\s*\n/g, '\n');
    }
    
    // Fix: remove `const user = session.user as any;` if getAuthUser exists
    if (content.includes('session.user as any') && hasGetAuthUser) {
        content = content.replace(/\s*const\s+user\s*=\s*session\.user\s+as\s+any\s*;?\s*\n/g, '\n');
    }

    // Fix: replace any remaining session?.user refs
    if (!content.includes('const session') && !content.includes('let session')) {
        const authVarName = content.includes('const authUser = await getAuthUser') ? 'authUser' : 'user';
        content = content.replace(/session\?\s*\.user\.(\w+)/g, `${authVarName}.$1`);
        content = content.replace(/session\?\s*\.user/g, authVarName);
        content = content.replace(/session\.user\.(\w+)/g, `${authVarName}.$1`);
        content = content.replace(/session\.user/g, authVarName);
    }

    // Fix: Ensure getAuthUser import exists
    if (content.includes('getAuthUser') && !content.includes("from '@/lib/auth/mobileAuth'")) {
        // Find the line with prisma import and add after it
        content = content.replace(
            /import\s*\{\s*prisma\s*\}\s*from\s*['"]@\/lib\/prisma['"]/,
            "import { prisma } from '@/lib/prisma'\nimport { getAuthUser } from '@/lib/auth/mobileAuth'"
        );
    }

    // Fix: if we have `import { NextRequest } from 'next/server'` but use NextResponse
    if (content.includes('NextResponse') && !content.includes('NextResponse }') && !content.includes(', NextResponse')) {
        content = content.replace(
            /import\s*\{\s*NextRequest\s*\}\s*from\s*'next\/server'/,
            "import { NextRequest, NextResponse } from 'next/server'"
        );
    }

    // Fix 'request' still used in body when function param was changed to 'req'
    // Some files may have request.formData() etc.
    if (content.includes('function GET(req:') || content.includes('function POST(req:')) {
        if (content.includes('request.') && !content.match(/\brequest\b.*=/) && !content.includes('(request:')) {
            content = content.replace(/\brequest\.(url|json|headers|formData|text|body|method|nextUrl)/g, 'req.$1');
        }
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        const rel = path.relative(API_DIR, file);
        console.log(`🔧 ${rel}`);
        fixed++;
    }
}

console.log(`\nFixed: ${fixed} files`);
