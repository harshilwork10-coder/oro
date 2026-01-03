import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

// One-time setup endpoint to create initial provider user
// DELETE THIS FILE AFTER FIRST USE!
export async function POST(request: NextRequest) {
    try {
        // Check for setup secret
        const { secret, email, password, name } = await request.json()

        // Require a secret to prevent unauthorized access
        if (secret !== process.env.SETUP_SECRET && secret !== 'oro-initial-setup-2025') {
            return NextResponse.json({ error: 'Invalid setup secret' }, { status: 401 })
        }

        // Check if any users exist
        const userCount = await prisma.user.count()
        if (userCount > 0) {
            return NextResponse.json({
                error: 'Setup already completed. Users exist in database.',
                userCount
            }, { status: 400 })
        }

        // Create Provider user
        const hashedPassword = await hash(password || 'Admin@123', 10)
        const hashedPin = await hash('1111', 10)

        const provider = await prisma.user.create({
            data: {
                name: name || 'Platform Admin',
                email: email || 'provider@oronext.com',
                password: hashedPassword,
                pin: hashedPin,
                role: 'PROVIDER'
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Initial setup complete! You can now log in.',
            user: {
                id: provider.id,
                email: provider.email,
                name: provider.name,
                role: provider.role
            }
        })
    } catch (error: any) {
        console.error('Setup error:', error)
        return NextResponse.json({
            error: 'Setup failed',
            details: error.message
        }, { status: 500 })
    }
}

// GET to check setup status
export async function GET() {
    try {
        const userCount = await prisma.user.count()
        return NextResponse.json({
            setupRequired: userCount === 0,
            userCount
        })
    } catch (error: any) {
        return NextResponse.json({
            error: 'Database connection failed',
            details: error.message,
            hint: 'Make sure DATABASE_URL is set correctly in Vercel'
        }, { status: 500 })
    }
}
