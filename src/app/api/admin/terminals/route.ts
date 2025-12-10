import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get all licenses (for admin)
export async function GET() {
    try {
        const licenses = await prisma.license.findMany({
            include: {
                location: true,
                terminals: true // Include registered terminals
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ licenses })
    } catch (error) {
        console.error('Fetch licenses error:', error)
        return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
    }
}

// Create or Transfer terminal
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { terminalId, newLicenseId, reason, performedBy, serialNumber, model, locationId } = body

        // --- CREATION LOGIC ---
        if (serialNumber && model && locationId) {
            // 1. Check if terminal exists
            const existing = await prisma.registeredTerminal.findUnique({
                where: { serialNumber }
            })
            if (existing) {
                return NextResponse.json({ error: 'Terminal with this S/N already exists' }, { status: 409 })
            }

            // 2. Find or Create License for Location
            // Simplified: We assume we need a license to attach meaningful status. 
            // Or we just create RegisteredTerminal attached to location via License?
            // Schema check: RegisteredTerminal -> License -> Location.
            // We need to find an ACTIVE license for this location, or create one?
            // Let's create a LICENSE first if needed, or find one.

            // For simplicity in this "Add Terminal" flow: 
            // We create a new License Key for this terminal.
            const licenseKey = `LIC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

            const newLicense = await prisma.license.create({
                data: {
                    licenseKey,
                    status: 'ACTIVE',
                    type: 'TERMINAL',
                    locationId: locationId
                }
            })

            const newTerminal = await prisma.registeredTerminal.create({
                data: {
                    serialNumber,
                    model,
                    status: 'ACTIVE',
                    licenseId: newLicense.id
                }
            })

            return NextResponse.json({ success: true, terminal: newTerminal, message: 'Terminal added successfully' })
        }

        // --- TRANSFER LOGIC ---
        if (!terminalId) {
            return NextResponse.json({ error: 'Terminal ID (for transfer) or Serial/Model/Location (for create) required' }, { status: 400 })
        }

        const terminal = await prisma.registeredTerminal.findUnique({
            where: { id: terminalId },
            include: { license: true }
        })

        if (!terminal) {
            return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
        }

        // ... (rest of transfer logic)
        const oldLicenseId = terminal.licenseId
        const updatedTerminal = await prisma.registeredTerminal.update({
            where: { id: terminalId },
            data: {
                licenseId: newLicenseId || null,
                status: newLicenseId ? 'ACTIVE' : 'INACTIVE'
            }
        })

        await prisma.terminalTransferLog.create({
            data: {
                terminalId,
                fromLicenseId: oldLicenseId,
                transferType: newLicenseId ? 'REASSIGNMENT' : 'UNASSIGNMENT',
                reason: reason || '',
                performedBy: performedBy || 'System'
            }
        })

        return NextResponse.json({
            success: true,
            terminal: updatedTerminal,
            message: newLicenseId ? 'Terminal transferred successfully' : 'Terminal unassigned successfully'
        })

    } catch (error) {
        console.error('Terminal Action error:', error)
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
    }
}

// Deactivate/Replace terminal
export async function PATCH(req: NextRequest) {
    try {
        const { terminalId, status, replacementNotes } = await req.json()

        if (!terminalId || !status) {
            return NextResponse.json({ error: 'Terminal ID and status are required' }, { status: 400 })
        }

        const terminal = await prisma.registeredTerminal.update({
            where: { id: terminalId },
            data: {
                status,
                replacementNotes: replacementNotes || null
            }
        })

        return NextResponse.json({
            success: true,
            terminal,
            message: `Terminal status updated to ${status}`
        })

    } catch (error) {
        console.error('Update terminal error:', error)
        return NextResponse.json({ error: 'Failed to update terminal' }, { status: 500 })
    }
}
