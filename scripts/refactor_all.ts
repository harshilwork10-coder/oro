const fs = require('fs');

const files = [
    'cash-card', 'consolidated-pl', 'customers', 'daily', 'discount-audit', 
    'earnings-statement', 'no-shows', 'payout-history', 'price-compare', 
    'refunds', 'retention', 'tax', 'tips', 'utilization'
].map(f => `src/app/api/franchise/reports/${f}/route.ts`);

function processFile(path) {
    let content = fs.readFileSync(path, 'utf8');
    
    // Ensure import exists
    if (!content.includes("import { getReportScope }")) {
        content = "import { getReportScope } from '@/lib/reporting/report-scope'\n" + content;
    }

    // Match the entire boilerplate block from 'export async function GET(req: NextRequest) {' up to the first 'const [a-zA-Z]+ = await prisma.'
    // However, the signature is sometimes `(req: NextRequest)` and sometimes `(request: Request)`.
    
    const signatureMatch = content.match(/export async function GET\([^)]+\)\s*\{/);
    if (!signatureMatch) return;
    
    const firstQueryMatch = content.match(/const\s+\w+\s*=\s*await\s+prisma\.[a-zA-Z0-9_]+\.(?:findMany|count|aggregate|findUnique)\(\{/s);
    if (!firstQueryMatch) return;

    const boilerplateEndIndex = firstQueryMatch.index;
    const bodyStartIndex = signatureMatch.index + signatureMatch[0].length;

    const boilerplate = content.substring(bodyStartIndex, boilerplateEndIndex);

    // If it's already been patched with 'let scope;', skip
    if (boilerplate.includes('let scope;')) return;

    // Detect what variables they used for dates
    let startDateVar = 'startOfDay';
    let endDateVar = 'endOfDay';
    
    if (boilerplate.includes('dateStart')) startDateVar = 'dateStart';
    if (boilerplate.includes('dateEnd')) endDateVar = 'dateEnd';

    const reqVarMatch = signatureMatch[0].match(/GET\((req|request)/);
    const reqVar = reqVarMatch ? reqVarMatch[1] : 'req';

    const newBoilerplate = `
    let scope;
    try {
        scope = await getReportScope(${reqVar})
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 401 })
    }
    const ${startDateVar} = scope.startDate;
    const ${endDateVar} = scope.endDate;
    const franchiseId = scope.franchiseId;
    const locationFilter = scope.locationFilter;
    const user = { franchiseId, id: 'SHIM' }; // Legacy shim
    
    // `;

    content = content.substring(0, bodyStartIndex) + newBoilerplate + content.substring(boilerplateEndIndex);
    
    // Now replace `where: { franchiseId: user.franchiseId` or `where: { franchiseId`
    content = content.replace(/where: \{\s*franchiseId(?:[ :a-zA-Z0-9_.]+)?,/g, 'where: { franchiseId: scope.franchiseId, ...locationFilter,');

    fs.writeFileSync(path, content);
}

for (const path of files) {
    if (fs.existsSync(path)) {
        processFile(path);
        console.log('Patched: ' + path);
    }
}
