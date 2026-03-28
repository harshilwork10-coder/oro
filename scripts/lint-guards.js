/**
 * CI Guardrails: Lint Guard Script
 * 
 * Checks for banned patterns in API routes:
 * - @ts-nocheck in src/app/api/
 * - getServerSession in src/app/api/
 * - ApiResponse in src/app/api/
 * - (prisma as any) threshold check
 * 
 * Usage: node scripts/lint-guards.js
 * Exit code 1 if any banned pattern found.
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
let errors = 0;
let warnings = 0;

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

// Banned patterns (FAIL)
const bannedPatterns = [
    { pattern: /@ts-nocheck/, name: '@ts-nocheck', severity: 'ERROR' },
    { pattern: /getServerSession/, name: 'getServerSession', severity: 'ERROR' },
    { pattern: /\bApiResponse\b/, name: 'ApiResponse', severity: 'ERROR' },
];

// Threshold patterns (WARN/FAIL above threshold)
const PRISMA_ANY_THRESHOLD = 5; // Allow up to 5 remaining (prisma as any)
let prismaAnyCount = 0;

console.log('=== CI Lint Guards ===\n');

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const rel = path.relative(API_DIR, file);

    for (const { pattern, name, severity } of bannedPatterns) {
        if (pattern.test(content)) {
            console.log(`❌ [${severity}] ${rel}: banned pattern '${name}' found`);
            errors++;
        }
    }

    // Count (prisma as any)
    const matches = content.match(/\(prisma as any\)/g);
    if (matches) {
        prismaAnyCount += matches.length;
    }
}

// Check prisma threshold
if (prismaAnyCount > PRISMA_ANY_THRESHOLD) {
    console.log(`❌ [ERROR] (prisma as any) count ${prismaAnyCount} exceeds threshold ${PRISMA_ANY_THRESHOLD}`);
    errors++;
} else if (prismaAnyCount > 0) {
    console.log(`⚠️  [WARN] (prisma as any) count: ${prismaAnyCount} (threshold: ${PRISMA_ANY_THRESHOLD})`);
    warnings++;
} else {
    console.log(`✅ (prisma as any): 0 usages`);
}

// Summary
console.log(`\n--- Summary ---`);
console.log(`Files scanned: ${files.length}`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) {
    console.log('\n❌ LINT GUARDS FAILED');
    process.exit(1);
} else {
    console.log('\n✅ LINT GUARDS PASSED');
    process.exit(0);
}
