import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch franchise settings
export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 404 })
        }

        // Get franchise with franchisor
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: { franchisor: true }
        })

        // Get or create settings
        let settings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId: user.franchiseId }
        })

        if (!settings) {
            // Create default settings with STANDARD pricing
            settings = await prisma.franchiseSettings.create({
                data: {
                    franchiseId: user.franchiseId,
                    pricingModel: 'STANDARD',
                    cardSurchargeType: 'PERCENTAGE',
                    cardSurcharge: 3.99,
                    showDualPricing: false
                }
            })
        }

        // Get tip and payment settings from BusinessConfig
        let configSettings = null
        if (franchise?.franchisorId) {
            configSettings = await prisma.businessConfig.findUnique({
                where: { franchisorId: franchise.franchisorId },
                select: {
                    tipPromptEnabled: true,
                    tipType: true,
                    tipSuggestions: true,
                    acceptsEbt: true,
                    acceptsChecks: true,
                    acceptsOnAccount: true
                }
            })
        }

        // Merge settings
        return NextResponse.json({
            ...settings,
            tipPromptEnabled: configSettings?.tipPromptEnabled ?? true,
            tipType: configSettings?.tipType ?? 'PERCENT',
            tipSuggestions: configSettings?.tipSuggestions ?? '[15,20,25]',
            acceptsEbt: configSettings?.acceptsEbt ?? false,
            acceptsChecks: configSettings?.acceptsChecks ?? false,
            acceptsOnAccount: configSettings?.acceptsOnAccount ?? false
        })
    } catch (error) {
        console.error('Error fetching franchise settings:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}

// POST: Update franchise settings
export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise found' }, { status: 404 })
        }

        const body = await request.json()
        const {
            pricingModel,
            cardSurchargeType,
            cardSurcharge,
            showDualPricing,
            tipPromptEnabled,
            tipType,
            tipSuggestions,
            acceptsEbt,
            acceptsChecks,
            acceptsOnAccount
        } = body

        const settings = await prisma.franchiseSettings.upsert({
            where: { franchiseId: user.franchiseId },
            update: {
                pricingModel,
                cardSurchargeType,
                cardSurcharge,
                showDualPricing: showDualPricing ?? (pricingModel === 'DUAL_PRICING')
            },
            create: {
                franchiseId: user.franchiseId,
                pricingModel,
                cardSurchargeType,
                cardSurcharge,
                showDualPricing: showDualPricing ?? (pricingModel === 'DUAL_PRICING')
            }
        })

        // Also update tip and payment settings in BusinessConfig if user's franchisor has one
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            include: { franchisor: true }
        })

        if (franchise?.franchisorId) {
            await prisma.businessConfig.upsert({
                where: { franchisorId: franchise.franchisorId },
                update: {
                    tipPromptEnabled: tipPromptEnabled ?? true,
                    tipType: tipType || 'PERCENT',
                    tipSuggestions: tipSuggestions || '[15,20,25]',
                    acceptsEbt: acceptsEbt ?? false,
                    acceptsChecks: acceptsChecks ?? false,
                    acceptsOnAccount: acceptsOnAccount ?? false
                },
                create: {
                    franchisorId: franchise.franchisorId,
                    tipPromptEnabled: tipPromptEnabled ?? true,
                    tipType: tipType || 'PERCENT',
                    tipSuggestions: tipSuggestions || '[15,20,25]',
                    acceptsEbt: acceptsEbt ?? false,
                    acceptsChecks: acceptsChecks ?? false,
                    acceptsOnAccount: acceptsOnAccount ?? false
                }
            })
        }

        return NextResponse.json(settings)
    } catch (error) {
        console.error('Error updating franchise settings:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
