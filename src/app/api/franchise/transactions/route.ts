import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        if (!authUser?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: authUser.email },
            include: { franchise: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const search = searchParams.get('search') || ''
        const filterType = searchParams.get('filterType') || 'all'
        const status = searchParams.get('status')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        const skip = (page - 1) * limit

        const where: Prisma.TransactionWhereInput = {
            franchiseId: user.franchiseId,
        }

        if (search) {
            // Smart filter based on filterType
            switch (filterType) {
                case 'card':
                    where.OR = [
                        { id: { contains: search } },
                    ]
                    break
                case 'invoice':
                    where.invoiceNumber = { contains: search }
                    break
                case 'phone':
                    where.client = {
                        phone: { contains: search }
                    }
                    break
                default:
                    where.OR = [
                        { id: { contains: search } },
                        { client: { firstName: { contains: search } } },
                        { client: { lastName: { contains: search } } },
                        { client: { email: { contains: search } } },
                    ]
            }
        }

        if (status) {
            where.status = status
        }

        if (startDate || endDate) {
            where.createdAt = {}
            if (startDate) where.createdAt.gte = new Date(startDate)
            if (endDate) where.createdAt.lte = new Date(endDate)
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    client: true,
                    employee: true,
                    lineItems: {
                        include: {
                            service: true,
                            product: true,
                            staff: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.transaction.count({ where })
        ])

        return NextResponse.json({
            transactions,
            pagination: {
                total,
                pages: Math.ceil(total / limit),
                page,
                limit
            }
        })
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
