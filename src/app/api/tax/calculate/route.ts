import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ML per gallon for conversions
const ML_PER_GALLON = 3785.41

interface CartItem {
    productId: string
    quantity: number
    price: number
    // Product attributes (optional - will be looked up if not provided)
    alcoholType?: string
    volumeMl?: number
    abvPercent?: number
}

interface TaxBreakdown {
    salesTax: number
    exciseTax: number
    totalTax: number
    details: {
        jurisdictionName: string
        type: string
        salesTaxAmount: number
        exciseTaxAmount: number
        exciseDetails?: {
            productType: string
            rate: number
            units: number
            amount: number
        }[]
    }[]
}

// POST - Calculate taxes for a cart
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = session.user as any
        if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        const body = await request.json()
        const { locationId, items, subtotal } = body as {
            locationId: string
            items: CartItem[]
            subtotal: number
        }

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
        }

        // Get jurisdictions for this location with their excise rules
        const locationJurisdictions = await prisma.locationTaxJurisdiction.findMany({
            where: {
                locationId,
                isActive: true
            },
            include: {
                jurisdiction: {
                    include: {
                        exciseTaxRules: {
                            where: { isActive: true }
                        }
                    }
                }
            }
        })

        // Get product details for items that need them
        const productIds = items.map(i => i.productId)
        const products = await prisma.product.findMany({
            where: {
                id: { in: productIds },
                franchiseId: user.franchiseId
            },
            select: {
                id: true,
                alcoholType: true,
                volumeMl: true,
                abvPercent: true
            }
        })

        const productMap = new Map(products.map(p => [p.id, p]))

        // Calculate taxes
        let totalSalesTax = 0
        let totalExciseTax = 0
        const details: TaxBreakdown['details'] = []

        for (const locJur of locationJurisdictions) {
            const jur = locJur.jurisdiction
            if (!jur.isActive) continue

            // 1. Calculate sales tax (percentage of subtotal)
            const salesTaxAmount = subtotal * (Number(jur.salesTaxRate) / 100)
            totalSalesTax += salesTaxAmount

            // 2. Calculate excise taxes (per-unit)
            let jurisdictionExcise = 0
            const exciseDetails: TaxBreakdown['details'][0]['exciseDetails'] = []

            for (const item of items) {
                const product = productMap.get(item.productId)
                if (!product) continue

                const alcoholType = item.alcoholType || (product.alcoholType as string)
                const volumeMl = item.volumeMl || (product.volumeMl as number)

                if (!alcoholType || alcoholType === 'NONE' || !volumeMl) continue

                // Find matching excise rule
                let matchingRule = jur.exciseTaxRules.find(r => r.productType === alcoholType)

                // For wine, check ABV thresholds
                if (!matchingRule && (alcoholType === 'WINE_LIGHT' || alcoholType === 'WINE_HEAVY')) {
                    const abv = item.abvPercent || Number(product.abvPercent) || 0
                    matchingRule = jur.exciseTaxRules.find(r => {
                        if (!r.productType.startsWith('WINE')) return false
                        const minAbv = Number(r.minAbv) || 0
                        const maxAbv = Number(r.maxAbv) || 100
                        return abv >= minAbv && abv <= maxAbv
                    })
                }

                if (!matchingRule || !matchingRule.ratePerGallon) continue

                // Calculate excise: (volume in ml / ml per gallon) * rate * quantity
                const gallons = volumeMl / ML_PER_GALLON
                const ratePerGallon = Number(matchingRule.ratePerGallon)
                const exciseAmount = gallons * ratePerGallon * item.quantity

                jurisdictionExcise += exciseAmount

                exciseDetails.push({
                    productType: alcoholType,
                    rate: ratePerGallon,
                    units: item.quantity,
                    amount: Math.round(exciseAmount * 100) / 100
                })
            }

            totalExciseTax += jurisdictionExcise

            details.push({
                jurisdictionName: jur.name,
                type: jur.type,
                salesTaxAmount: Math.round(salesTaxAmount * 100) / 100,
                exciseTaxAmount: Math.round(jurisdictionExcise * 100) / 100,
                exciseDetails: exciseDetails.length > 0 ? exciseDetails : undefined
            })
        }

        const result: TaxBreakdown = {
            salesTax: Math.round(totalSalesTax * 100) / 100,
            exciseTax: Math.round(totalExciseTax * 100) / 100,
            totalTax: Math.round((totalSalesTax + totalExciseTax) * 100) / 100,
            details
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('[TAX_CALCULATE_POST]', error)
        return NextResponse.json({ error: 'Failed to calculate taxes' }, { status: 500 })
    }
}
