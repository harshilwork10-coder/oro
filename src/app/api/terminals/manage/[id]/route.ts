import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { paxTerminalIP, paxTerminalPort, processorMID } = body

        // Validate IP address format (basic validation)
        if (paxTerminalIP && !/^(\d{1,3}\.){3}\d{1,3}$/.test(paxTerminalIP)) {
            return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 })
        }

        // Update location with new terminal configuration
        const updated = await prisma.location.update({
            where: { id },
            data: {
                paxTerminalIP: paxTerminalIP || null,
                paxTerminalPort: paxTerminalPort || '10009',
                processorMID: processorMID || null
            }
        })

        console.log(`✅ Terminal configuration updated for location: ${updated.name}`)
        console.log(`   IP: ${paxTerminalIP || 'Not set'}`)
        console.log(`   Port: ${paxTerminalPort || '10009'}`)
        console.log(`   MID: ${processorMID || 'Not set'}`)
        console.log(`   Updated by: ${session.user.email}`)

        return NextResponse.json({ success: true, data: updated })
    } catch (error) {
        console.error('Error updating terminal configuration:', error)
        return NextResponse.json({ error: 'Failed to update terminal configuration' }, { status: 500 })
    }
}

