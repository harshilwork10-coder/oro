const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/app/api/franchise/reports/**/route.ts');

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');

    if (!content.includes("import { getReportScope }")) {
        content = "import { getReportScope } from '@/lib/reporting/report-scope'\n" + content;
    }

    // Daily
    if (file.includes('daily')) {
        content = content.replace(/export async function GET\(request: Request\) \{[\s\S]+?try \{/m, 
`export async function GET(request: Request) {
    let scope;
    try {
        scope = await getReportScope(request)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 401 })
    }
    const startOfDay = scope.startDate;
    const endOfDay = scope.endDate;
    try {
        const user = { franchiseId: scope.franchiseId }; // Shim
`)
        content = content.replace(/if \(locationId\) \{\s+whereClause\.locationId = locationId\s+\}/, `whereClause = { ...whereClause, ...scope.locationFilter }`);
    }

    // Consolidated-PL
    if (file.includes('consolidated-pl')) {
        content = content.replace(/export async function GET\(req: NextRequest\) \{[\s\S]+?try \{/m, 
`export async function GET(req: NextRequest) {
    let scope;
    try {
        scope = await getReportScope(req)
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 401 })
    }
    const days = parseInt(new URL(req.url).searchParams.get('days') || '30')
    const since = scope.startDate;
    try {
        const user = { franchiseId: scope.franchiseId };
`)
        content = content.replace(/where: \{ franchiseId: user\.franchiseId \}/, `where: { franchiseId: user.franchiseId, ...scope.locationFilter }`);
    }

    fs.writeFileSync(file, content);
}

console.log('Done manual patch script.');
