import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/tobacco-scan/manufacturer-config - Get manufacturer configs
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const configs = await prisma.manufacturerConfig.findMany({
            where: { franchiseId: session.user.franchiseId }
        })

        // Return configs with masked API keys
        const maskedConfigs = configs.map((config: { apiKey: string | null; apiSecret: string | null; id: string; franchiseId: string; manufacturer: string; storeId: string | null; accountNumber: string | null; portalUrl: string | null; rebatePerPack: any; rebatePerCarton: any; loyaltyBonus: any; isActive: boolean; lastSyncAt: Date | null; createdAt: Date; updatedAt: Date }) => ({
            ...config,
            apiKey: config.apiKey ? '••••••••' : null,
            apiSecret: config.apiSecret ? '••••••••' : null
        }))

        return NextResponse.json({ configs: maskedConfigs })
    } catch (error) {
        console.error('Failed to fetch manufacturer configs:', error)
        return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 })
    }
}

// POST /api/tobacco-scan/manufacturer-config - Create or update manufacturer config
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            manufacturer,
            storeId,
            accountNumber,
            apiKey,
            apiSecret,
            portalUrl,
            rebatePerPack,
            rebatePerCarton,
            loyaltyBonus
        } = body

        if (!manufacturer) {
            return NextResponse.json({ error: 'Manufacturer is required' }, { status: 400 })
        }

        const config = await prisma.manufacturerConfig.upsert({
            where: {
                franchiseId_manufacturer: {
                    franchiseId: session.user.franchiseId,
                    manufacturer
                }
            },
            update: {
                storeId: storeId || undefined,
                accountNumber: accountNumber || undefined,
                apiKey: apiKey && apiKey !== '••••••••' ? apiKey : undefined,
                apiSecret: apiSecret && apiSecret !== '••••••••' ? apiSecret : undefined,
                portalUrl: portalUrl || undefined,
                rebatePerPack: rebatePerPack ?? 0.04,
                rebatePerCarton: rebatePerCarton ?? 0.40,
                loyaltyBonus: loyaltyBonus ?? 0
            },
            create: {
                franchiseId: session.user.franchiseId,
                manufacturer,
                storeId: storeId || null,
                accountNumber: accountNumber || null,
                apiKey: apiKey || null,
                apiSecret: apiSecret || null,
                portalUrl: portalUrl || null,
                rebatePerPack: rebatePerPack ?? 0.04,
                rebatePerCarton: rebatePerCarton ?? 0.40,
                loyaltyBonus: loyaltyBonus ?? 0
            }
        })

        return NextResponse.json({
            config: {
                ...config,
                apiKey: config.apiKey ? '••••••••' : null,
                apiSecret: config.apiSecret ? '••••••••' : null
            }
        })
    } catch (error) {
        console.error('Failed to update manufacturer config:', error)
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }
}

