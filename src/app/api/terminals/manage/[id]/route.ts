import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

// PUT — update a specific PaymentTerminal
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!session || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { name, terminalIP, terminalPort, isActive, stationId } = body

        // Validate IP address format
        if (terminalIP && !/^(\d{1,3}\.){3}\d{1,3}$/.test(terminalIP)) {
            return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 })
        }

        // Build update data
        const updateData: any = {}
        if (name !== undefined) updateData.name = name
        if (terminalIP !== undefined) updateData.terminalIP = terminalIP
        if (terminalPort !== undefined) updateData.terminalPort = terminalPort
        if (isActive !== undefined) updateData.isActive = isActive

        const updated = await prisma.paymentTerminal.update({
            where: { id },
            data: updateData,
            include: {
                assignedStation: { select: { id: true, name: true } }
            }
        })

        // Handle station assignment change
        if (stationId !== undefined) {
            // First unassign any station currently pointing to this terminal
            await prisma.station.updateMany({
                where: { dedicatedTerminalId: id },
                data: { dedicatedTerminalId: null }
            })

            // Then set the new assignment
            if (stationId) {
                await prisma.station.update({
                    where: { id: stationId },
                    data: { dedicatedTerminalId: id }
                })
            }
        }

        return NextResponse.json({ success: true, terminal: updated })
    } catch (error) {
        console.error('Error updating terminal:', error)
        return NextResponse.json({ error: 'Failed to update terminal' }, { status: 500 })
    }
}

// DELETE — remove a PaymentTerminal
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!session || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Unassign any station first
        await prisma.station.updateMany({
            where: { dedicatedTerminalId: id },
            data: { dedicatedTerminalId: null }
        })

        await prisma.paymentTerminal.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting terminal:', error)
        return NextResponse.json({ error: 'Failed to delete terminal' }, { status: 500 })
    }
}
