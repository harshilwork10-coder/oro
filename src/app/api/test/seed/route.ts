import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'

export async function GET() {
    try {
        console.log('🌱 Starting database seed via API...')

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
                // Note: providerRole and providerPermissions removed - not in schema
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
                    // Note: supportFee removed - not in schema
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

        return NextResponse.json({ success: true, message: 'Database seeded successfully' })
    } catch (error) {
        console.error('Seed error:', error)
        return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
    }
}
