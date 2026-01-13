import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify Brand Franchisor
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: session.user.id },
            select: { id: true, businessType: true }
        })

        if (!franchisor || franchisor.businessType !== 'BRAND_FRANCHISOR') {
            return NextResponse.json({ error: 'Only Brand Franchisors can view sub-franchisees.' }, { status: 403 })
        }

        const subFranchisees = await prisma.subFranchisee.findMany({
            where: { franchisorId: franchisor.id },
            include: {
                franchises: true, // Locations managed
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                        lastLogin: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(subFranchisees)

    } catch (error) {
        console.error('Error fetching sub-franchisees:', error)
        return NextResponse.json(
            { error: 'Failed to fetch sub-franchisees' },
            { status: 500 }
        )
    }
}
