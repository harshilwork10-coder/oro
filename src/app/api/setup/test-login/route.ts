import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { compareSync, hashSync } from 'bcryptjs'

// Debug login - DELETE AFTER USE!
export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json()

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true, role: true, password: true }
        })

        if (!user) {
            return NextResponse.json({
                error: 'User not found',
                email
            }, { status: 404 })
        }

        // Check password
        const isValid = user.password ? compareSync(password, user.password) : false

        // Also show what the hash would be
        const testHash = hashSync(password, 10)

        return NextResponse.json({
            userFound: true,
            email: user.email,
            name: user.name,
            role: user.role,
            hasPassword: !!user.password,
            passwordHashLength: user.password?.length || 0,
            passwordValid: isValid,
            testHashSample: testHash.substring(0, 20) + '...',
            storedHashSample: user.password ? user.password.substring(0, 20) + '...' : null,
            message: isValid ? 'Password is correct! Login should work.' : 'Password does NOT match!'
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
