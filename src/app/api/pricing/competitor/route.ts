import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Simulated competitor pricing data by ZIP code
// In production, this would integrate with web scraping APIs or pricing aggregators
type CompetitorPrice = {
    store: string
    storeType: 'LIQUOR' | 'GROCERY' | 'CONVENIENCE' | 'BIG_BOX'
    price: number
    distance: string
    lastUpdated: string
}

type ProductPricing = {
    productName: string
    upc: string
    yourPrice: number
    suggestedPrice: number
    competitors: CompetitorPrice[]
    marketAverage: number
    pricePosition: 'LOW' | 'AVERAGE' | 'HIGH'
}

// Simulated ZIP database - prices vary by region
const ZIP_REGIONS: Record<string, 'MIDWEST' | 'EAST_COAST' | 'WEST_COAST' | 'SOUTH' | 'MOUNTAIN'> = {
    '60': 'MIDWEST',    // Chicago area
    '10': 'EAST_COAST', // NYC area
    '90': 'WEST_COAST', // LA area
    '30': 'SOUTH',      // Atlanta area
    '80': 'MOUNTAIN',   // Denver area
}

// Base prices by product, adjusted by region
const BASE_COMPETITOR_DATA: Record<string, {
    name: string
    basePrice: number
    competitors: { name: string; type: 'LIQUOR' | 'GROCERY' | 'CONVENIENCE' | 'BIG_BOX'; priceMultiplier: number }[]
}> = {
    '088004000127': {
        name: 'Jack Daniels Old No. 7 750ml',
        basePrice: 28.99,
        competitors: [
            { name: "Binny's Beverage Depot", type: 'LIQUOR', priceMultiplier: 0.95 },
            { name: 'Total Wine & More', type: 'LIQUOR', priceMultiplier: 0.92 },
            { name: 'Walmart', type: 'BIG_BOX', priceMultiplier: 0.98 },
            { name: '7-Eleven', type: 'CONVENIENCE', priceMultiplier: 1.15 },
            { name: 'Mariano\'s', type: 'GROCERY', priceMultiplier: 1.02 },
        ]
    },
    '083664869411': {
        name: 'Titos Handmade Vodka 750ml',
        basePrice: 23.99,
        competitors: [
            { name: "Binny's Beverage Depot", type: 'LIQUOR', priceMultiplier: 0.94 },
            { name: 'Total Wine & More', type: 'LIQUOR', priceMultiplier: 0.90 },
            { name: 'Costco', type: 'BIG_BOX', priceMultiplier: 0.85 },
            { name: 'Jewel-Osco', type: 'GROCERY', priceMultiplier: 1.00 },
            { name: 'Walgreens', type: 'CONVENIENCE', priceMultiplier: 1.08 },
        ]
    },
    '087000001022': {
        name: 'Crown Royal 750ml',
        basePrice: 31.99,
        competitors: [
            { name: "Binny's Beverage Depot", type: 'LIQUOR', priceMultiplier: 0.93 },
            { name: 'Total Wine & More', type: 'LIQUOR', priceMultiplier: 0.91 },
            { name: 'Target', type: 'BIG_BOX', priceMultiplier: 0.99 },
            { name: '7-Eleven', type: 'CONVENIENCE', priceMultiplier: 1.12 },
        ]
    },
    '012000000017': {
        name: 'Budweiser 6-Pack',
        basePrice: 9.99,
        competitors: [
            { name: 'Walmart', type: 'BIG_BOX', priceMultiplier: 0.95 },
            { name: '7-Eleven', type: 'CONVENIENCE', priceMultiplier: 1.20 },
            { name: 'CVS', type: 'CONVENIENCE', priceMultiplier: 1.15 },
            { name: 'Kroger', type: 'GROCERY', priceMultiplier: 1.00 },
            { name: "Tony's Fresh Market", type: 'GROCERY', priceMultiplier: 1.05 },
        ]
    },
    '076183000014': {
        name: 'Corona Extra 6-Pack',
        basePrice: 12.99,
        competitors: [
            { name: "Binny's Beverage Depot", type: 'LIQUOR', priceMultiplier: 0.96 },
            { name: 'Costco (12pk)', type: 'BIG_BOX', priceMultiplier: 0.80 },
            { name: '7-Eleven', type: 'CONVENIENCE', priceMultiplier: 1.18 },
            { name: 'Mariano\'s', type: 'GROCERY', priceMultiplier: 1.02 },
        ]
    },
    '080480000177': {
        name: 'Patron Silver Tequila 750ml',
        basePrice: 47.99,
        competitors: [
            { name: "Binny's Beverage Depot", type: 'LIQUOR', priceMultiplier: 0.92 },
            { name: 'Total Wine & More', type: 'LIQUOR', priceMultiplier: 0.89 },
            { name: 'Costco', type: 'BIG_BOX', priceMultiplier: 0.85 },
            { name: 'Mariano\'s', type: 'GROCERY', priceMultiplier: 0.98 },
        ]
    },
}

