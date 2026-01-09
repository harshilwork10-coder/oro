
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found in this database' }, { status: 404 })
        }

        const updated = await prisma.user.update({
            where: { email },
            data: { role: 'PROVIDER' }
        })

        return NextResponse.json({
            success: true,
            message: `User ${updated.email} is now a ${updated.role} (Admin).`,
            nextStep: 'Please logout and login again to see all data.'
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
