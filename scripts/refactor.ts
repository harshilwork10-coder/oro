import { Project, SyntaxKind } from 'ts-morph'

function main() {
    const project = new Project()
    project.addSourceFilesAtPaths('src/app/api/franchise/reports/**/route.ts')

    let modified = 0
    for (const file of project.getSourceFiles()) {
        const getFn = file.getFunction('GET')
        if (!getFn) continue

        let fileText = file.getText()
        if (fileText.includes('getReportScope(')) continue // already patched

        // We will do a generic text replacement. 
        // 1. imports
        let newImports = `import { getReportScope } from '@/lib/reporting/report-scope'\n`
        fileText = newImports + fileText.replace(/import \{ getAuthUser \}.+?\n/g, '')

        let newBody = `    let scope;
    try {
        scope = await getReportScope(request || req)
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
    }

    const { franchiseId, locationFilter, startDate: dateStart, endDate: dateEnd, locations } = scope;
    `

        // Replace everything from `const authUser = await getAuthUser` to the first Prisma query
        const match = fileText.match(/const (?:user|authUser) = await getAuthUser\(.*?\).*?const [A-Za-z0-9_]+ = await prisma\.[A-Za-z0-9_]+\.(?:findMany|count|aggregate)\(\{/s)
        if (match) {
            // Find just before the query
            const queryMatch = match[0].match(/const [A-Za-z0-9_]+ = await prisma\.[A-Za-z0-9_]+\.(?:findMany|count|aggregate)\(\{/s)
            
            if (queryMatch) {
                const replacement = newBody + '\n        ' + queryMatch[0]
                fileText = fileText.replace(match[0], replacement)
                
                // Now replace ALL occurrences of startOfDay with dateStart
                fileText = fileText.replace(/startOfDay/g, 'dateStart').replace(/endOfDay/g, 'dateEnd')
                fileText = fileText.replace(/user\.franchiseId/g, 'franchiseId')
                
                // Now inject locationFilter
                // We know query starts with { where: {
                if (fileText.includes('where: {')) {
                     // Since some have `franchiseId,` we can just patch `franchiseId: scope.franchiseId, ...locationFilter,`
                     fileText = fileText.replace(/where:\s*\{/, 'where: { ...locationFilter,')
                }

                file.replaceWithText(fileText)
                modified++
            }
        }
    }
    
    project.saveSync()
    console.log(`Refactored ${modified} files.`)
}

main()
