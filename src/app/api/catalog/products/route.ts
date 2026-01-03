import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'FRANCHISOR' && session.user.role !== 'PROVIDER')) {
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
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'FRANCHISOR' && session.user.role !== 'PROVIDER')) {
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

