import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/inventory/suppliers - List all suppliers
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const suppliers = await prisma.supplier.findMany({
            where: { franchiseId: session.user.franchiseId },
            include: {
                _count: {
                    select: { purchaseOrders: true }
                }
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ suppliers })
    } catch (error) {
        console.error('Failed to fetch suppliers:', error)
        return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
    }
}

// POST /api/inventory/suppliers - Create new supplier
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, email, phone, contactName, address } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 })
        }

        const supplier = await prisma.supplier.create({
            data: {
                franchiseId: session.user.franchiseId,
                name,
                email: email || null,
                phone: phone || null,
                contactName: contactName || null,
                address: address || null
            }
        })

        return NextResponse.json({ supplier })
    } catch (error) {
        console.error('Failed to create supplier:', error)
        return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
    }
}

