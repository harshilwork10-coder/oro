import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Emergency schema fix - DELETE AFTER USE!
export async function POST(request: NextRequest) {
    try {
        const { secret } = await request.json()

        if (secret !== 'oro-fix-2025') {
            return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
        }

        console.log('🔧 Attempting to fix schema manually...')

        // Check if column exists first (PostgreSQL specific query)
        const checkColumn = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'User' AND column_name = 'pulseLocationIds';
        `

        // @ts-ignore
        if (checkColumn.length > 0) {
            return NextResponse.json({ message: 'Column pulseLocationIds already exists.' })
        }

        // Add the missing column
        await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "pulseLocationIds" TEXT;`)

        return NextResponse.json({
            success: true,
            message: 'Successfully added pulseLocationIds column to User table.'
        })
    } catch (error: any) {
        console.error('Schema fix error:', error)
        return NextResponse.json({
            error: 'Failed to fix schema',
            details: error.message
        }, { status: 500 })
    }
}
