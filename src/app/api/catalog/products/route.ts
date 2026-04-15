import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!session || (user.role !== 'FRANCHISOR' && user.role !== 'PROVIDER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const globalProducts = await prisma.globalProduct.findMany({
            where: { isArchived: false },
            include: {
                _count: {
                    select: { localInstances: true }
                }
            }
        })

        return NextResponse.json(globalProducts)
    } catch (error) {
        console.error('Error fetching global products:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    if (!session || (user.role !== 'FRANCHISOR' && user.role !== 'PROVIDER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { name, description, defaultPrice, defaultCost, sku, category, franchisorId } = body

        if (!name || !defaultPrice || !franchisorId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const newProduct = await prisma.globalProduct.create({
            data: {
                name,
                description,
                defaultPrice: parseFloat(defaultPrice),
                defaultCost: defaultCost ? parseFloat(defaultCost) : null,
                sku,
                category,
                franchisorId
            }
        })

        return NextResponse.json(newProduct)
    } catch (error) {
        console.error('Error creating global product:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

