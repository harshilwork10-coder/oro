import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { postInvoice, voidInvoice } from '@/lib/invoice-poster'

/**
 * GET /api/invoices/[id]
 * Invoice detail with all line items, match status, cost alerts
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const franchiseId = (user as { franchiseId?: string }).franchiseId

    const invoice = await prisma.vendorInvoice.findFirst({
      where: { id, franchiseId },
      include: {
        supplier: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        inboundFile: { select: { id: true, filename: true, sourceType: true, createdAt: true } },
        items: {
          orderBy: { lineNumber: 'asc' },
          include: {
            // No direct relation on VendorInvoiceItem to Product,
            // so we fetch matched product data separately
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Enrich items with matched product names
    const matchedProductIds = invoice.items
      .map(i => i.matchedProductId || i.autoCreatedProductId)
      .filter(Boolean) as string[]

    const products = matchedProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: matchedProductIds } },
          select: { id: true, name: true, stock: true, cost: true, barcode: true, isActive: true }
        })
      : []

    const productMap = new Map(products.map(p => [p.id, p]))

    const enrichedItems = invoice.items.map(item => ({
      ...item,
      matchedProduct: item.matchedProductId ? productMap.get(item.matchedProductId) || null : null,
      autoCreatedProduct: item.autoCreatedProductId ? productMap.get(item.autoCreatedProductId) || null : null
    }))

    // Posting readiness summary
    const readinessSummary = {
      matchedLines: invoice.matchedItems,
      newProducts: invoice.newItems,
      costAlerts: invoice.costAlertItems,
      errors: invoice.errorItems,
      discrepancyOk: invoice.discrepancyOk,
      discrepancy: invoice.discrepancy,
      canPost: invoice.status === 'READY_TO_POST' || invoice.status === 'REVIEW_REQUIRED',
      blockedReasons: [] as string[]
    }

    if (invoice.status === 'POSTED') readinessSummary.blockedReasons.push('Already posted')
    if (invoice.status === 'VOIDED') readinessSummary.blockedReasons.push('Invoice has been voided')
    if (!invoice.discrepancyOk && invoice.discrepancy && Number(invoice.discrepancy) > 1) {
      readinessSummary.blockedReasons.push(`Total discrepancy: $${Number(invoice.discrepancy).toFixed(2)}`)
    }
    if (invoice.matchedItems === 0) readinessSummary.blockedReasons.push('No matched items to post')

    return NextResponse.json({
      invoice: {
        ...invoice,
        items: enrichedItems
      },
      readinessSummary
    })

  } catch (error) {
    console.error('Invoice detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 })
  }
}

/**
 * PATCH /api/invoices/[id]
 * Approve (post) or void an invoice
 * Role: OWNER only
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = (user as { role?: string }).role
    if (!role || !['OWNER', 'PROVIDER'].includes(role)) {
      return NextResponse.json({ error: 'Only OWNER can approve/void invoices' }, { status: 403 })
    }

    const { id } = await params
    const franchiseId = (user as { franchiseId?: string }).franchiseId
    if (!franchiseId) {
      return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
    }

    const body = await request.json()
    const { action, reason, locationId } = body

    // Verify invoice belongs to this franchise
    const invoice = await prisma.vendorInvoice.findFirst({
      where: { id, franchiseId }
    })
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const userId = user.id || user.email || 'unknown'
    const loc = locationId || invoice.locationId

    if (!loc) {
      return NextResponse.json({ error: 'locationId required for stock updates' }, { status: 400 })
    }

    if (action === 'post' || action === 'approve') {
      const result = await postInvoice(prisma, id, userId, loc)
      return NextResponse.json(result)
    }

    if (action === 'void') {
      if (!reason) {
        return NextResponse.json({ error: 'Void reason is required' }, { status: 400 })
      }
      const result = await voidInvoice(prisma, id, userId, reason, loc)
      return NextResponse.json(result)
    }

    // Status transitions (non-posting)
    if (action === 'mark_ready') {
      await prisma.vendorInvoice.update({
        where: { id },
        data: { status: 'READY_TO_POST' }
      })
      return NextResponse.json({ success: true, status: 'READY_TO_POST' })
    }

    return NextResponse.json({ error: 'Invalid action. Use: post, void, or mark_ready' }, { status: 400 })

  } catch (error) {
    console.error('Invoice action error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
