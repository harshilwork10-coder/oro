import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// UPCitemdb API configuration
// Get your API key from https://www.upcitemdb.com/wp/docs/main/development/getting-started/
const UPC_API_KEY = process.env.UPCITEMDB_API_KEY || ''
const UPC_API_URL = 'https://api.upcitemdb.com/prod/trial/lookup'

interface UpcProduct {
    ean: string
    title: string
    description: string
    upc: string
    brand: string
    model: string
    color: string
    size: string
    dimension: string
    weight: string
    category: string
    currency: string
    lowest_recorded_price: number
    highest_recorded_price: number
    images: string[]
    offers: Array<{
        merchant: string
        price: number
        currency: string
    }>
}

// GET: Lookup product info by UPC barcode
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const upc = searchParams.get('upc')

        if (!upc) {
            return NextResponse.json({ error: 'UPC code required' }, { status: 400 })
        }

        // Clean the UPC (remove any non-numeric characters)
        const cleanUpc = upc.replace(/\D/g, '')

        if (cleanUpc.length < 8 || cleanUpc.length > 14) {
            return NextResponse.json({ error: 'Invalid UPC length' }, { status: 400 })
        }

        // First check if we already have this product in our database
        const user = session.user as any
        const existingProduct = await prisma.retailProduct.findFirst({
            where: {
                franchiseId: user.franchiseId,
                barcode: cleanUpc
            }
        })

        if (existingProduct) {
            return NextResponse.json({
                source: 'local',
                product: {
                    name: existingProduct.name,
                    price: Number(existingProduct.price),
                    barcode: existingProduct.barcode,
                    category: existingProduct.categoryId,
                    existingProductId: existingProduct.id
                }
            })
        }

        // Not in local DB, lookup from UPCitemdb
        if (!UPC_API_KEY) {
            return NextResponse.json({
                error: 'UPC API not configured',
                message: 'Set UPCITEMDB_API_KEY in .env file'
            }, { status: 503 })
        }

        const response = await fetch(`${UPC_API_URL}?upc=${cleanUpc}`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'user_key': UPC_API_KEY
            }
        })

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({
                    source: 'not_found',
                    message: 'Product not found in UPC database'
                })
            }
            if (response.status === 429) {
                return NextResponse.json({
                    error: 'API rate limit exceeded',
                    message: 'Too many requests, try again later'
                }, { status: 429 })
            }
            throw new Error(`UPC API error: ${response.status}`)
        }

        const data = await response.json()

        if (!data.items || data.items.length === 0) {
            return NextResponse.json({
                source: 'not_found',
                message: 'Product not found'
            })
        }

        const item: UpcProduct = data.items[0]

        // Calculate suggested retail price (use lowest price + markup or highest)
        let suggestedPrice = 0
        if (item.offers && item.offers.length > 0) {
            const avgPrice = item.offers.reduce((sum, o) => sum + o.price, 0) / item.offers.length
            suggestedPrice = Math.round(avgPrice * 100) / 100
        } else if (item.lowest_recorded_price) {
            suggestedPrice = item.lowest_recorded_price
        }

        return NextResponse.json({
            source: 'upcitemdb',
            product: {
                name: item.title || 'Unknown Product',
                brand: item.brand || '',
                description: item.description || '',
                barcode: cleanUpc,
                suggestedPrice,
                lowestPrice: item.lowest_recorded_price || 0,
                highestPrice: item.highest_recorded_price || 0,
                category: item.category || '',
                size: item.size || '',
                weight: item.weight || '',
                color: item.color || '',
                images: item.images || [],
                model: item.model || ''
            }
        })

    } catch (error) {
        console.error('[UPC_LOOKUP]', error)
        return NextResponse.json({ error: 'UPC lookup failed' }, { status: 500 })
    }
}
