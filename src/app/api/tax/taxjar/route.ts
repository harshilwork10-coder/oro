import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// TaxJar API Integration
// Docs: https://developers.taxjar.com/api/reference/

const TAXJAR_API_KEY = process.env.TAXJAR_API_KEY
const TAXJAR_API_URL = 'https://api.taxjar.com/v2'

interface TaxJarRateResponse {
    rate: {
        zip: string
        state: string
        state_rate: number
        county: string
        county_rate: number
        city: string
        city_rate: number
        combined_district_rate: number
        combined_rate: number
        freight_taxable: boolean
    }
}

interface TaxJarError {
    status: number
    error: string
    detail: string
}

// Get tax rate from TaxJar API
async function getTaxJarRate(zip: string, city?: string, street?: string): Promise<{
    success: boolean
    source: 'taxjar' | 'fallback'
    data?: {
        zip: string
        state: string
        stateRate: number
        county: string
        countyRate: number
        city: string
        cityRate: number
        combinedRate: number
        freightTaxable: boolean
    }
    error?: string
}> {
    if (!TAXJAR_API_KEY) {
        return {
            success: false,
            source: 'fallback',
            error: 'TaxJar API key not configured. Add TAXJAR_API_KEY to .env'
        }
    }

    try {
        // Build query params
        const params = new URLSearchParams({ zip })
        if (city) params.append('city', city)
        if (street) params.append('street', street)
        params.append('country', 'US')

        const response = await fetch(`${TAXJAR_API_URL}/rates/${zip}?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${TAXJAR_API_KEY}`,
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            const errorData = await response.json() as TaxJarError
            return {
                success: false,
                source: 'fallback',
                error: errorData.detail || errorData.error || 'TaxJar API error'
            }
        }

        const data = await response.json() as TaxJarRateResponse

        return {
            success: true,
            source: 'taxjar',
            data: {
                zip: data.rate.zip,
                state: data.rate.state,
                stateRate: data.rate.state_rate * 100,
                county: data.rate.county,
                countyRate: data.rate.county_rate * 100,
                city: data.rate.city,
                cityRate: data.rate.city_rate * 100,
                combinedRate: data.rate.combined_rate * 100,
                freightTaxable: data.rate.freight_taxable
            }
        }
    } catch (error) {
        console.error('[TAXJAR_API] Error:', error)
        return {
            success: false,
            source: 'fallback',
            error: 'Failed to connect to TaxJar API'
        }
    }
}

// Calculate tax for a transaction
async function calculateTax(params: {
    fromZip: string
    toZip: string
    toCity?: string
    toStreet?: string
    amount: number
    shipping?: number
    lineItems?: Array<{
        id: string
        quantity: number
        unit_price: number
        product_tax_code?: string
    }>
}): Promise<{
    success: boolean
    tax?: {
        orderTotalAmount: number
        shipping: number
        taxableAmount: number
        amountToCollect: number
        rate: number
        hasNexus: boolean
        freightTaxable: boolean
        breakdown?: any
    }
    error?: string
}> {
    if (!TAXJAR_API_KEY) {
        return { success: false, error: 'TaxJar API key not configured' }
    }

    try {
        const response = await fetch(`${TAXJAR_API_URL}/taxes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TAXJAR_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from_country: 'US',
                from_zip: params.fromZip,
                to_country: 'US',
                to_zip: params.toZip,
                to_city: params.toCity,
                to_street: params.toStreet,
                amount: params.amount,
                shipping: params.shipping || 0,
                line_items: params.lineItems || []
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            return { success: false, error: errorData.detail || 'Tax calculation failed' }
        }

        const data = await response.json()
        return {
            success: true,
            tax: {
                orderTotalAmount: data.tax.order_total_amount,
                shipping: data.tax.shipping,
                taxableAmount: data.tax.taxable_amount,
                amountToCollect: data.tax.amount_to_collect,
                rate: data.tax.rate * 100,
                hasNexus: data.tax.has_nexus,
                freightTaxable: data.tax.freight_taxable,
                breakdown: data.tax.breakdown
            }
        }
    } catch (error) {
        console.error('[TAXJAR_CALC] Error:', error)
        return { success: false, error: 'Failed to calculate tax' }
    }
}

// TaxJar Product Tax Codes for common categories
const TAXJAR_PRODUCT_CODES = {
    // General
    GENERAL: '00000',           // Fully Taxable Product

    // Food & Beverage
    GROCERY: '40030',           // Food & Groceries (often reduced rate)
    PREPARED_FOOD: '41000',     // Prepared Food
    SOFT_DRINKS: '40050',       // Soft Drinks (Soda, bottled water)
    CANDY: '40010',             // Candy

    // Alcohol
    BEER: '50201',              // Beer
    WINE: '50202',              // Wine
    SPIRITS: '50203',           // Spirits/Liquor

    // Tobacco
    TOBACCO: '60010',           // Tobacco Products

    // Clothing
    CLOTHING: '20010',          // Clothing

    // Digital
    DIGITAL_GOODS: '31000',     // Digital Products
    SAAS: '30070',              // Software as a Service

    // Services
    SERVICES: '19000',          // Non-taxable Services
}

// GET - Get tax rate by ZIP
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const zip = searchParams.get('zip')?.replace(/\D/g, '').substring(0, 5)
        const city = searchParams.get('city') || undefined
        const street = searchParams.get('street') || undefined

        if (!zip || zip.length !== 5) {
            return NextResponse.json({ error: 'Valid 5-digit ZIP code required' }, { status: 400 })
        }

        const result = await getTaxJarRate(zip, city, street)

        if (result.success && result.data) {
            return NextResponse.json({
                success: true,
                source: 'taxjar',
                guaranteed: true,
                zip: result.data.zip,
                state: result.data.state,
                stateRate: result.data.stateRate,
                county: result.data.county,
                countyRate: result.data.countyRate,
                city: result.data.city,
                cityRate: result.data.cityRate,
                combinedRate: result.data.combinedRate,
                freightTaxable: result.data.freightTaxable,
                productCodes: TAXJAR_PRODUCT_CODES,
                disclaimer: 'Tax rate provided by TaxJar. Guaranteed accurate.'
            })
        }

        // Fallback to built-in rates if TaxJar unavailable
        return NextResponse.json({
            success: false,
            source: 'fallback',
            error: result.error,
            message: 'TaxJar unavailable. Please configure TAXJAR_API_KEY or enter rate manually.'
        }, { status: 503 })

    } catch (error) {
        console.error('[TAXJAR_LOOKUP]', error)
        return NextResponse.json({ error: 'Failed to lookup tax rate' }, { status: 500 })
    }
}

// POST - Calculate tax for a transaction
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { fromZip, toZip, toCity, toStreet, amount, shipping, lineItems } = body

        if (!toZip || !amount) {
            return NextResponse.json({
                error: 'toZip and amount are required'
            }, { status: 400 })
        }

        const result = await calculateTax({
            fromZip: fromZip || toZip, // Use store ZIP as from if not provided
            toZip,
            toCity,
            toStreet,
            amount,
            shipping,
            lineItems
        })

        if (result.success) {
            return NextResponse.json({
                success: true,
                ...result.tax
            })
        }

        return NextResponse.json({
            success: false,
            error: result.error
        }, { status: 400 })

    } catch (error) {
        console.error('[TAXJAR_CALC]', error)
        return NextResponse.json({ error: 'Failed to calculate tax' }, { status: 500 })
    }
}
