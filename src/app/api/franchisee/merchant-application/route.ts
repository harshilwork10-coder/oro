import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'User is not associated with a franchise' }, { status: 400 })
        }

        const body = await request.json()
        const {
            storeName,
            storeAddress,
            ownerName,
            ownerPhone,
            ownerSSN,
            voidedCheckPath,
            driverLicensePath,
            feinLetterPath,
            businessLicensePath
        } = body

        if (!storeName || !storeAddress || !ownerName || !ownerPhone || !ownerSSN) {
            return NextResponse.json({ error: 'All required fields must be provided' }, { status: 400 })
        }

        // Check if user already has a pending/approved application
        const existing = await prisma.merchantApplication.findFirst({
            where: {
                franchiseId: user.franchiseId,
                status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] }
            }
        })

        if (existing) {
            return NextResponse.json({ error: 'You already have an active application' }, { status: 400 })
        }

        const application = await prisma.merchantApplication.create({
            data: {
                franchiseId: user.franchiseId,
                storeName,
                storeAddress,
                ownerName,
                ownerPhone,
                ownerSSN,
                voidedCheckPath,
                driverLicensePath,
                feinLetterPath,
                businessLicensePath,
                status: 'PENDING'
            }
        })

        return NextResponse.json(application)
    } catch (error) {
        console.error('Error creating merchant application:', error)
        return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'User is not associated with a franchise' }, { status: 400 })
        }

        const application = await prisma.merchantApplication.findFirst({
            where: {
                franchiseId: user.franchiseId
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json(application)
    } catch (error) {
        console.error('Error fetching merchant application:', error)
        return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 })
    }
}
