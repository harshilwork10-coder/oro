import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/invoices
 * List all vendor invoices for the franchise with filters
 */
export async function GET(request: Request) {
  try {
        const user = await getAuthUser(request)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const franchiseId = (user as { franchiseId?: string }).franchiseId
    if (!franchiseId) {
      return NextResponse.json({ error: 'No franchise context' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const vendor = searchParams.get('vendor')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = { franchiseId }
    if (status) where.status = status
    if (vendor) where.vendorName = { contains: vendor, mode: 'insensitive' }

    const [invoices, total] = await Promise.all([
      prisma.vendorInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          supplier: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          _count: { select: { items: true } }
        }
      }),
      prisma.vendorInvoice.count({ where })
    ])

    // Summary stats
    const stats = await prisma.vendorInvoice.groupBy({
      by: ['status'],
      where: { franchiseId },
      _count: true,
      _sum: { totalAmount: true }
    })

    return NextResponse.json({
      invoices,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      stats: Object.fromEntries(stats.map(s => [s.status, {
        count: s._count,
        total: s._sum.totalAmount
      }]))
    })

  } catch (error) {
    console.error('Invoice list error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}
