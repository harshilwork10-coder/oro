import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'
import { getAuthUser } from '@/lib/auth/mobileAuth'

// POST - Import departments/categories from CSV into a target franchise
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!user?.id || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get('file') as File
        const franchiseId = formData.get('franchiseId') as string

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }
        if (!franchiseId) {
            return NextResponse.json({ error: 'franchiseId is required' }, { status: 400 })
        }

        // Verify franchise exists
        const franchise = await prisma.franchise.findUnique({ where: { id: franchiseId } })
        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        // Parse CSV
        const fileName = file.name.toLowerCase()
        if (!fileName.endsWith('.csv')) {
            return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const csvText = buffer.toString('utf-8')
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
        const rows = parsed.data as Record<string, string>[]

        if (rows.length === 0) {
            return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
        }

        // Auto-detect columns
        const headers = Object.keys(rows[0])
        const mappings = detectDeptColumns(headers)

        const results = { created: 0, skipped: 0, errors: [] as string[] }

        // Get existing departments
        const existingDepts = await prisma.department.findMany({
            where: { franchiseId },
            select: { name: true }
        })
        const existingNames = new Set(existingDepts.map(d => d.name.toLowerCase()))

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            try {
                const name = getVal(row, mappings.name)
                const description = getVal(row, mappings.description) || null

                if (!name) {
                    results.errors.push(`Row ${i + 1}: No department name found`)
                    continue
                }

                // Skip if already exists
                if (existingNames.has(name.toLowerCase())) {
                    results.skipped++
                    continue
                }

                await prisma.department.create({
                    data: {
                        franchiseId,
                        name,
                        description,
                        sortOrder: i,
                        isActive: true,
                    }
                })
                results.created++
                existingNames.add(name.toLowerCase())

            } catch (error: any) {
                results.errors.push(`Row ${i + 1}: ${error.message}`)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Import complete: ${results.created} created, ${results.skipped} skipped`,
            totalRows: rows.length,
            headers,
            mappings,
            ...results,
        })

    } catch (error) {
        console.error('Error importing departments:', error)
        return NextResponse.json({ error: 'Failed to import departments' }, { status: 500 })
    }
}

function detectDeptColumns(headers: string[]) {
    const lower = headers.map(h => h.toLowerCase().trim())
    const find = (patterns: string[]) => {
        for (const p of patterns) {
            const idx = lower.findIndex(h => h.includes(p))
            if (idx >= 0) return headers[idx]
        }
        return null
    }
    return {
        name: find(['department', 'dept', 'category', 'name', 'group', 'section']),
        description: find(['description', 'desc', 'notes', 'detail']),
    }
}

function getVal(row: Record<string, string>, key: string | null): string {
    if (!key) return ''
    return String(row[key] || '').trim()
}
