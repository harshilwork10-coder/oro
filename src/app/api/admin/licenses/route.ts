import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// Generate a new license key
function generateLicenseKey(): string {
    const segments = []
    for (let i = 0; i < 4; i++) {
        const segment = randomBytes(2).toString('hex').toUpperCase()
        segments.push(segment)
    }
    return `AURA-${segments.join('-')}`
}

// Get all licenses (admin)
export async function GET() {
    try {
        const licenses = await prisma.license.findMany({
            include: {
                terminals: true,
                location: true
            },
            orderBy: { issuedAt: 'desc' }
        })

        return NextResponse.json({ licenses })
    } catch (error) {
        console.error('Fetch licenses error:', error)
        return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
    }
}

// Create new license (admin)
export async function POST(req: NextRequest) {
    try {
        const {
            locationId,
            franchiseId,
            customerName,
            customerEmail,
            customerPhone,
            maxTerminals,
            expiresAt,
            notes
        } = await req.json()

        // Generate unique license key
        let licenseKey
        let attempts = 0
        while (attempts < 10) {
            licenseKey = generateLicenseKey()
            const existing = await prisma.license.findUnique({ where: { licenseKey } })
            if (!existing) break
            attempts++
        }

        if (attempts >= 10) {
            return NextResponse.json({ error: 'Failed to generate unique license key' }, { status: 500 })
        }

        const license = await prisma.license.create({
            data: {
                licenseKey,
                locationId: locationId || null,
                franchiseId: franchiseId || null,
                customerName: customerName || null,
                customerEmail: customerEmail || null,
                customerPhone: customerPhone || null,
                maxTerminals: maxTerminals || null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                notes: notes || null,
                status: 'ACTIVE'
            },
            include: {
                location: true
            }
        })

        return NextResponse.json({
            success: true,
            license,
            message: 'License created successfully'
        })

    } catch (error) {
        console.error('Create license error:', error)
        return NextResponse.json({ error: 'Failed to create license' }, { status: 500 })
    }
}

// Update license status or settings (admin)
export async function PATCH(req: NextRequest) {
    try {
        const {
            licenseId,
            status,
            maxTerminals,
            expiresAt,
            customerName,
            customerEmail,
            customerPhone,
            notes
        } = await req.json()

        if (!licenseId) {
            return NextResponse.json({ error: 'License ID is required' }, { status: 400 })
        }

        const updateData: any = {}
        if (status) updateData.status = status
        if (maxTerminals !== undefined) updateData.maxTerminals = maxTerminals
        if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
        if (customerName !== undefined) updateData.customerName = customerName
        if (customerEmail !== undefined) updateData.customerEmail = customerEmail
        if (customerPhone !== undefined) updateData.customerPhone = customerPhone
        if (notes !== undefined) updateData.notes = notes

        const license = await prisma.license.update({
            where: { id: licenseId },
            data: updateData,
            include: {
                terminals: true,
                location: true
            }
        })

        return NextResponse.json({
            success: true,
            license,
            message: 'License updated successfully'
        })

    } catch (error) {
        console.error('Update license error:', error)
        return NextResponse.json({ error: 'Failed to update license' }, { status: 500 })
    }
}

// Transfer entire license to new location/customer (admin)
export async function PUT(req: NextRequest) {
    try {
        const {
            licenseId,
            newLocationId,
            newCustomerName,
            newCustomerEmail,
            newCustomerPhone,
            reason,
            performedBy
        } = await req.json()

        if (!licenseId) {
            return NextResponse.json({ error: 'License ID is required' }, { status: 400 })
        }

        const license = await prisma.license.update({
            where: { id: licenseId },
            data: {
                locationId: newLocationId || null,
                customerName: newCustomerName || null,
                customerEmail: newCustomerEmail || null,
                customerPhone: newCustomerPhone || null
            },
            include: {
                terminals: true,
                location: true
            }
        })

        // Log all terminal transfers
        if (license.terminals.length > 0) {
            await Promise.all(
                license.terminals.map((terminal: any) =>
                    prisma.terminalTransferLog.create({
                        data: {
                            terminalId: terminal.id,
                            fromLicenseId: licenseId,
                            transferType: 'LICENSE_TRANSFER',
                            reason: reason || 'License transferred to new location',
                            performedBy: performedBy || 'System'
                        }
                    })
                )
            )
        }

        return NextResponse.json({
            success: true,
            license,
            message: 'License transferred successfully'
        })

    } catch (error) {
        console.error('Transfer license error:', error)
        return NextResponse.json({ error: 'Failed to transfer license' }, { status: 500 })
    }
}
