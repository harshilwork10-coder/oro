import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET  /api/loyalty/redeem-tiers — List redeem tiers for the franchise's program
 * POST /api/loyalty/redeem-tiers — Create a new tier
 * PATCH /api/loyalty/redeem-tiers — Update a tier (toggle active, edit fields)
 * DELETE /api/loyalty/redeem-tiers?id=xxx — Delete a tier
 */

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { franchiseId: user.franchiseId },
    })
    if (!program) return NextResponse.json({ tiers: [] })

    const tiers = await prisma.loyaltyRedeemTier.findMany({
      where: { programId: program.id },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ tiers, programId: program.id })
  } catch (error) {
    console.error('[REDEEM_TIERS_GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, pointsRequired, rewardType, rewardValue, minBasketAmount, maxPerDay } = body

    if (!name || !pointsRequired || !rewardValue) {
      return NextResponse.json({ error: 'name, pointsRequired, and rewardValue are required' }, { status: 400 })
    }

    const program = await prisma.loyaltyProgram.findUnique({
      where: { franchiseId: user.franchiseId },
    })
    if (!program) return NextResponse.json({ error: 'Loyalty program not found' }, { status: 404 })

    // Auto-sort: higher points = higher sortOrder
    const existingCount = await prisma.loyaltyRedeemTier.count({ where: { programId: program.id } })

    const tier = await prisma.loyaltyRedeemTier.create({
      data: {
        programId: program.id,
        name,
        pointsRequired: parseInt(pointsRequired),
        rewardType: rewardType || 'AMOUNT_OFF',
        rewardValue: parseFloat(rewardValue),
        minBasketAmount: minBasketAmount ? parseFloat(minBasketAmount) : null,
        maxPerDay: maxPerDay ? parseInt(maxPerDay) : null,
        sortOrder: existingCount,
      },
    })

    return NextResponse.json({ success: true, tier }, { status: 201 })
  } catch (error) {
    console.error('[REDEEM_TIERS_POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'Tier ID required' }, { status: 400 })

    // Verify ownership
    const tier = await prisma.loyaltyRedeemTier.findUnique({
      where: { id },
      include: { program: true },
    })
    if (!tier || tier.program.franchiseId !== user.franchiseId) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    const data: any = {}
    if (updates.isActive !== undefined) data.isActive = updates.isActive
    if (updates.name) data.name = updates.name
    if (updates.pointsRequired) data.pointsRequired = parseInt(updates.pointsRequired)
    if (updates.rewardType) data.rewardType = updates.rewardType
    if (updates.rewardValue) data.rewardValue = parseFloat(updates.rewardValue)
    if (updates.minBasketAmount !== undefined) data.minBasketAmount = updates.minBasketAmount ? parseFloat(updates.minBasketAmount) : null
    if (updates.maxPerDay !== undefined) data.maxPerDay = updates.maxPerDay ? parseInt(updates.maxPerDay) : null

    const updated = await prisma.loyaltyRedeemTier.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, tier: updated })
  } catch (error) {
    console.error('[REDEEM_TIERS_PATCH]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!['OWNER', 'MANAGER', 'PROVIDER', 'FRANCHISOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Tier ID required' }, { status: 400 })

    const tier = await prisma.loyaltyRedeemTier.findUnique({
      where: { id },
      include: { program: true },
    })
    if (!tier || tier.program.franchiseId !== user.franchiseId) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    await prisma.loyaltyRedeemTier.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[REDEEM_TIERS_DELETE]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
