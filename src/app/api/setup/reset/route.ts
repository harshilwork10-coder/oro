import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

// One-time password reset - DELETE AFTER USE!
export async function POST(request: NextRequest) {
    try {
        const { secret, email, newPassword } = await request.json()

        if (secret !== 'oro-reset-2025') {
            return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
        }

        if (!email || !newPassword) {
            return NextResponse.json({ error: 'Email and newPassword required' }, { status: 400 })
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Update password
        const hashedPassword = await hash(newPassword, 10)
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        })

        return NextResponse.json({
            success: true,
            message: `Password reset for ${email}`,
            user: { email: user.email, name: user.name, role: user.role }
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// GET to list users (emails only)
export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: { email: true, name: true, role: true }
        })
        return NextResponse.json({ users })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
