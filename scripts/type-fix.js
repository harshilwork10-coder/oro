/**
 * TYPE-704: Remove (prisma as any) for VALID models
 * SCHEMA-703: Fix franchiseLocation → location
 * 
 * Also cleans orphaned migration artifacts (empty semicolons, duplicate auth checks)
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api');
const LIB_DIR = path.join(__dirname, '..', 'src', 'lib');
let fixed = 0;
let totalReplacements = 0;

function findFiles(dir, ext = 'route.ts') {
    let results = [];
    try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) results.push(...findFiles(full, ext));
            else if (ext === 'route.ts' ? entry.name === 'route.ts' : (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
                results.push(full);
            }
        }
    } catch {}
    return results;
}

// VALID models that can have (prisma as any) removed
const validModels = [
    'appointment', 'cashDrawerSession', 'checkIn', 'client',
    'compensationPlan', 'dealSuggestion', 'departmentTaxDefault',
    'globalService', 'globalServiceCategory', 'item', 'location',
    'locationServiceOverride', 'lotteryPack', 'offboardingCase',
    'posRegisterLayout', 'reminderSettings', 'service', 'serviceCategory',
    'smsOptOut', 'smsUsageLedger', 'subFranchisee', 'suspendedTransaction',
    'taxGroup', 'taxGroupComponent', 'timeEntry', 'transaction',
    'trustedDevice', 'user'
];

const allFiles = [...findFiles(API_DIR, 'route.ts'), ...findFiles(LIB_DIR, '.ts')];

for (const file of allFiles) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    const rel = file.includes('src\\app\\api') ? path.relative(API_DIR, file) : 'lib\\' + path.relative(LIB_DIR, file);
    const changes = [];

    // SCHEMA-703: Fix franchiseLocation → location
    if (content.includes('(prisma as any).franchiseLocation.')) {
        content = content.replace(/\(prisma as any\)\.franchiseLocation\./g, '(prisma as any).location.');
        changes.push('franchiseLocation→location');
    }

    // TYPE-704: Remove (prisma as any) for valid models
    for (const model of validModels) {
        const pattern = new RegExp(`\\(prisma as any\\)\\.${model}\\.`, 'g');
        if (pattern.test(content)) {
            content = content.replace(pattern, `prisma.${model}.`);
            changes.push(`(prisma as any).${model}→prisma.${model}`);
        }
    }

    // Clean orphaned semicolons from deleted imports (;\n;)
    content = content.replace(/^;\s*\n;\s*\n/gm, '');
    content = content.replace(/^;\s*\n/gm, '');

    // Clean duplicate auth checks (if (!user) {...} appearing right after if (!user?.xyz) return ...)
    content = content.replace(/\n\n\s*;\s*\n\s*if \(!user\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\);\s*\n\s*\}\n/g, '\n');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`🔧 ${rel} (${changes.join(', ')})`);
        fixed++;
        totalReplacements += changes.length;
    }
}

console.log(`\nFixed: ${fixed} files`);
console.log(`Total replacements: ${totalReplacements}`);
