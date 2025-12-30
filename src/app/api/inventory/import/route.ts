import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Parse uploaded CSV/Excel file
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id || !user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can import inventory (for client onboarding)
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Permission denied. Only providers can import inventory.' }, { status: 403 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const fileName = file.name.toLowerCase()
        const buffer = Buffer.from(await file.arrayBuffer())
        let rows: any[] = []

        // Parse based on file type
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // Excel file
            const XLSX = require('xlsx')
            const workbook = XLSX.read(buffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]
            const sheet = workbook.Sheets[sheetName]
            rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        } else if (fileName.endsWith('.csv')) {
            // CSV file
            const Papa = require('papaparse')
            const csvText = buffer.toString('utf-8')
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true })
            rows = parsed.data
        } else {
            return NextResponse.json({ error: 'Unsupported file type. Use .csv, .xlsx, or .xls' }, { status: 400 })
        }

        if (rows.length === 0) {
            return NextResponse.json({ error: 'File is empty or has no data rows' }, { status: 400 })
        }

        // Get headers from first row
        const headers = Object.keys(rows[0])

        // Auto-detect column mappings
        const columnMappings = detectColumnMappings(headers)

        // Parse items with detected mappings
        const items = rows.map((row, index) => ({
            rowNum: index + 1,
            upc: getColumnValue(row, columnMappings.upc) || '',
            originalName: getColumnValue(row, columnMappings.name) || '',
            enrichedName: null, // Will be filled by enrichment
            brand: null,
            size: null,
            department: getColumnValue(row, columnMappings.department) || '',
            cost: parseFloat(getColumnValue(row, columnMappings.cost)) || 0,
            price: parseFloat(getColumnValue(row, columnMappings.price)) || 0,
            stock: parseInt(getColumnValue(row, columnMappings.stock)) || 0,
            needsEnrichment: true
        })).filter(item => item.upc || item.originalName) // Filter out empty rows

        return NextResponse.json({
            success: true,
            totalRows: rows.length,
            parsedItems: items.length,
            headers,
            columnMappings,
            items: items.slice(0, 100) // Return first 100 for preview
        })

    } catch (error) {
        console.error('Error parsing file:', error)
        return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 })
    }
}

// Auto-detect column mappings based on header names
function detectColumnMappings(headers: string[]) {
    const lowerHeaders = headers.map(h => h.toLowerCase().trim())

    const findHeader = (patterns: string[]) => {
        for (const pattern of patterns) {
            const idx = lowerHeaders.findIndex(h => h.includes(pattern))
            if (idx >= 0) return headers[idx]
        }
        return null
    }

    return {
        upc: findHeader(['upc', 'barcode', 'code', 'ean', 'gtin', 'plu']),
        name: findHeader(['description', 'name', 'item', 'product', 'desc']),
        department: findHeader(['dept', 'department', 'category', 'cat', 'group']),
        cost: findHeader(['cost', 'unit cost', 'wholesale']),
        price: findHeader(['price', 'retail', 'sell', 'selling']),
        stock: findHeader(['qty', 'stock', 'quantity', 'on hand', 'count', 'inventory'])
    }
}

function getColumnValue(row: any, columnName: string | null): string {
    if (!columnName) return ''
    return String(row[columnName] || '').trim()
}

