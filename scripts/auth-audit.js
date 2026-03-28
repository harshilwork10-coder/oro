/**
 * AUTH-701: Auth/Permission Regression Audit Script
 * 
 * Checks:
 * 1. getAuthUser() called without req
 * 2. Variable drift: authUser declared but user.role referenced (or vice versa)
 * 3. Admin/provider routes missing PROVIDER role check
 * 4. Webhook/public routes accidentally using getAuthUser
 * 5. Handler signatures vs auth usage
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
const issues = [];

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

const files = findRouteFiles(API_DIR);

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(API_DIR, file);

    // Check 1: getAuthUser() without req
    if (/getAuthUser\(\)/.test(content)) {
        issues.push({ file: rel, severity: 'CRITICAL', issue: 'getAuthUser() called without req parameter' });
    }

    // Check 2a: authUser declared but user.role or user.id referenced (not in prisma query)
    if (/const authUser\s*=\s*await getAuthUser/.test(content)) {
        // Look for user.role, user.id, user.email references NOT inside prisma queries or other objects
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip prisma queries, const user = await prisma..., other declarations
            if (/const user\s*=\s*await prisma/.test(line)) continue;
            if (/let user\s*[;=]/.test(line)) continue;
            if (/var user\s*[;=]/.test(line)) continue;
            if (/\/\//.test(line.split('user.role')[0]?.slice(-5))) continue; // skip comments
            
            // Check for user.role when authUser is the auth variable
            if (/\buser\.role\b/.test(line) && !/const user\b/.test(line) && !/let user\b/.test(line)) {
                // Check if 'user' was separately declared (e.g., prisma query result)
                const priorContent = lines.slice(0, i).join('\n');
                const hasSeparateUser = /(?:const|let)\s+user\s*=\s*(?:await\s+prisma|existing|await\s+\(prisma)/.test(priorContent);
                if (!hasSeparateUser) {
                    issues.push({ file: rel, severity: 'HIGH', issue: `Line ${i+1}: user.role referenced but auth var is authUser`, line: line.trim() });
                }
            }
        }
    }

    // Check 2b: user declared but authUser.role referenced
    if (/const user\s*=\s*await getAuthUser/.test(content)) {
        if (/authUser\.role/.test(content) && !/const authUser/.test(content)) {
            issues.push({ file: rel, severity: 'HIGH', issue: 'authUser.role referenced but auth var is user' });
        }
    }

    // Check 3: Admin routes missing PROVIDER check
    if (rel.startsWith('admin\\') || rel.startsWith('admin/')) {
        const hasGetAuthUser = /getAuthUser/.test(content);
        const hasProviderCheck = /PROVIDER/.test(content);
        if (hasGetAuthUser && !hasProviderCheck) {
            issues.push({ file: rel, severity: 'MEDIUM', issue: 'Admin route uses getAuthUser but has NO PROVIDER role check' });
        }
    }

    // Check 4: Webhook/public routes using getAuthUser
    if (rel.includes('webhook') || rel.includes('public')) {
        if (/getAuthUser/.test(content)) {
            issues.push({ file: rel, severity: 'MEDIUM', issue: 'Webhook/public route uses getAuthUser — verify this is intentional' });
        }
    }

    // Check 5: Handler has no auth at all (no getAuthUser, no signature check, no session)
    const exportFunctions = content.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g) || [];
    if (exportFunctions.length > 0 && !/(getAuthUser|getServerSession|signature|hmac|stripe\.webhooks|verify)/i.test(content)) {
        // Check if it's a truly public route (like health check)
        if (!rel.includes('health') && !rel.includes('public') && !rel.includes('webhook') && !rel.includes('auth/')) {
            issues.push({ file: rel, severity: 'LOW', issue: 'Route has no auth mechanism at all' });
        }
    }

    // Check 6: PROVIDER-only franchiseId guard (provider shouldn't need franchiseId)
    if (rel.startsWith('admin\\') || rel.startsWith('admin/')) {
        if (/!user\?\.franchiseId|!authUser\?\.franchiseId/.test(content) && /PROVIDER/.test(content)) {
            // Has both franchiseId check AND provider check — the franchiseId would reject providers
            const franchiseIdCheckLine = content.split('\n').findIndex(l => /!(?:user|authUser)\?\.franchiseId/.test(l));
            const providerCheckLine = content.split('\n').findIndex(l => /PROVIDER/.test(l));
            if (franchiseIdCheckLine < providerCheckLine) {
                issues.push({ file: rel, severity: 'HIGH', issue: `franchiseId guard (L${franchiseIdCheckLine+1}) BEFORE provider check (L${providerCheckLine+1}) — would reject PROVIDER users who have no franchise` });
            }
        }
    }
}

// Print report
console.log('=== AUTH-701: Auth Regression Audit ===\n');

const critical = issues.filter(i => i.severity === 'CRITICAL');
const high = issues.filter(i => i.severity === 'HIGH');
const medium = issues.filter(i => i.severity === 'MEDIUM');
const low = issues.filter(i => i.severity === 'LOW');

console.log(`CRITICAL: ${critical.length} | HIGH: ${high.length} | MEDIUM: ${medium.length} | LOW: ${low.length}\n`);

for (const issue of [...critical, ...high, ...medium]) {
    console.log(`[${issue.severity}] ${issue.file}`);
    console.log(`  ${issue.issue}`);
    if (issue.line) console.log(`  Code: ${issue.line}`);
    console.log();
}

if (low.length > 0) {
    console.log(`\n--- LOW severity (${low.length} routes with no auth) ---`);
    for (const issue of low) {
        console.log(`  ${issue.file}`);
    }
}

console.log(`\nTotal files scanned: ${files.length}`);
console.log(`Total issues: ${issues.length}`);
