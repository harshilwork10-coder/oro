import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Papa from 'papaparse'
import { getAuthUser } from '@/lib/auth/mobileAuth'

// POST - Import customers from CSV into a target franchise
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
        const skipDuplicates = formData.get('skipDuplicates') !== 'false'

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
        const mappings = detectCustomerColumns(headers)

        const results = { created: 0, skipped: 0, errors: [] as string[] }

        // Get existing customers for duplicate detection
        const existingCustomers = await prisma.client.findMany({
            where: { franchiseId },
            select: { email: true, phone: true }
        })
        const existingEmails = new Set(existingCustomers.map(c => c.email?.toLowerCase()).filter(Boolean))
        const existingPhones = new Set(existingCustomers.map(c => c.phone).filter(Boolean))

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            try {
                const firstName = getVal(row, mappings.firstName) || ''
                const lastName = getVal(row, mappings.lastName) || ''
                const fullName = getVal(row, mappings.fullName) || ''
                const email = getVal(row, mappings.email) || null
                const phone = cleanPhone(getVal(row, mappings.phone))

                // Derive first/last name from full name if needed
                let fName = firstName
                let lName = lastName
                if (!fName && !lName && fullName) {
                    const parts = fullName.trim().split(/\s+/)
                    fName = parts[0] || ''
                    lName = parts.slice(1).join(' ') || ''
                }

                if (!fName && !lName) {
                    results.errors.push(`Row ${i + 1}: No name found`)
                    continue
                }

                // Check duplicates
                if (skipDuplicates) {
                    if (email && existingEmails.has(email.toLowerCase())) {
                        results.skipped++
                        continue
                    }
                    if (phone && existingPhones.has(phone)) {
                        results.skipped++
                        continue
                    }
                }

                await prisma.client.create({
                    data: {
                        franchiseId,
                        firstName: fName,
                        lastName: lName,
                        email: email || null,
                        phone: phone || null,
                    }
                })
                results.created++

                // Track for duplicate detection within batch
                if (email) existingEmails.add(email.toLowerCase())
                if (phone) existingPhones.add(phone)

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
        console.error('Error importing customers:', error)
        return NextResponse.json({ error: 'Failed to import customers' }, { status: 500 })
    }
}

function detectCustomerColumns(headers: string[]) {
    const lower = headers.map(h => h.toLowerCase().trim())
    const find = (patterns: string[]) => {
        for (const p of patterns) {
            const idx = lower.findIndex(h => h.includes(p))
            if (idx >= 0) return headers[idx]
        }
        return null
    }
    return {
        firstName: find(['first name', 'firstname', 'first_name', 'fname']),
        lastName: find(['last name', 'lastname', 'last_name', 'lname', 'surname']),
        fullName: find(['full name', 'fullname', 'customer name', 'name', 'customer']),
        email: find(['email', 'e-mail', 'email address']),
        phone: find(['phone', 'mobile', 'cell', 'telephone', 'tel', 'contact']),
    }
}

function getVal(row: Record<string, string>, key: string | null): string {
    if (!key) return ''
    return String(row[key] || '').trim()
}

function cleanPhone(phone: string): string | null {
    if (!phone) return null
    // Strip non-digits, keep only numbers
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 7) return null
    // Format as 10-digit US phone if applicable
    if (digits.length === 10) return digits
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
    return digits
}
