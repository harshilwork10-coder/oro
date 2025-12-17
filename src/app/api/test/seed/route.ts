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
        console.log('🌱 Starting database seed via API (DEVELOPMENT ONLY)...')

        const hashedPassword = await hash('password123', 10)

        // Create Provider
        await prisma.user.upsert({
            where: { email: 'provider@aura.com' },
            update: {},
            create: {
                name: 'Platform Admin',
                email: 'provider@aura.com',
                password: hashedPassword,
                pin: await hash('1111', 10),
                role: 'PROVIDER'
            }
        })

        // Create Test Franchisor Owner
        const franchisorUser = await prisma.user.upsert({
            where: { email: 'franchisor@test.com' },
            update: {},
            create: {
                name: 'Test Owner',
                email: 'franchisor@test.com',
                password: hashedPassword,
                role: 'FRANCHISOR'
            }
        })

        // Create Test Franchisor Company
        let franchisor = await prisma.franchisor.findFirst({ where: { ownerId: franchisorUser.id } })
        if (!franchisor) {
            franchisor = await prisma.franchisor.create({
                data: {
                    name: 'Tesla Style Franchise',
                    ownerId: franchisorUser.id
                }
            })
        }

        // Create Test Franchise
        let franchise = await prisma.franchise.findFirst({ where: { franchisorId: franchisor.id } })
        if (!franchise) {
            franchise = await prisma.franchise.create({
                data: {
                    name: 'Tesla Style Franchise HQ',
                    slug: 'tesla-hq',
                    franchisorId: franchisor.id
                }
            })
        }

        // Create Test Location
        const location = await prisma.location.findFirst({ where: { franchiseId: franchise.id, name: 'Downtown Test Store' } })
        if (!location) {
            await prisma.location.create({
                data: {
                    name: 'Downtown Test Store',
                    slug: 'downtown-store',
                    franchiseId: franchise.id,
                    address: '123 Test St, Tech City, CA 90210'
                }
            })
        }

        return NextResponse.json({ success: true, message: 'Database seeded successfully (dev only)' })
    } catch (error) {
        console.error('Seed error:', error)
        return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
    }
}
