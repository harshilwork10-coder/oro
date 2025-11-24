import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { userId, password } = body

        if (!userId || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
        }

        // Hash new password
        const hashedPassword = await hash(password, 10)

        // Update user password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        })

        return NextResponse.json({
            success: true,
            message: 'Password set successfully'
        })
    } catch (error) {
        console.error('Error setting password:', error)
        return NextResponse.json(
            { error: 'Failed to set password' },
            { status: 500 }
        )
    }
}
