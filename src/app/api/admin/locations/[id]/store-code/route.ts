import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/admin/locations/[id]/store-code
 * Get the Pulse store code for a location
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || !['PROVIDER', 'FRANCHISOR'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const location = await prisma.location.findUnique({
            where: { id },
            select: { id: true, name: true, pulseStoreCode: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        return NextResponse.json(location)
    } catch (error) {
        console.error('Error getting store code:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/admin/locations/[id]/store-code
 * Set the Pulse store code for a location
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || !['PROVIDER', 'FRANCHISOR'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { storeCode } = body

        if (!storeCode || typeof storeCode !== 'string') {
            return NextResponse.json({ error: 'Store code required' }, { status: 400 })
        }

        // Validate format: 2-8 uppercase alphanumeric
        const code = storeCode.toUpperCase().replace(/[^A-Z0-9]/g, '')
        if (code.length < 2 || code.length > 8) {
            return NextResponse.json({
                error: 'Store code must be 2-8 characters (letters and numbers only)'
            }, { status: 400 })
        }

        // Check if code is already used by another location
        const existing = await prisma.location.findFirst({
            where: {
                pulseStoreCode: code,
                id: { not: id }
            }
        })

        if (existing) {
            return NextResponse.json({
                error: 'This store code is already in use by another location'
            }, { status: 409 })
        }

        // Update location
        const updated = await prisma.location.update({
            where: { id },
            data: { pulseStoreCode: code },
            select: { id: true, name: true, pulseStoreCode: true }
        })

        return NextResponse.json({
            success: true,
            message: `Store code set to "${code}"`,
            location: updated
        })
    } catch (error) {
        console.error('Error setting store code:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

/**
 * DELETE /api/admin/locations/[id]/store-code
 * Remove the Pulse store code from a location
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || !['PROVIDER', 'FRANCHISOR'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        await prisma.location.update({
            where: { id },
            data: { pulseStoreCode: null }
        })

        return NextResponse.json({ success: true, message: 'Store code removed' })
    } catch (error) {
        console.error('Error removing store code:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