// Regional price adjustments
const REGION_MULTIPLIERS: Record<string, number> = {
    'MIDWEST': 1.00,
    'EAST_COAST': 1.12,
    'WEST_COAST': 1.08,
    'SOUTH': 0.95,
    'MOUNTAIN': 1.02,
}

function getRegionFromZip(zip: string): string {
    const prefix = zip.substring(0, 2)
    return ZIP_REGIONS[prefix] || 'MIDWEST'
}

function generateCompetitorPrices(upc: string, zip: string, yourPrice?: number): ProductPricing | null {
    const productData = BASE_COMPETITOR_DATA[upc]
    if (!productData) return null

    const region = getRegionFromZip(zip)
    const regionMultiplier = REGION_MULTIPLIERS[region] || 1.0
    const basePrice = productData.basePrice * regionMultiplier

    // Generate competitor prices
    const competitors: CompetitorPrice[] = productData.competitors.map(comp => ({
        store: comp.name,
        storeType: comp.type,
        price: Math.round(basePrice * comp.priceMultiplier * 100) / 100,
        distance: `${(Math.random() * 5 + 0.5).toFixed(1)} mi`,
        lastUpdated: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }))

    // Sort by price
    competitors.sort((a, b) => a.price - b.price)

    const marketAverage = competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length
    const actualYourPrice = yourPrice || basePrice

    // Determine price position
    let pricePosition: 'LOW' | 'AVERAGE' | 'HIGH'
    if (actualYourPrice < marketAverage * 0.97) pricePosition = 'LOW'
    else if (actualYourPrice > marketAverage * 1.03) pricePosition = 'HIGH'
    else pricePosition = 'AVERAGE'

    // Suggest optimal price (10% above lowest competitor, not exceeding market avg + 5%)
    const lowestPrice = competitors[0]?.price || basePrice
    const suggestedPrice = Math.min(
        lowestPrice * 1.10,
        marketAverage * 1.05
    )

    return {
        productName: productData.name,
        upc,
        yourPrice: actualYourPrice,
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        competitors,
        marketAverage: Math.round(marketAverage * 100) / 100,
        pricePosition
    }
}

// GET - Get competitor pricing for a product by ZIP code
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const upc = searchParams.get('upc')?.replace(/\D/g, '')
        const zip = searchParams.get('zip') || '60601' // Default to Chicago
        const yourPrice = searchParams.get('yourPrice') ? parseFloat(searchParams.get('yourPrice')!) : undefined

        if (!upc) {
            return NextResponse.json({ error: 'UPC required' }, { status: 400 })
        }

        const pricing = generateCompetitorPrices(upc, zip, yourPrice)

        if (!pricing) {
            return NextResponse.json({
                found: false,
                message: 'Product not in competitor database',
                availableProducts: Object.keys(BASE_COMPETITOR_DATA)
            })
        }

        return NextResponse.json({
            found: true,
            region: getRegionFromZip(zip),
            zip,
            ...pricing
        })

    } catch (error) {
        console.error('[COMPETITOR_PRICING]', error)
        return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 })
    }
}

