import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/tobacco-scan/import-deals
 *
 * Upload manufacturer deal sheet PDF → extract deals → create TobaccoScanDeals with UPCs.
 * Auto-detects manufacturer, dates, PLU codes, and discount amounts from PDF text.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const manufacturerOverride = formData.get('manufacturer') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Read PDF file
    const buffer = Buffer.from(await file.arrayBuffer())

    // Use pdf-parse to extract text (CJS module)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseFn = (require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>)
    const pdfData = await pdfParseFn(buffer)
    const text = pdfData.text

    // Detect manufacturer from PDF content if not explicitly provided
    const detectedManufacturer = manufacturerOverride || detectManufacturerFromText(text)

    // Extract deals from text
    const extractedDeals = extractDealsFromText(text)

    if (extractedDeals.length === 0) {
      return NextResponse.json({
        error: 'No deals found in PDF',
        rawText: text.substring(0, 1000),
      }, { status: 400 })
    }

    // Get inventory items to match UPCs
    const items = await prisma.item.findMany({
      where: { franchiseId: user.franchiseId },
      select: { id: true, name: true, sku: true, barcode: true },
    })

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
      deals: [] as any[],
    }

    for (const deal of extractedDeals) {
      try {
        // Check for duplicate by PLU
        if (deal.plu) {
          const existing = await prisma.tobaccoScanDeal.findFirst({
            where: {
              franchiseId: user.franchiseId,
              manufacturerPLU: deal.plu,
              status: { not: 'ARCHIVED' },
            },
          })
          if (existing) {
            results.skipped++
            continue
          }
        }

        // Find matching inventory item for UPC linking
        const matchedItem = findMatchingItem(items, deal)

        // Build UPC entries
        const upcEntries = deal.upcs.length > 0 ? deal.upcs : (
          matchedItem?.barcode ? [{ upc: matchedItem.barcode, productName: matchedItem.name }] : []
        )

        const newDeal = await prisma.tobaccoScanDeal.create({
          data: {
            franchiseId: user.franchiseId,
            manufacturer: detectedManufacturer,
            dealName: deal.productName || `PLU ${deal.plu}`,
            type: deal.requiresMultiple ? 'MULTIBUY' : 'BUYDOWN',
            appliesToLevel: 'PACK',
            minQty: deal.buyQuantity || 1,
            rewardType: 'FIXED_AMOUNT',
            rewardValue: deal.discountAmount,
            reimbursementPerUnit: deal.discountAmount, // Default: same as discount
            startDate: deal.startDate || new Date(),
            endDate: deal.endDate || null,
            status: 'ACTIVE',
            manufacturerPLU: deal.plu || null,
            sourceFile: file.name,
            requiresScanReporting: true,
            stackable: false,
            eligibleUpcs: upcEntries.length > 0 ? {
              create: upcEntries.map((u: any) => ({
                upc: u.upc || u,
                productName: u.productName || deal.productName || null,
                packOrCarton: 'PACK',
                itemId: matchedItem?.id || null,
              })),
            } : undefined,
          },
          include: { eligibleUpcs: true },
        })

        results.created++
        results.deals.push({
          id: newDeal.id,
          name: newDeal.dealName,
          discount: deal.discountAmount,
          plu: deal.plu,
          upcCount: newDeal.eligibleUpcs.length,
        })
      } catch (error: any) {
        results.errors.push(`${deal.productName}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      manufacturer: detectedManufacturer,
      message: `Imported ${results.created} deals, skipped ${results.skipped}`,
      ...results,
    })
  } catch (error) {
    console.error('[TOBACCO_IMPORT]', error)
    return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
  }
}

// ─── PDF Extraction Helpers ─────────────────────────────────────

interface ExtractedDeal {
  plu: string
  productName: string
  discountAmount: number
  startDate: Date | null
  endDate: Date | null
  requiresMultiple: boolean
  buyQuantity: number
  upcs: string[]
}

function detectManufacturerFromText(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('altria') || lower.includes('marlboro') || lower.includes('copenhagen')) return 'ALTRIA'
  if (lower.includes('rjr') || lower.includes('camel') || lower.includes('newport') || lower.includes('reynolds')) return 'RJR'
  if (lower.includes('itg') || lower.includes('kool') || lower.includes('winston') || lower.includes('maverick')) return 'ITG'
  if (lower.includes('liggett') || lower.includes('pyramid')) return 'LIGGETT'
  if (lower.includes('swedish match') || lower.includes('zyn') || lower.includes('general snus')) return 'SWEDISH_MATCH'
  return 'OTHER'
}

function extractDealsFromText(text: string): ExtractedDeal[] {
  const deals: ExtractedDeal[] = []
  const lines = text.split('\n').filter(l => l.trim())

  const pluPattern = /(\d{5})/
  const discountPattern = /\$(\d+\.?\d*)\s*OFF/i
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})/g
  const buyPattern = /buy\s*(\d+)|purchase\s*of\s*\((\d+)\)/i
  const upcPattern = /\b(\d{12,14})\b/g // UPC-A (12 digits) or EAN-13 (13 digits)

  let currentDeal: Partial<ExtractedDeal> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLines = lines.slice(i, i + 5).join(' ')

    const pluMatch = line.match(pluPattern)
    if (pluMatch) {
      if (currentDeal.plu && currentDeal.discountAmount) {
        deals.push({
          plu: currentDeal.plu,
          productName: currentDeal.productName || `PLU ${currentDeal.plu}`,
          discountAmount: currentDeal.discountAmount,
          startDate: currentDeal.startDate || null,
          endDate: currentDeal.endDate || null,
          requiresMultiple: currentDeal.requiresMultiple || false,
          buyQuantity: currentDeal.buyQuantity || 1,
          upcs: currentDeal.upcs || [],
        })
      }
      currentDeal = { plu: pluMatch[1], upcs: [] }

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

    const buyMatch = nextLines.match(buyPattern)
    if (buyMatch && currentDeal.plu) {
      const qty = parseInt(buyMatch[1] || buyMatch[2])
      if (qty > 1) {
        currentDeal.requiresMultiple = true
        currentDeal.buyQuantity = qty
      }
    }

    // Extract any UPC barcodes
    const upcMatches = line.matchAll(upcPattern)
    for (const m of upcMatches) {
      if (currentDeal.upcs && !currentDeal.upcs.includes(m[1])) {
        currentDeal.upcs.push(m[1])
      }
    }
  }

  // Don't forget the last deal
  if (currentDeal.plu && currentDeal.discountAmount) {
    deals.push({
      plu: currentDeal.plu!,
      productName: currentDeal.productName || `PLU ${currentDeal.plu}`,
      discountAmount: currentDeal.discountAmount,
      startDate: currentDeal.startDate || null,
      endDate: currentDeal.endDate || null,
      requiresMultiple: currentDeal.requiresMultiple || false,
      buyQuantity: currentDeal.buyQuantity || 1,
      upcs: currentDeal.upcs || [],
    })
  }

  return deals
}

function findMatchingItem(items: any[], deal: ExtractedDeal) {
  // First try: match by UPC/barcode
  for (const upc of deal.upcs) {
    const match = items.find(i => i.barcode === upc)
    if (match) return match
  }

  // Second try: match by name
  const searchTerms = [deal.productName?.toLowerCase()].filter(Boolean)
  for (const item of items) {
    const itemName = item.name?.toLowerCase() || ''
    for (const term of searchTerms) {
      if (term && (itemName.includes(term) || term.includes(itemName))) {
        return item
      }
    }
  }

  // Third try: match by PLU against barcode
  if (deal.plu) {
    const match = items.find(i => i.barcode?.includes(deal.plu))
    if (match) return match
  }

  return null
}
