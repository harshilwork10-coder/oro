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

// Transfer terminal to different license (admin)
export async function POST(req: NextRequest) {
    try {
        const { terminalId, newLicenseId, reason, performedBy } = await req.json()

        if (!terminalId) {
            return NextResponse.json({ error: 'Terminal ID is required' }, { status: 400 })
        }

        const terminal = await prisma.registeredTerminal.findUnique({
            where: { id: terminalId },
            include: { license: true }
        })

        if (!terminal) {
            return NextResponse.json({ error: 'Terminal not found' }, { status: 404 })
        }

        // If newLicenseId is null, unassign the terminal
        const oldLicenseId = terminal.licenseId

        // Update terminal
        const updatedTerminal = await prisma.registeredTerminal.update({
            where: { id: terminalId },
            data: {
                licenseId: newLicenseId || null,
                status: newLicenseId ? 'ACTIVE' : 'INACTIVE'
            }
        })

        // Log the transfer
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
        console.error('Transfer terminal error:', error)
        return NextResponse.json({ error: 'Failed to transfer terminal' }, { status: 500 })
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
