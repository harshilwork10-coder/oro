import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { voidCheckUrl, driverLicenseUrl, feinLetterUrl } = body

        // Find franchisor linked to user
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: user.id }
        })

        if (!franchisor) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Update fields if provided
        await prisma.franchisor.update({
            where: { id: franchisor.id },
            data: {
                ...(voidCheckUrl && { voidCheckUrl }),
                ...(driverLicenseUrl && { driverLicenseUrl }),
                ...(feinLetterUrl && { feinLetterUrl })
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error updating docs:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

