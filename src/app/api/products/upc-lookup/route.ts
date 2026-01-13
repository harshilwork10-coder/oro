import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from '@/lib/api-response'

// Lookup product info from UPC barcode using free APIs
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return ApiResponse.unauthorized()
        }

        const searchParams = request.nextUrl.searchParams
        const barcode = searchParams.get('barcode')

        if (!barcode) {
            return ApiResponse.validationError('Barcode is required')
        }

        // Try Open Food Facts first (free, no API key required)
        try {
            const offResponse = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
                { headers: { 'User-Agent': 'ORO 9-POS/1.0' } }
            )

            if (offResponse.ok) {
                const data = await offResponse.json()

                if (data.status === 1 && data.product) {
                    const product = data.product

                    // Extract useful info
                    const productInfo = {
                        found: true,
                        barcode,
                        name: product.product_name || product.product_name_en || null,
                        brand: product.brands || null,
                        category: product.categories_tags?.[0]?.replace('en:', '') || null,
                        imageUrl: product.image_front_small_url || product.image_url || null,
                        // Suggest price based on category (very rough estimates)
                        suggestedPrice: getSuggestedPrice(product.categories_tags || []),
                        quantity: product.quantity || null,
                        source: 'openfoodfacts'
                    }

                    return ApiResponse.success(productInfo)
                }
            }
        } catch {
            // Open Food Facts lookup failed, try fallback
        }

        // Try UPC Item DB as fallback (limited free tier)
        try {
            const upcdbResponse = await fetch(
                `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
                { headers: { 'Accept': 'application/json' } }
            )

            if (upcdbResponse.ok) {
                const data = await upcdbResponse.json()

                if (data.items && data.items.length > 0) {
                    const item = data.items[0]

                    return ApiResponse.success({
                        found: true,
                        barcode,
                        name: item.title || null,
                        brand: item.brand || null,
                        category: item.category || null,
                        imageUrl: item.images?.[0] || null,
                        suggestedPrice: item.lowest_recorded_price || null,
                        source: 'upcitemdb'
                    })
                }
            }
        } catch {
            // UPC Item DB lookup failed
        }

        // Neither API found the product
        return ApiResponse.success({
            found: false,
            barcode,
            name: null,
            brand: null,
            category: null,
            imageUrl: null,
            suggestedPrice: null,
            source: null
        })

    } catch (error) {
        console.error('[UPC_LOOKUP] Error:', error)
        return ApiResponse.serverError('Failed to lookup UPC')
    }
}

// Helper: Suggest price based on category
function getSuggestedPrice(categories: string[]): number | null {
    const categoryString = categories.join(' ').toLowerCase()

    // Very rough price suggestions based on common convenience store items
    if (categoryString.includes('beverage') || categoryString.includes('drink')) {
        if (categoryString.includes('energy')) return 3.99
        if (categoryString.includes('soda') || categoryString.includes('soft')) return 2.49
        return 1.99
    }
    if (categoryString.includes('snack') || categoryString.includes('chip')) return 4.99
    if (categoryString.includes('candy') || categoryString.includes('chocolate')) return 2.49
    if (categoryString.includes('beer')) return 12.99
    if (categoryString.includes('wine')) return 14.99
    if (categoryString.includes('spirit') || categoryString.includes('liquor')) return 24.99
    if (categoryString.includes('tobacco') || categoryString.includes('cigarette')) return 9.99

    return null
}
