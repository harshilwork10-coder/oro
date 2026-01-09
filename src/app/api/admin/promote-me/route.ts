
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const email = searchParams.get('email')
        const secret = searchParams.get('secret')

        // Simple protection
        if (secret !== 'super-secret-admin-fix') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!email) {
            return NextResponse.json({ error: 'Email required' }, { status: 400 })
        }

        // Hash a default password (e.g. "password")
        const hashedPassword = await hash('password', 10)

        // UPSERT: Create if doesn't exist, Update if does
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                role: 'PROVIDER'
            },
            create: {
                email,
                name: 'Admin User',
                role: 'PROVIDER',
                password: hashedPassword,
                // Add required default fields if any
            }
        })

        return NextResponse.json({
            success: true,
            message: `User ${user.email} is now a ${user.role} (Admin).`,
            details: user.createdAt === user.updatedAt ? 'Account was RE-CREATED.' : 'Account was UPDATED.',
            nextStep: 'Please logout and login again (Password if reset: "password").'
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
