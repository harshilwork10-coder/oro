const { Project, SyntaxKind } = require('ts-morph')
const path = require('path')
const fs = require('fs')

function refactorReports() {
    const project = new Project()
    project.addSourceFilesAtPaths('src/app/api/franchise/reports/**/route.ts')

    const files = project.getSourceFiles()
    console.log(`Found ${files.length} report files.`)

    for (const file of files) {
        console.log(`Refactoring ${file.getBaseName()} in ${file.getDirectory().getBaseName()}...`)

        // Add import { getReportScope } from '@/lib/reporting/report-scope'
        const hasScopeImport = file.getImportDeclaration(d => d.getModuleSpecifierValue() === '@/lib/reporting/report-scope')
        if (!hasScopeImport) {
            file.addImportDeclaration({
                namedImports: ['getReportScope'],
                moduleSpecifier: '@/lib/reporting/report-scope'
            })
        }

        const getFn = file.getFunction('GET')
        if (!getFn) {
            console.log(file.getDirectory().getBaseName() + ' has no GET function, skipping.')
            continue
        }

        const statements = getFn.getBody().getStatements()
        // We will slice statements up to the first Prisma query (e.g., `const transactions = await prisma...`)
        // And replace the boiler plate with `getReportScope`
        // Wait, because each file accesses `transactions`, `user`, etc., we need to find the `prisma.transaction.findMany` or similar query.
        
        let targetStatementIdx = -1;
        for (let i = 0; i < statements.length; i++) {
            const text = statements[i].getText();
            if (text.includes('prisma.transaction.findMany') || 
                text.includes('prisma.appointment.findMany') ||
                text.includes('prisma.transaction.count') ||
                text.includes('prisma.customer.findMany')) {
                // Actually, often the query is inside a `try {}` block!
            }
        }
    }
}
refactorReports()
