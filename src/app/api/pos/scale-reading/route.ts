import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'

/**
 * POST /api/pos/scale-reading — Parse a weight reading from the POS
 * Used by POS terminals to send scale weight for weighted items
 * Body: { weight: number, unit: 'lb' | 'kg' | 'oz', itemId?: string }
 */
export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { weight, unit, itemId, pricePerUnit } = body

        if (!weight || weight <= 0) {
            return NextResponse.json({ error: 'Valid weight required' }, { status: 400 })
        }

        const validUnits = ['lb', 'kg', 'oz']
        const normalizedUnit = (unit || 'lb').toLowerCase()
        if (!validUnits.includes(normalizedUnit)) {
            return NextResponse.json({ error: 'Unit must be lb, kg, or oz' }, { status: 400 })
        }

        // Convert to lbs for standardized pricing if needed
        let weightInLbs = weight
        if (normalizedUnit === 'kg') weightInLbs = weight * 2.20462
        else if (normalizedUnit === 'oz') weightInLbs = weight / 16

        const total = pricePerUnit ? Math.round(weightInLbs * pricePerUnit * 100) / 100 : null

        return NextResponse.json({
            weight,
            unit: normalizedUnit,
            weightInLbs: Math.round(weightInLbs * 10000) / 10000,
            itemId: itemId || null,
            pricePerUnit: pricePerUnit || null,
            total,
            timestamp: new Date().toISOString()
        })
    } catch (error: any) {
        console.error('[SCALE_READING_POST]', error)
        return NextResponse.json({ error: 'Failed to process scale reading' }, { status: 500 })
    }
}

/**
 * GET /api/pos/scale-reading — Return scale config for the station
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    return NextResponse.json({
        supported: true,
        protocols: ['CAS', 'METTLER_TOLEDO', 'FAIRBANKS', 'GENERIC'],
        defaultConfig: {
            protocol: 'CAS',
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            unit: 'lb'
        }
    })
}
