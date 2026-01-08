import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/tobacco-scan/generate - Generate tobacco scan report for a manufacturer
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.franchiseId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { manufacturer } = await request.json()

        if (!manufacturer || !['ALTRIA', 'RJR', 'ITG'].includes(manufacturer)) {
            return NextResponse.json({ error: 'Invalid manufacturer' }, { status: 400 })
        }

        // Get start and end of current week
        const now = new Date()
        const dayOfWeek = now.getDay()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - dayOfWeek)
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        // Check if submission already exists for this week/manufacturer
        const existingSubmission = await prisma.tobaccoScanSubmission.findFirst({
            where: {
                franchiseId: session.user.franchiseId,
                manufacturer,
                weekStartDate: startOfWeek,
                weekEndDate: endOfWeek
            }
        })

        if (existingSubmission) {
            return NextResponse.json({
                error: 'Submission already exists for this week',
                submission: existingSubmission
            }, { status: 400 })
        }

        // Get all tobacco sales this week
        const transactions = await prisma.transaction.findMany({
            where: {
                franchiseId: session.user.franchiseId,
                status: 'COMPLETED',
                createdAt: {
                    gte: startOfWeek,
                    lte: endOfWeek
                }
            },
            include: {
                lineItems: {
                    where: { type: 'PRODUCT' },
                    include: { product: true }
                }
            }
        })

        // Filter for tobacco products (using isTobacco flag)
        const tobaccoSales = transactions.flatMap(t =>
            t.lineItems.filter(item => item.product?.isTobacco)
        )

        // Manufacturer keywords (simplified - in production use manufacturer field)
        const keywords: Record<string, string[]> = {
            ALTRIA: ['marlboro', 'virginia slims', 'parliament', 'basic', 'l&m'],
            RJR: ['camel', 'newport', 'pall mall', 'doral', 'natural american'],
            ITG: ['kool', 'winston', 'maverick', 'salem', 'usa gold']
        }

        const manufacturerSales = tobaccoSales.filter(item => {
            const name = item.product?.name?.toLowerCase() || ''
            return keywords[manufacturer].some(kw => name.includes(kw))
        })

        const recordCount = manufacturerSales.reduce((sum, item) => sum + item.quantity, 0)
        const totalAmount = manufacturerSales.reduce((sum, item) =>
            sum + (parseFloat(item.price.toString()) * item.quantity), 0
        )

        // Get location
        const location = await prisma.location.findFirst({
            where: { franchise: { id: session.user.franchiseId } }
        })

        if (!location) {
            return NextResponse.json({ error: 'No location found' }, { status: 400 })
        }

        // Create the submission record
        const submission = await prisma.tobaccoScanSubmission.create({
            data: {
                franchiseId: session.user.franchiseId,
                locationId: location.id,
                manufacturer,
                weekStartDate: startOfWeek,
                weekEndDate: endOfWeek,
                recordCount,
                totalAmount,
                status: 'PENDING'
            }
        })

        return NextResponse.json({
            message: 'Report generated successfully',
            submission
        })
    } catch (error) {
        console.error('Failed to generate tobacco report:', error)
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
}

