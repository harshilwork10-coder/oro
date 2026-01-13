import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const locationId = searchParams.get('locationId')

        if (!locationId) {
            return NextResponse.json({ error: 'Location ID required' }, { status: 400 })
        }

        // Mock data for demo - real implementation would query InventoryItem where quantity <= reorderPoint
        const alerts = [
            {
                id: '1',
                productName: 'Shampoo Volumizing',
                currentStock: 3,
                reorderPoint: 5,
                supplier: 'Beauty Supply Co',
                lastOrdered: new Date(Date.now() - 86400000 * 14).toISOString()
            },
            {
                id: '2',
                productName: 'Conditioner Moisturizing',
                currentStock: 2,
                reorderPoint: 5,
                supplier: 'Beauty Supply Co',
                lastOrdered: new Date(Date.now() - 86400000 * 20).toISOString()
            },
            {
                id: '3',
                productName: 'Hair Spray Strong Hold',
                currentStock: 0,
                reorderPoint: 10,
                supplier: 'Salon Essentials',
                lastOrdered: new Date(Date.now() - 86400000 * 30).toISOString()
            }
        ]

        return NextResponse.json(alerts)
    } catch (error) {
        console.error('Error fetching inventory alerts:', error)
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { productId, reorderPoint } = body

        // In real app: Update InventoryItem reorderPoint
        // Debug log removed

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating reorder point:', error)
        return NextResponse.json({ error: 'Failed to update reorder point' }, { status: 500 })
    }
}

