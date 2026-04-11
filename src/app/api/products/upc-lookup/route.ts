import {NextRequest, NextResponse } from 'next/server'
// Lookup product info from UPC barcode using free APIs
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const searchParams = req.nextUrl.searchParams
        const barcode = searchParams.get('barcode')

        if (!barcode) {
            return NextResponse.json({ error: 'Barcode is required' }, { status: 422 })
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

                    return NextResponse.json(productInfo)
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

                    return NextResponse.json({
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
        return NextResponse.json({
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
        return NextResponse.json({ error: 'Failed to lookup UPC' }, { status: 500 })
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
