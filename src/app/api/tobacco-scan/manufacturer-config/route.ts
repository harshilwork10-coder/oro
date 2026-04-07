import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

/**
 * GET  /api/tobacco-scan/manufacturer-config — List manufacturer configs
 * POST /api/tobacco-scan/manufacturer-config — Create/update manufacturer config (upsert)
 */

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const configs = await prisma.manufacturerConfig.findMany({
      where: { franchiseId: user.franchiseId },
    })

    // Mask API keys for safety
    const maskedConfigs = configs.map(config => ({
      ...config,
      apiKey: config.apiKey ? '••••••••' : null,
      apiSecret: config.apiSecret ? '••••••••' : null,
    }))

    return NextResponse.json({ configs: maskedConfigs })
  } catch (error) {
    console.error('[MANUFACTURER_CONFIG_GET]', error)
    return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      manufacturer,
      storeId,
      accountNumber,
      apiKey,
      apiSecret,
      portalUrl,
      rebatePerPack,
      rebatePerCarton,
      loyaltyBonus,
    } = body

    if (!manufacturer) {
      return NextResponse.json({ error: 'Manufacturer is required' }, { status: 400 })
    }

    const config = await prisma.manufacturerConfig.upsert({
      where: {
        franchiseId_manufacturer: {
          franchiseId: user.franchiseId,
          manufacturer,
        },
      },
      update: {
        storeId: storeId || undefined,
        accountNumber: accountNumber || undefined,
        apiKey: apiKey && apiKey !== '••••••••' ? apiKey : undefined,
        apiSecret: apiSecret && apiSecret !== '••••••••' ? apiSecret : undefined,
        portalUrl: portalUrl || undefined,
        rebatePerPack: rebatePerPack ?? 0.04,
        rebatePerCarton: rebatePerCarton ?? 0.40,
        loyaltyBonus: loyaltyBonus ?? 0,
      },
      create: {
        franchiseId: user.franchiseId,
        manufacturer,
        storeId: storeId || null,
        accountNumber: accountNumber || null,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        portalUrl: portalUrl || null,
        rebatePerPack: rebatePerPack ?? 0.04,
        rebatePerCarton: rebatePerCarton ?? 0.40,
        loyaltyBonus: loyaltyBonus ?? 0,
      },
    })

    return NextResponse.json({
      config: {
        ...config,
        apiKey: config.apiKey ? '••••••••' : null,
        apiSecret: config.apiSecret ? '••••••••' : null,
      },
    })
  } catch (error) {
    console.error('[MANUFACTURER_CONFIG_POST]', error)
    return NextResponse.json({ data: null, warning: 'Service temporarily unavailable' })
  }
}
