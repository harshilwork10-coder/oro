import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

// SECURITY: Only allow seeding in development environment
export async function GET() {
    // CRITICAL SECURITY: Block in production
    if (process.env.NODE_ENV === 'production') {
        console.warn('[SECURITY] Attempted to access seed endpoint in production!')
        return NextResponse.json(
            { error: 'This endpoint is disabled in production' },
            { status: 403 }
        )
    }

    // Additional check for NEXTAUTH_URL to detect production
    const baseUrl = process.env.NEXTAUTH_URL || ''
    if (baseUrl.includes('https://') && !baseUrl.includes('localhost')) {
        console.warn('[SECURITY] Attempted to access seed endpoint on production URL!')
        return NextResponse.json(
            { error: 'This endpoint is disabled in production' },
            { status: 403 }
        )
    }

    try {
        console.log('🧹 Deleting all existing data...')

        // Get all table names and delete in order (SQLite)
        const tables = await prisma.$queryRaw<{ name: string }[]>`
            SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'
        `

        // Disable foreign key checks temporarily
        await prisma.$executeRaw`PRAGMA foreign_keys = OFF`

        // Delete from all tables
        for (const table of tables) {
            try {
                await prisma.$executeRawUnsafe(`DELETE FROM "${table.name}"`)
            } catch (e) {
                // Ignore if table doesn't exist or is empty
            }
        }

        // Re-enable foreign key checks
        await prisma.$executeRaw`PRAGMA foreign_keys = ON`

        console.log('🌱 Creating provider user...')

        const hashedPassword = await hash('password123', 10)

        // Create Provider only
        await prisma.user.create({
            data: {
                name: 'Platform Admin',
                email: 'provider@oronex.com',
                password: hashedPassword,
                pin: await hash('1111', 10),
                role: 'PROVIDER'
            }
        })

        return NextResponse.json({ success: true, message: 'Database reset - Provider user created' })
    } catch (error) {
        console.error('Seed error:', error)
        return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
    }
}
