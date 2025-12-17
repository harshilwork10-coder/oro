import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { lookupBarcode, suggestRetailPrice } from '@/lib/ai/sku-lookup'

/**
 * AI SKU Lookup API
 * GET /api/ai/sku-lookup?barcode=012345678901
 * 
 * Returns product info from UPC databases
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const barcode = searchParams.get('barcode')

        if (!barcode) {
            return NextResponse.json({ error: 'Barcode is required' }, { status: 400 })
        }

        // Lookup the barcode
        const result = await lookupBarcode(barcode)

        if (!result.found) {
            return NextResponse.json({
                found: false,
                barcode: result.barcode,
                message: 'Product not found in database. Please enter details manually.'
            })
        }

        // If we have a suggested price from the lookup, use it
        // Otherwise, suggest based on typical margins (assuming ~$2 cost if unknown)
        let suggestedPrice = result.suggestedPrice
        if (!suggestedPrice && result.category) {
            // Estimate a reasonable price based on category
            suggestedPrice = suggestRetailPrice(2.00, result.category)
        }

        return NextResponse.json({
            found: true,
            barcode: result.barcode,
            name: result.name,
            brand: result.brand,
            category: result.category,
            description: result.description,
            imageUrl: result.imageUrl,
            suggestedPrice,
            size: result.size,
            source: result.source
        })

    } catch (error) {
        console.error('[AI_SKU_LOOKUP]', error)
        return NextResponse.json(
            { error: 'Failed to lookup barcode' },
            { status: 500 }
        )
    }
}
