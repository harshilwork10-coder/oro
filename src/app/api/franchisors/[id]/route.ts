import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser(request)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Find the franchisor to get the owner ID
        const franchisor = await prisma.franchisor.findUnique({
            where: { id },
            select: { ownerId: true }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Delete the User (Owner), which will cascade delete the Franchisor and all related data
        await prisma.user.delete({
            where: { id: franchisor.ownerId }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error deleting franchisor:', error)
        return NextResponse.json(
            { error: 'Failed to delete franchisor' },
            { status: 500 }
        )
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        // Update allowed fields
        const updatedFranchisor = await prisma.franchisor.update({
            where: { id },
            data: {
                name: body.name,
                businessType: body.businessType,
                address: body.address,
                ssn: body.ssn,
                fein: body.fein,
                routingNumber: body.routingNumber,
                accountNumber: body.accountNumber,
                voidCheckUrl: body.voidCheckUrl,
                driverLicenseUrl: body.driverLicenseUrl,
                feinLetterUrl: body.feinLetterUrl
            }
        })

        return NextResponse.json(updatedFranchisor)

    } catch (error) {
        console.error('Error updating franchisor:', error)
        return NextResponse.json(
            { error: 'Failed to update franchisor' },
            { status: 500 }
        )
    }
}
