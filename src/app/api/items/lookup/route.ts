'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Lookup item by barcode or SKU (for POS scanning)
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const barcode = searchParams.get('barcode')
        const sku = searchParams.get('sku')
        const query = searchParams.get('q') // Generic search

        if (!barcode && !sku && !query) {
            return NextResponse.json({ error: 'Provide barcode, sku, or q parameter' }, { status: 400 })
        }

        // Exact barcode match (for scanner)
        if (barcode) {
            const item = await prisma.item.findFirst({
                where: {
                    franchiseId: session.user.franchiseId,
                    barcode,
                    isActive: true
                },
                include: {
                    category: {
                        select: { id: true, name: true, color: true }
                    }
                }
            })

            if (item) {
                return NextResponse.json(item)
            }

            // Not found in local inventory - could trigger external lookup here
            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Exact SKU match
        if (sku) {
            const item = await prisma.item.findFirst({
                where: {
                    franchiseId: session.user.franchiseId,
                    sku,
                    isActive: true
                },
                include: {
                    category: {
                        select: { id: true, name: true, color: true }
                    }
                }
            })

            if (item) {
                return NextResponse.json(item)
            }

            return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Generic search (for typeahead/autocomplete)
        if (query && query.length >= 2) {
            const items = await prisma.item.findMany({
                where: {
                    franchiseId: session.user.franchiseId,
                    isActive: true,
                    OR: [
                        { name: { contains: query } },
                        { barcode: { contains: query } },
                        { sku: { contains: query } },
                        { brand: { contains: query } },
                        { description: { contains: query } }
                    ]
                },
                include: {
                    category: {
                        select: { id: true, name: true, color: true }
                    }
                },
                orderBy: { name: 'asc' },
                take: 20
            })

            return NextResponse.json(items)
        }

        return NextResponse.json([])

    } catch (error) {
        console.error('Error looking up item:', error)
        return NextResponse.json({ error: 'Failed to lookup item' }, { status: 500 })
    }
}

