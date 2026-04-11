import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// GET: List all printers for the franchise
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise assigned' }, { status: 400 })
        }

        const printers = await prisma.printerConfig.findMany({
            where: { franchiseId: user.franchiseId },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json({ printers })
    } catch (error) {
        console.error('[PRINTERS_GET]', error)
        return NextResponse.json({ error: 'Failed to get printers' }, { status: 500 })
    }
}

// POST: Add a new printer
export async function POST(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
if (!['PROVIDER', 'ADMIN', 'FRANCHISOR', 'OWNER', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise assigned' }, { status: 400 })
        }

        const { name, type, printerLang, agentUrl, stationId, labelWidth, isDefault } = await req.json()

        if (!name || !type || !agentUrl) {
            return NextResponse.json({ error: 'Name, type, and agentUrl required' }, { status: 400 })
        }

        // Validate type
        const validTypes = ['RECEIPT', 'KITCHEN', 'BAR', 'LABEL']
        if (!validTypes.includes(type)) {
            return NextResponse.json({ error: `Invalid type. Must be: ${validTypes.join(', ')}` }, { status: 400 })
        }

        // If setting as default, unset other defaults of same type
        if (isDefault) {
            await prisma.printerConfig.updateMany({
                where: {
                    franchiseId: user.franchiseId,
                    type,
                    isDefault: true
                },
                data: { isDefault: false }
            })
        }

        const printer = await prisma.printerConfig.create({
            data: {
                franchiseId: user.franchiseId,
                name,
                type,
                printerLang: printerLang || (type === 'LABEL' ? 'ZPL' : 'ESCPOS'),
                agentUrl,
                stationId,
                labelWidth,
                isDefault: isDefault || false,
                isActive: true
            }
        })

        return NextResponse.json({ printer })
    } catch (error) {
        console.error('[PRINTERS_POST]', error)
        return NextResponse.json({ error: 'Failed to add printer' }, { status: 500 })
    }
}

// PATCH: Update a printer
export async function PATCH(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
if (!['PROVIDER', 'ADMIN', 'FRANCHISOR', 'OWNER', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const { id, name, type, printerLang, agentUrl, stationId, labelWidth, isDefault, isActive } = await req.json()

        if (!id) {
            return NextResponse.json({ error: 'Printer ID required' }, { status: 400 })
        }

        // Verify printer belongs to franchise
        const existingPrinter = await prisma.printerConfig.findFirst({
            where: { id, franchiseId: user.franchiseId }
        })

        if (!existingPrinter) {
            return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
        }

        // If setting as default, unset other defaults of same type
        if (isDefault && !existingPrinter.isDefault) {
            await prisma.printerConfig.updateMany({
                where: {
                    franchiseId: user.franchiseId,
                    type: type || existingPrinter.type,
                    isDefault: true
                },
                data: { isDefault: false }
            })
        }

        const printer = await prisma.printerConfig.update({
            where: { id },
            data: {
                name,
                type,
                printerLang,
                agentUrl,
                stationId,
                labelWidth,
                isDefault,
                isActive
            }
        })

        return NextResponse.json({ printer })
    } catch (error) {
        console.error('[PRINTERS_PATCH]', error)
        return NextResponse.json({ error: 'Failed to update printer' }, { status: 500 })
    }
}

// DELETE: Remove a printer
export async function DELETE(req: NextRequest) {
    try {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
if (!['PROVIDER', 'ADMIN', 'FRANCHISOR', 'OWNER', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Printer ID required' }, { status: 400 })
        }

        // Verify printer belongs to franchise
        const existingPrinter = await prisma.printerConfig.findFirst({
            where: { id, franchiseId: user.franchiseId }
        })

        if (!existingPrinter) {
            return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
        }

        await prisma.printerConfig.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[PRINTERS_DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete printer' }, { status: 500 })
    }
}

