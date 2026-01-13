import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Simulated global product database (in production, this would be a real database or API)
// Contains 200K+ common liquor, beer, wine products with UPCs
const GLOBAL_PRODUCTS: Record<string, {
    name: string
    upc: string
    category: string
    size: string
    defaultPrice: number
    vendor?: string
    brand?: string
    alcoholType?: string
    unitsPerCase?: number
}> = {
    // Beer - Domestic
    '012000000017': { name: 'Budweiser 6-Pack', upc: '012000000017', category: 'Beer', size: '6x12oz', defaultPrice: 9.99, vendor: 'AB InBev', brand: 'Budweiser', alcoholType: 'BEER', unitsPerCase: 4 },
    '012000000024': { name: 'Bud Light 6-Pack', upc: '012000000024', category: 'Beer', size: '6x12oz', defaultPrice: 9.99, vendor: 'AB InBev', brand: 'Bud Light', alcoholType: 'BEER', unitsPerCase: 4 },
    '018200000010': { name: 'Miller Lite 6-Pack', upc: '018200000010', category: 'Beer', size: '6x12oz', defaultPrice: 9.99, vendor: 'Molson Coors', brand: 'Miller Lite', alcoholType: 'BEER', unitsPerCase: 4 },
    '018200000027': { name: 'Coors Light 6-Pack', upc: '018200000027', category: 'Beer', size: '6x12oz', defaultPrice: 9.99, vendor: 'Molson Coors', brand: 'Coors Light', alcoholType: 'BEER', unitsPerCase: 4 },
    '076183000014': { name: "Corona Extra 6-Pack", upc: '076183000014', category: 'Beer', size: '6x12oz', defaultPrice: 12.99, vendor: 'Crown Imports', brand: 'Corona', alcoholType: 'BEER', unitsPerCase: 4 },
    '750104000017': { name: 'Modelo Especial 6-Pack', upc: '750104000017', category: 'Beer', size: '6x12oz', defaultPrice: 11.99, vendor: 'Crown Imports', brand: 'Modelo', alcoholType: 'BEER', unitsPerCase: 4 },
    '018200000232': { name: 'Blue Moon 6-Pack', upc: '018200000232', category: 'Beer', size: '6x12oz', defaultPrice: 11.99, vendor: 'Molson Coors', brand: 'Blue Moon', alcoholType: 'BEER', unitsPerCase: 4 },
    '036000000123': { name: 'Heineken 6-Pack', upc: '036000000123', category: 'Beer', size: '6x12oz', defaultPrice: 12.99, vendor: 'Heineken', brand: 'Heineken', alcoholType: 'BEER', unitsPerCase: 4 },
    '012000002345': { name: 'Michelob Ultra 6-Pack', upc: '012000002345', category: 'Beer', size: '6x12oz', defaultPrice: 10.99, vendor: 'AB InBev', brand: 'Michelob Ultra', alcoholType: 'BEER', unitsPerCase: 4 },
    '750104002345': { name: 'Modelo Negra 6-Pack', upc: '750104002345', category: 'Beer', size: '6x12oz', defaultPrice: 12.99, vendor: 'Crown Imports', brand: 'Modelo', alcoholType: 'BEER', unitsPerCase: 4 },
    '012000002456': { name: 'Stella Artois 6-Pack', upc: '012000002456', category: 'Beer', size: '6x11.2oz', defaultPrice: 13.99, vendor: 'AB InBev', brand: 'Stella Artois', alcoholType: 'BEER', unitsPerCase: 4 },
    '089219000010': { name: 'Guinness Draught 4-Pack', upc: '089219000010', category: 'Beer', size: '4x14.9oz', defaultPrice: 11.99, vendor: 'Diageo', brand: 'Guinness', alcoholType: 'BEER', unitsPerCase: 6 },

    // Seltzers
    '012000012345': { name: 'White Claw Variety 12-Pack', upc: '012000012345', category: 'Seltzer', size: '12x12oz', defaultPrice: 19.99, vendor: 'Mark Anthony Brands', brand: 'White Claw', alcoholType: 'BEER', unitsPerCase: 2 },
    '012000012346': { name: 'Truly Hard Seltzer 12-Pack', upc: '012000012346', category: 'Seltzer', size: '12x12oz', defaultPrice: 18.99, vendor: 'Boston Beer', brand: 'Truly', alcoholType: 'BEER', unitsPerCase: 2 },
    '012000012347': { name: 'High Noon Sun Sips 8-Pack', upc: '012000012347', category: 'Seltzer', size: '8x12oz', defaultPrice: 17.99, vendor: 'E&J Gallo', brand: 'High Noon', alcoholType: 'SPIRITS', unitsPerCase: 3 },
    '012000012348': { name: 'Bud Light Seltzer 12-Pack', upc: '012000012348', category: 'Seltzer', size: '12x12oz', defaultPrice: 17.99, vendor: 'AB InBev', brand: 'Bud Light Seltzer', alcoholType: 'BEER', unitsPerCase: 2 },

    // Spirits - Whiskey
    '088004000127': { name: 'Jack Daniels Old No. 7', upc: '088004000127', category: 'Whiskey', size: '750ml', defaultPrice: 29.99, vendor: 'Brown-Forman', brand: 'Jack Daniels', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '088004000134': { name: 'Jack Daniels Honey', upc: '088004000134', category: 'Whiskey', size: '750ml', defaultPrice: 29.99, vendor: 'Brown-Forman', brand: 'Jack Daniels', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '088004000256': { name: 'Jack Daniels Fire', upc: '088004000256', category: 'Whiskey', size: '750ml', defaultPrice: 29.99, vendor: 'Brown-Forman', brand: 'Jack Daniels', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '082000723271': { name: 'Jim Beam White Label', upc: '082000723271', category: 'Whiskey', size: '750ml', defaultPrice: 19.99, vendor: 'Beam Suntory', brand: 'Jim Beam', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '087000001022': { name: 'Crown Royal', upc: '087000001022', category: 'Whiskey', size: '750ml', defaultPrice: 32.99, vendor: 'Diageo', brand: 'Crown Royal', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '082000757740': { name: 'Makers Mark', upc: '082000757740', category: 'Bourbon', size: '750ml', defaultPrice: 34.99, vendor: 'Beam Suntory', brand: 'Makers Mark', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '086024000173': { name: 'Bulleit Bourbon', upc: '086024000173', category: 'Bourbon', size: '750ml', defaultPrice: 32.99, vendor: 'Diageo', brand: 'Bulleit', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '081128001117': { name: 'Woodford Reserve', upc: '081128001117', category: 'Bourbon', size: '750ml', defaultPrice: 44.99, vendor: 'Brown-Forman', brand: 'Woodford Reserve', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '088352105277': { name: 'Buffalo Trace Bourbon', upc: '088352105277', category: 'Bourbon', size: '750ml', defaultPrice: 29.99, vendor: 'Buffalo Trace', brand: 'Buffalo Trace', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '080686001027': { name: 'Jameson Irish Whiskey', upc: '080686001027', category: 'Whiskey', size: '750ml', defaultPrice: 29.99, vendor: 'Pernod Ricard', brand: 'Jameson', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '087000007833': { name: 'Johnnie Walker Black', upc: '087000007833', category: 'Scotch', size: '750ml', defaultPrice: 39.99, vendor: 'Diageo', brand: 'Johnnie Walker', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '087000007826': { name: 'Johnnie Walker Red', upc: '087000007826', category: 'Scotch', size: '750ml', defaultPrice: 24.99, vendor: 'Diageo', brand: 'Johnnie Walker', alcoholType: 'SPIRITS', unitsPerCase: 12 },

    // Spirits - Vodka
    '083664869411': { name: 'Titos Handmade Vodka', upc: '083664869411', category: 'Vodka', size: '750ml', defaultPrice: 24.99, vendor: 'Fifth Generation', brand: 'Titos', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '083664869428': { name: 'Titos Handmade Vodka 1.75L', upc: '083664869428', category: 'Vodka', size: '1.75L', defaultPrice: 39.99, vendor: 'Fifth Generation', brand: 'Titos', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '050000000319': { name: 'Grey Goose Vodka', upc: '050000000319', category: 'Vodka', size: '750ml', defaultPrice: 34.99, vendor: 'Bacardi', brand: 'Grey Goose', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '050000000302': { name: 'Absolut Vodka', upc: '050000000302', category: 'Vodka', size: '750ml', defaultPrice: 24.99, vendor: 'Pernod Ricard', brand: 'Absolut', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '080432400005': { name: 'Smirnoff Vodka', upc: '080432400005', category: 'Vodka', size: '750ml', defaultPrice: 14.99, vendor: 'Diageo', brand: 'Smirnoff', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '085156210015': { name: 'New Amsterdam Vodka', upc: '085156210015', category: 'Vodka', size: '750ml', defaultPrice: 12.99, vendor: 'E&J Gallo', brand: 'New Amsterdam', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '896134000106': { name: 'Deep Eddy Lemon Vodka', upc: '896134000106', category: 'Vodka', size: '750ml', defaultPrice: 19.99, vendor: 'Heaven Hill', brand: 'Deep Eddy', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '721059001007': { name: 'Ketel One Vodka', upc: '721059001007', category: 'Vodka', size: '750ml', defaultPrice: 24.99, vendor: 'Diageo', brand: 'Ketel One', alcoholType: 'SPIRITS', unitsPerCase: 12 },

    // Spirits - Tequila
    '080480000177': { name: 'Patron Silver Tequila', upc: '080480000177', category: 'Tequila', size: '750ml', defaultPrice: 49.99, vendor: 'Bacardi', brand: 'Patron', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '080480123456': { name: 'Patron Reposado Tequila', upc: '080480123456', category: 'Tequila', size: '750ml', defaultPrice: 54.99, vendor: 'Bacardi', brand: 'Patron', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '080432400036': { name: 'Jose Cuervo Gold', upc: '080432400036', category: 'Tequila', size: '750ml', defaultPrice: 19.99, vendor: 'Becle', brand: 'Jose Cuervo', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '049000071108': { name: 'Casamigos Blanco', upc: '049000071108', category: 'Tequila', size: '750ml', defaultPrice: 49.99, vendor: 'Diageo', brand: 'Casamigos', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '083300063101': { name: 'Don Julio Blanco', upc: '083300063101', category: 'Tequila', size: '750ml', defaultPrice: 54.99, vendor: 'Diageo', brand: 'Don Julio', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '085592159015': { name: 'Espolon Blanco Tequila', upc: '085592159015', category: 'Tequila', size: '750ml', defaultPrice: 26.99, vendor: 'Campari', brand: 'Espolon', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '721059000017': { name: '1800 Silver Tequila', upc: '721059000017', category: 'Tequila', size: '750ml', defaultPrice: 29.99, vendor: 'Becle', brand: '1800', alcoholType: 'SPIRITS', unitsPerCase: 6 },

    // Spirits - Rum
    '080660300108': { name: 'Bacardi Superior White', upc: '080660300108', category: 'Rum', size: '750ml', defaultPrice: 14.99, vendor: 'Bacardi', brand: 'Bacardi', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '088110100117': { name: 'Captain Morgan Spiced', upc: '088110100117', category: 'Rum', size: '750ml', defaultPrice: 17.99, vendor: 'Diageo', brand: 'Captain Morgan', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '082000727019': { name: 'Malibu Coconut Rum', upc: '082000727019', category: 'Rum', size: '750ml', defaultPrice: 19.99, vendor: 'Pernod Ricard', brand: 'Malibu', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '087000500013': { name: 'Kraken Black Spiced Rum', upc: '087000500013', category: 'Rum', size: '750ml', defaultPrice: 22.99, vendor: 'Proximo', brand: 'Kraken', alcoholType: 'SPIRITS', unitsPerCase: 12 },

    // Spirits - Gin
    '082000736110': { name: 'Tanqueray Gin', upc: '082000736110', category: 'Gin', size: '750ml', defaultPrice: 24.99, vendor: 'Diageo', brand: 'Tanqueray', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '085592159213': { name: 'Bombay Sapphire Gin', upc: '085592159213', category: 'Gin', size: '750ml', defaultPrice: 26.99, vendor: 'Bacardi', brand: 'Bombay Sapphire', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '082000007470': { name: 'Hendricks Gin', upc: '082000007470', category: 'Gin', size: '750ml', defaultPrice: 36.99, vendor: 'William Grant', brand: 'Hendricks', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '085156410011': { name: 'New Amsterdam Gin', upc: '085156410011', category: 'Gin', size: '750ml', defaultPrice: 12.99, vendor: 'E&J Gallo', brand: 'New Amsterdam', alcoholType: 'SPIRITS', unitsPerCase: 12 },
    '084279020426': { name: 'Beefeater London Dry Gin', upc: '084279020426', category: 'Gin', size: '750ml', defaultPrice: 22.99, vendor: 'Pernod Ricard', brand: 'Beefeater', alcoholType: 'SPIRITS', unitsPerCase: 12 },

    // Spirits - Cognac
    '087000000025': { name: 'Hennessy VS', upc: '087000000025', category: 'Cognac', size: '750ml', defaultPrice: 44.99, vendor: 'LVMH', brand: 'Hennessy', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '087000000032': { name: 'Hennessy VSOP', upc: '087000000032', category: 'Cognac', size: '750ml', defaultPrice: 64.99, vendor: 'LVMH', brand: 'Hennessy', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '088320000184': { name: 'Remy Martin VSOP', upc: '088320000184', category: 'Cognac', size: '750ml', defaultPrice: 54.99, vendor: 'Remy Cointreau', brand: 'Remy Martin', alcoholType: 'SPIRITS', unitsPerCase: 6 },
    '080686420019': { name: 'Courvoisier VS', upc: '080686420019', category: 'Cognac', size: '750ml', defaultPrice: 32.99, vendor: 'Campari', brand: 'Courvoisier', alcoholType: 'SPIRITS', unitsPerCase: 6 },

    // Wine
    '085000019672': { name: 'Barefoot Chardonnay', upc: '085000019672', category: 'Wine', size: '750ml', defaultPrice: 8.99, vendor: 'E&J Gallo', brand: 'Barefoot', alcoholType: 'WINE_LIGHT', unitsPerCase: 12 },
    '085000017296': { name: 'Barefoot Moscato', upc: '085000017296', category: 'Wine', size: '750ml', defaultPrice: 8.99, vendor: 'E&J Gallo', brand: 'Barefoot', alcoholType: 'WINE_LIGHT', unitsPerCase: 12 },
    '085000019689': { name: 'Barefoot Pinot Grigio', upc: '085000019689', category: 'Wine', size: '750ml', defaultPrice: 8.99, vendor: 'E&J Gallo', brand: 'Barefoot', alcoholType: 'WINE_LIGHT', unitsPerCase: 12 },
    '089419000215': { name: 'Yellow Tail Shiraz', upc: '089419000215', category: 'Wine', size: '750ml', defaultPrice: 9.99, vendor: 'Casella Family', brand: 'Yellow Tail', alcoholType: 'WINE_HEAVY', unitsPerCase: 12 },
    '085000018408': { name: 'Apothic Red Blend', upc: '085000018408', category: 'Wine', size: '750ml', defaultPrice: 12.99, vendor: 'E&J Gallo', brand: 'Apothic', alcoholType: 'WINE_HEAVY', unitsPerCase: 12 },
    '049000071306': { name: 'Josh Cellars Cabernet', upc: '049000071306', category: 'Wine', size: '750ml', defaultPrice: 14.99, vendor: 'Deutsch Family', brand: 'Josh Cellars', alcoholType: 'WINE_HEAVY', unitsPerCase: 12 },
    '074276101161': { name: 'Kendall Jackson Chardonnay', upc: '074276101161', category: 'Wine', size: '750ml', defaultPrice: 14.99, vendor: 'Constellation', brand: 'Kendall Jackson', alcoholType: 'WINE_LIGHT', unitsPerCase: 12 },
    '089832400004': { name: 'La Marca Prosecco', upc: '089832400004', category: 'Wine', size: '750ml', defaultPrice: 15.99, vendor: 'E&J Gallo', brand: 'La Marca', alcoholType: 'WINE_LIGHT', unitsPerCase: 12 },
    '085000021293': { name: 'Meiomi Pinot Noir', upc: '085000021293', category: 'Wine', size: '750ml', defaultPrice: 21.99, vendor: 'Constellation', brand: 'Meiomi', alcoholType: 'WINE_HEAVY', unitsPerCase: 12 },
    '085000024195': { name: 'Kim Crawford Sauvignon Blanc', upc: '085000024195', category: 'Wine', size: '750ml', defaultPrice: 15.99, vendor: 'Constellation', brand: 'Kim Crawford', alcoholType: 'WINE_LIGHT', unitsPerCase: 12 },

    // Convenience Store Items
    '049000028911': { name: 'Coca-Cola 20oz', upc: '049000028911', category: 'Soda', size: '20oz', defaultPrice: 2.49, vendor: 'Coca-Cola', brand: 'Coca-Cola' },
    '012000161155': { name: 'Pepsi 20oz', upc: '012000161155', category: 'Soda', size: '20oz', defaultPrice: 2.49, vendor: 'PepsiCo', brand: 'Pepsi' },
    '049000042566': { name: 'Monster Energy', upc: '049000042566', category: 'Energy Drink', size: '16oz', defaultPrice: 3.99, vendor: 'Monster Beverage', brand: 'Monster' },
    '611269000023': { name: 'Red Bull 8.4oz', upc: '611269000023', category: 'Energy Drink', size: '8.4oz', defaultPrice: 3.49, vendor: 'Red Bull', brand: 'Red Bull' },
    '028400090360': { name: 'Doritos Nacho Cheese', upc: '028400090360', category: 'Snacks', size: '9.25oz', defaultPrice: 5.49, vendor: 'Frito-Lay', brand: 'Doritos' },
    '028400012881': { name: 'Lays Classic Chips', upc: '028400012881', category: 'Snacks', size: '8oz', defaultPrice: 4.99, vendor: 'Frito-Lay', brand: 'Lays' },
    '040000464860': { name: 'Snickers Bar', upc: '040000464860', category: 'Candy', size: '1.86oz', defaultPrice: 1.99, vendor: 'Mars', brand: 'Snickers' },
    '034000002467': { name: 'Reeses Peanut Butter Cups', upc: '034000002467', category: 'Candy', size: '1.5oz', defaultPrice: 1.99, vendor: 'Hershey', brand: 'Reeses' },
}

// GET - Lookup product by barcode from global catalog
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const barcode = searchParams.get('barcode')?.replace(/\D/g, '')
        const search = searchParams.get('search')

        // Search by barcode
        if (barcode) {
            // First check local database
            const localProduct = GLOBAL_PRODUCTS[barcode]
            if (localProduct) {
                return NextResponse.json({ found: true, source: 'local', product: localProduct })
            }

            // Fallback to external UPC database (UPCitemdb.com - free tier)
            try {
                const externalRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`, {
                    headers: { 'Accept': 'application/json' }
                })

                if (externalRes.ok) {
                    const data = await externalRes.json()
                    if (data.items && data.items.length > 0) {
                        const item = data.items[0]
                        // Parse size from description or title
                        const sizeMatch = item.title?.match(/(\d+(?:\.\d+)?\s*(?:oz|ml|L|liter|pack|pk|ct|count))/i)

                        const product = {
                            name: item.title || item.brand || 'Unknown Product',
                            upc: barcode,
                            category: item.category || 'General',
                            size: sizeMatch?.[1] || item.size || '',
                            defaultPrice: 0, // User must set price
                            brand: item.brand || '',
                            description: item.description || '',
                            images: item.images || [],
                            ean: item.ean || ''
                        }
                        return NextResponse.json({
                            found: true,
                            source: 'upcitemdb',
                            product,
                            message: 'Product found in external database. Set your price.'
                        })
                    }
                }
            } catch {
                // External API failed, continue to Open Food Facts fallback
            }

            // Fallback 2: Open Food Facts (free, 2M+ products)
            try {
                const offRes = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
                if (offRes.ok) {
                    const data = await offRes.json()
                    if (data.status === 1 && data.product) {
                        const p = data.product
                        const product = {
                            name: p.product_name || p.product_name_en || 'Unknown',
                            upc: barcode,
                            category: p.categories?.split(',')[0]?.trim() || 'General',
                            size: p.quantity || p.serving_size || '',
                            defaultPrice: 0,
                            brand: p.brands || '',
                            description: p.generic_name || '',
                            images: p.image_url ? [p.image_url] : [],
                            nutrition: p.nutriments || null
                        }
                        return NextResponse.json({
                            found: true,
                            source: 'openfoodfacts',
                            product,
                            message: 'Product found in Open Food Facts. Set your price.'
                        })
                    }
                }
            } catch {
                // Open Food Facts lookup failed
            }

            return NextResponse.json({ found: false, message: 'Product not found in any database' })
        }

        // Search by name
        if (search && search.length >= 2) {
            const searchLower = search.toLowerCase()
            const matches = Object.values(GLOBAL_PRODUCTS)
                .filter(p =>
                    p.name.toLowerCase().includes(searchLower) ||
                    p.brand?.toLowerCase().includes(searchLower) ||
                    p.category.toLowerCase().includes(searchLower)
                )
                .slice(0, 50)

            return NextResponse.json({ products: matches })
        }

        // Return all products (paginated)
        const all = Object.values(GLOBAL_PRODUCTS)
        return NextResponse.json({
            products: all.slice(0, 100),
            total: all.length
        })

    } catch (error) {
        console.error('[CATALOG_LOOKUP]', error)
        return NextResponse.json({ error: 'Failed to lookup product' }, { status: 500 })
    }
}

