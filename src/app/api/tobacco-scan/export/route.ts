import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
    generateAltriaFile,
    generateRJRFile,
    generateITGFile,
    detectUOM,
    detectCategory,
    detectManufacturer,
    type TobaccoScanRecord,
    type StoreInfo,
} from "@/lib/tobacco-export"

// GET /api/tobacco-scan/export?manufacturer=ALTRIA&weekStart=2026-02-23
// Downloads the pipe-delimited .txt file for manufacturer submission
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const manufacturer = searchParams.get('manufacturer') || 'ALTRIA'
        const weekStartStr = searchParams.get('weekStart')

        if (!['ALTRIA', 'RJR', 'ITG'].includes(manufacturer)) {
            return NextResponse.json({ error: 'Invalid manufacturer' }, { status: 400 })
        }

        // Calculate week range
        let startOfWeek: Date
        if (weekStartStr) {
            startOfWeek = new Date(weekStartStr)
        } else {
            const now = new Date()
            startOfWeek = new Date(now)
            startOfWeek.setDate(now.getDate() - now.getDay())
        }
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        // Get store info
        const location = await prisma.location.findFirst({
            where: { franchise: { id: session.user.franchiseId } }
        })

        // Get manufacturer config for account number
        const mfgConfig = await prisma.manufacturerConfig.findFirst({
            where: {
                franchiseId: session.user.franchiseId,
                manufacturer
            }
        })

        // Parse address components (address field contains full address)
        const fullAddress = location?.address || ''
        const store: StoreInfo = {
            accountNumber: mfgConfig?.accountNumber || mfgConfig?.storeId || 'PENDING',
            storeName: location?.name || 'Store',
            storeAddress: fullAddress,
            storeCity: '',
            storeState: '',
            storeZip: '',
            storePhone: '',
        }

        // Get all tobacco transactions for the week
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfWeek,
                    lte: endOfWeek
                }
            },
            include: {
                lineItems: {
                    where: { type: 'PRODUCT' },
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        // Build scan records from transactions
        const records: TobaccoScanRecord[] = []

        for (const txn of transactions) {
            for (const item of txn.lineItems) {
                const product = item.product
                if (!product?.isTobacco) continue

                const productName = product.name || ''
                const detectedMfg = detectManufacturer(productName)

                // Only include items for the requested manufacturer
                // BUT: Altria and RJR both want ALL tobacco scanned, 
                // they just filter on their side. We submit all for accuracy.
                // Some programs require ALL tobacco regardless of brand.

                const uom = detectUOM(productName, (product as any).unitOfMeasure)
                const price = parseFloat(item.price?.toString() || '0')
                const discount = parseFloat(item.discount?.toString() || '0')

                // Detect multi-pack: same UPC appears more than once in transaction,
                // or quantity > 1, or it's a carton
                const sameUPCCount = txn.lineItems.filter(
                    li => li.product?.barcode === product.barcode
                ).length
                const isMultiPack = item.quantity > 1 || sameUPCCount > 1 || uom === 'CARTON'

                records.push({
                    transactionId: txn.id.substring(0, 12),
                    transactionDate: txn.createdAt,
                    stationId: (txn as any).stationId || 'POS1',
                    productName: productName.toUpperCase(),
                    upc: product.barcode || product.sku || '',
                    category: detectCategory(productName),
                    manufacturer: detectedMfg,
                    unitOfMeasure: uom,
                    quantitySold: item.quantity,
                    sellingPrice: price,
                    discountAmount: discount,
                    discountDescription: (item as any).discountReason || '',
                    isMultiPack,
                    multiPackQty: isMultiPack ? item.quantity : 0,
                    loyaltyId: (txn as any).loyaltyId || '',
                })
            }
        }

        // Filter to manufacturer-specific records
        const mfgRecords = records.filter(r => r.manufacturer === manufacturer)

        // Generate the file
        let fileContent: string
        let fileName: string
        const weekStr = fmtDateSimple(startOfWeek)

        switch (manufacturer) {
            case 'ALTRIA':
                fileContent = generateAltriaFile(store, mfgRecords, endOfWeek)
                fileName = `ALTRIA_SCAN_${store.accountNumber}_${weekStr}.txt`
                break
            case 'RJR':
                fileContent = generateRJRFile(store, mfgRecords)
                fileName = `RJR_SCAN_${store.accountNumber}_${weekStr}.txt`
                break
            case 'ITG':
                fileContent = generateITGFile(store, mfgRecords)
                fileName = `ITG_SCAN_${store.accountNumber}_${weekStr}.txt`
                break
            default:
                fileContent = ''
                fileName = 'scan_data.txt'
        }

        // Return as downloadable file
        return new Response(fileContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'X-Record-Count': String(mfgRecords.length),
                'X-Total-Amount': String(
                    mfgRecords.reduce((s, r) => s + r.sellingPrice * r.quantitySold, 0).toFixed(2)
                ),
            }
        })
    } catch (error) {
        console.error('Failed to export tobacco scan data:', error)
        return NextResponse.json({ error: 'Failed to export scan data' }, { status: 500 })
    }
}

function fmtDateSimple(d: Date): string {
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}
