import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pos/tax-profile
 * Returns the complete tax profile for the user's location:
 * - All active tax jurisdictions (state, county, city, RTA, etc.)
 * - Excise tax rules (per-gallon, per-unit, per-oz)
 * - Fallback: single flat rate from FranchiseSettings if no jurisdictions configured
 * 
 * Called once on POS page load, cached client-side for the session.
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
if (!user.franchiseId) {
            return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
        }

        // Find the user's location (first active location for this franchise)
        const location = await prisma.location.findFirst({
            where: {
                franchiseId: user.franchiseId
            },
            select: { id: true }
        })

        if (!location) {
            // No location — return empty profile with fallback behavior
            return NextResponse.json({
                jurisdictions: [],
                fallbackTaxRate: 0.0825,
                hasMultiTax: false
            })
        }

        // Get all active tax jurisdictions for this location
        const locationJurisdictions = await prisma.locationTaxJurisdiction.findMany({
            where: {
                locationId: location.id,
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
            },
            orderBy: { priority: 'asc' }
        })

        // Get the franchise settings for fallback
        const franchiseSettings = await prisma.franchiseSettings.findUnique({
            where: { franchiseId: user.franchiseId },
            select: { taxRate: true }
        })

        const fallbackTaxRate = franchiseSettings?.taxRate
            ? parseFloat(franchiseSettings.taxRate.toString())
            : 0.0825

        if (locationJurisdictions.length === 0) {
            // No jurisdictions configured — return single flat rate
            return NextResponse.json({
                jurisdictions: [],
                fallbackTaxRate,
                hasMultiTax: false
            })
        }

        // Build tax profile with jurisdictions and excise rules
        const jurisdictions = locationJurisdictions.map(lj => {
            const j = lj.jurisdiction
            return {
                id: j.id,
                name: lj.displayName || j.name,
                type: j.type, // STATE, COUNTY, CITY, DISTRICT
                salesTaxRate: parseFloat(j.salesTaxRate.toString()), // e.g., 6.25 for 6.25%
                priority: lj.priority,
                exciseRules: j.exciseTaxRules.map(r => ({
                    id: r.id,
                    productType: r.productType, // BEER, WINE_LIGHT, WINE_HEAVY, SPIRITS, TOBACCO_PACK, TOBACCO_CARTON
                    ratePerGallon: r.ratePerGallon ? parseFloat(r.ratePerGallon.toString()) : null,
                    ratePerUnit: r.ratePerUnit ? parseFloat(r.ratePerUnit.toString()) : null,
                    ratePerOz: r.ratePerOz ? parseFloat(r.ratePerOz.toString()) : null,
                    minAbv: r.minAbv ? parseFloat(r.minAbv.toString()) : null,
                    maxAbv: r.maxAbv ? parseFloat(r.maxAbv.toString()) : null,
                }))
            }
        })

        // Total combined sales tax rate (sum of all jurisdictions)
        const combinedSalesTaxRate = jurisdictions.reduce((sum, j) => sum + j.salesTaxRate, 0)

        return NextResponse.json({
            jurisdictions,
            combinedSalesTaxRate, // e.g., 10.25 = state 6.25 + county 1.75 + city 1.25 + RTA 1.00
            fallbackTaxRate,
            hasMultiTax: true
        })

    } catch (error) {
        console.error('[TAX_PROFILE_GET]', error)
        return NextResponse.json({ error: 'Failed to load tax profile' }, { status: 500 })
    }
}
