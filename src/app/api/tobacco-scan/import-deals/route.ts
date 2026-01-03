import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Upload PDF and extract manufacturer deals
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id || !user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const manufacturerName = formData.get('manufacturer') as string || 'Unknown'

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        // Read PDF file
        const buffer = Buffer.from(await file.arrayBuffer())

        // Use pdf-parse to extract text
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse')
        const pdfData = await pdfParse(buffer)
        const text = pdfData.text

        // Extract deals using pattern matching
        const extractedDeals = extractDealsFromText(text)

        if (extractedDeals.length === 0) {
            return NextResponse.json({
                error: 'No deals found in PDF',
                rawText: text.substring(0, 1000)
            }, { status: 400 })
        }

        // Get inventory products to match against
        const products = await prisma.item.findMany({
            where: { franchiseId: user.franchiseId },
            select: { id: true, name: true, sku: true, barcode: true }
        })

        const results = {
            created: 0,
            skipped: 0,
            errors: [] as string[],
            deals: [] as any[]
        }

        for (const deal of extractedDeals) {
            const matchedProduct = findMatchingProduct(products, deal)

            if (!matchedProduct) {
                results.skipped++
                continue
            }

            try {
                // Check if already exists
                const existing = await prisma.tobaccoDeal.findFirst({
                    where: {
                        franchiseId: user.franchiseId,
                        dealName: { contains: deal.plu }
                    }
                })

                if (existing) {
                    results.skipped++
                    continue
                }

                const newDeal = await prisma.tobaccoDeal.create({
                    data: {
                        franchiseId: user.franchiseId,
                        dealName: `${deal.productName} - PLU ${deal.plu}`,
                        manufacturer: manufacturerName,
                        discountType: 'FIXED',
                        discountAmount: deal.discountAmount,
                        dealType: deal.requiresMultiple ? 'MULTI_BUY' : 'SCAN_REBATE',
                        buyQuantity: deal.buyQuantity || 1,
                        getFreeQuantity: deal.requiresMultiple ? 1 : 0,
                        startDate: deal.startDate,
                        endDate: deal.endDate,
                        isActive: true,
                        manufacturerPLU: deal.plu,
                        manufacturerName: manufacturerName,
                        redemptionProgram: deal.redemption,
                        name: deal.productName,
                        brand: deal.brand,
                        description: deal.description,
                        itemId: matchedProduct.id
                    }
                })

                results.created++
                results.deals.push({
                    id: newDeal.id,
                    name: deal.productName,
                    discount: deal.discountAmount,
                    plu: deal.plu
                })

            } catch (error: any) {
                results.errors.push(`${deal.productName}: ${error.message}`)
            }
        }

        return NextResponse.json({
            success: true,
            message: `Imported ${results.created} deals, skipped ${results.skipped}`,
            ...results
        })

    } catch (error) {
        console.error('Error importing deals:', error)
        return NextResponse.json({ error: 'Failed to import deals' }, { status: 500 })
    }
}

interface ExtractedDeal {
    plu: string
    productName: string
    brand?: string
    description?: string
    discountAmount: number
    startDate: Date
    endDate: Date
    requiresMultiple?: boolean
    buyQuantity?: number
    redemption?: string
}

function extractDealsFromText(text: string): ExtractedDeal[] {
    const deals: ExtractedDeal[] = []
    const lines = text.split('\n').filter(l => l.trim())

    const pluPattern = /(\d{5})/
    const discountPattern = /\$(\d+\.?\d*)\s*OFF/i
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})/g
    const buyPattern = /buy\s*(\d+)|purchase\s*of\s*\((\d+)\)/i

    let currentDeal: Partial<ExtractedDeal> = {}

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const nextLines = lines.slice(i, i + 5).join(' ')

        const pluMatch = line.match(pluPattern)
        if (pluMatch) {
            if (currentDeal.plu && currentDeal.discountAmount) {
                deals.push(currentDeal as ExtractedDeal)
            }
            currentDeal = { plu: pluMatch[1] }

            const nameMatch = line.replace(pluPattern, '').trim()
            if (nameMatch.length > 3) {
                currentDeal.productName = nameMatch.split(/\s{2,}/)[0] || nameMatch
            }
        }

        const discountMatch = nextLines.match(discountPattern)
        if (discountMatch && currentDeal.plu) {
            currentDeal.discountAmount = parseFloat(discountMatch[1])
        }

        const dates = nextLines.match(datePattern)
        if (dates && dates.length >= 2 && currentDeal.plu) {
            currentDeal.startDate = new Date(dates[0])
            currentDeal.endDate = new Date(dates[1])
        }

        const brandPatterns = ['MILLER', 'COORS', 'BLUE MOON', 'LEINENKUGEL', 'CORONA', 'BUDWEISER', 'BUD LIGHT']
        for (const brand of brandPatterns) {
            if (line.toUpperCase().includes(brand)) {
                currentDeal.brand = brand
                break
            }
        }

        const buyMatch = nextLines.match(buyPattern)
        if (buyMatch && currentDeal.plu) {
            const qty = parseInt(buyMatch[1] || buyMatch[2])
            if (qty > 1) {
                currentDeal.requiresMultiple = true
                currentDeal.buyQuantity = qty
            }
        }

        if (line.includes('OFF INSTANTLY') && currentDeal.plu) {
            currentDeal.description = line.trim()
        }

        if (line.includes('Affiliated') || line.includes('Molson') || line.includes('Coors')) {
            currentDeal.redemption = line.trim()
        }
    }

    if (currentDeal.plu && currentDeal.discountAmount) {
        deals.push(currentDeal as ExtractedDeal)
    }

    return deals
}

function findMatchingProduct(products: any[], deal: ExtractedDeal) {
    const searchTerms = [
        deal.productName?.toLowerCase(),
        deal.brand?.toLowerCase()
    ].filter(Boolean)

    for (const product of products) {
        const productName = product.name?.toLowerCase() || ''
        const productSku = product.sku?.toLowerCase() || ''
        const productBarcode = product.barcode || ''

        for (const term of searchTerms) {
            if (term && (productName.includes(term) || term.includes(productName) || productSku.includes(term))) {
                return product
            }
        }

        if (deal.plu && productBarcode.includes(deal.plu)) {
            return product
        }
    }

    return null
}

