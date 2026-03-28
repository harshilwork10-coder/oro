import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
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
            return NextResponse.json({ error: 'Only Brand Franchisors can invite sub-franchisees.' }, { status: 403 })
        }

        const body = await req.json()
        const { name, email, phone, permissions } = body

        if (!name || !email) {
            return NextResponse.json({ error: 'Name and Email are required.' }, { status: 400 })
        }

        // Check for existing sub-franchisee
        const existing = await prisma.subFranchisee.findUnique({
            where: { email }
        })

        if (existing) {
            return NextResponse.json({ error: 'A sub-franchisee with this email already exists.' }, { status: 400 })
        }

        // Create SubFranchisee
        const subFranchisee = await prisma.subFranchisee.create({
            data: {
                franchisorId: franchisor.id,
                name,
                email,
                phone,
                permissions: permissions ? JSON.stringify(permissions) : null,
                status: 'PENDING',
                invitedAt: new Date(),
            }
        })

        // TODO: Send email invitation (Mock for now)
        // Debug log removed

        return NextResponse.json(subFranchisee)

    } catch (error) {
        console.error('Error inviting sub-franchisee:', error)
        return NextResponse.json(
            { error: 'Failed to invite sub-franchisee' },
            { status: 500 }
        )
    }
}
