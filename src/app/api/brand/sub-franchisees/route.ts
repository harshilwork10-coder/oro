import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify Brand Franchisor
        const franchisor = await prisma.franchisor.findFirst({
            where: { ownerId: user.id },
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
                        image: true
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
