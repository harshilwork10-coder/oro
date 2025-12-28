import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSMS } from '@/lib/sms'

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 3 // Max promotions per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(franchiseId: string): boolean {
    const now = Date.now()
    const existing = rateLimitMap.get(franchiseId)

    if (!existing || now > existing.resetTime) {
        rateLimitMap.set(franchiseId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
        return true
    }

    if (existing.count >= RATE_LIMIT) {
        return false
    }

    existing.count++
    return true
}

// POST - Send product promotion to selected customers
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true, role: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise assigned' }, { status: 400 })
        }

        // Only owners/managers can send promotions
        if (!['OWNER', 'MANAGER', 'ADMIN', 'PROVIDER'].includes(user.role)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        // Rate limiting
        if (!checkRateLimit(user.franchiseId)) {
            return NextResponse.json({
                error: 'Rate limit exceeded. Max 3 promotions per hour.',
                success: false
            }, { status: 429 })
        }

        const body = await request.json()
        const { productId, productName, audience, customMessage } = body

        if (!productName) {
            return NextResponse.json({ error: 'Product name required' }, { status: 400 })
        }

        // Get store name
        const franchise = await prisma.franchise.findUnique({
            where: { id: user.franchiseId },
            select: {
                name: true,
                settings: { select: { storeDisplayName: true } }
            }
        })
        const storeName = franchise?.settings?.storeDisplayName || franchise?.name || 'our store'

        // Find customers based on audience type
        let customers: { id: string; firstName: string | null; phone: string | null }[] = []

        if (audience === 'all') {
            customers = await prisma.client.findMany({
                where: {
                    franchiseId: user.franchiseId,
                    phone: { not: null }
                },
                select: { id: true, firstName: true, phone: true }
            })
        } else if (audience === 'vip') {
            const allClients = await prisma.client.findMany({
                where: {
                    franchiseId: user.franchiseId,
                    phone: { not: null }
                },
                include: {
                    transactions: {
                        select: { total: true }
                    }
                }
            })

            const clientsWithSpend = allClients.map(c => ({
                ...c,
                totalSpend: c.transactions.reduce((sum, t) => sum + Number(t.total), 0)
            })).sort((a, b) => b.totalSpend - a.totalSpend)

            const vipCount = Math.ceil(clientsWithSpend.length * 0.2)
            customers = clientsWithSpend.slice(0, vipCount)
        } else if (audience === 'category' && productId) {
            const product = await prisma.product.findUnique({
                where: { id: productId },
                select: { categoryId: true }
            })

            if (product?.categoryId) {
                const categoryBuyers = await prisma.transactionLineItem.findMany({
                    where: {
                        product: {
                            categoryId: product.categoryId,
                            franchiseId: user.franchiseId
                        }
                    },
                    select: {
                        transaction: {
                            select: {
                                client: {
                                    select: { id: true, firstName: true, phone: true }
                                }
                            }
                        }
                    },
                    distinct: ['transactionId']
                })

                const uniqueCustomers = new Map()
                categoryBuyers.forEach(item => {
                    if (item.transaction?.client?.phone) {
                        uniqueCustomers.set(item.transaction.client.id, item.transaction.client)
                    }
                })
                customers = Array.from(uniqueCustomers.values())
            }
        }

        if (customers.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No customers found for this audience',
                sentCount: 0
            })
        }

        // Build message with Reply STOP for compliance
        const baseMessage = customMessage ||
            `🆕 ${productName} just arrived at ${storeName}!\n\nCome check it out! 🏪`

        // Add unsubscribe option for promotional messages
        const message = `${baseMessage}\n\nReply STOP to unsubscribe`

        // Limit to prevent timeout (max 50 at a time for now)
        const MAX_BATCH = 50
        const customersToSend = customers.slice(0, MAX_BATCH)
        const wasLimited = customers.length > MAX_BATCH

        // Send SMS to selected customers
        let successCount = 0
        let failCount = 0
        const errors: string[] = []

        for (const customer of customersToSend) {
            if (!customer.phone) continue

            try {
                const result = await sendSMS(customer.phone, message, user.franchiseId)
                if (result.success) {
                    successCount++
                } else {
                    failCount++
                    if (result.error) errors.push(result.error)
                }
            } catch (e) {
                failCount++
            }

            // Small delay between sends
            await new Promise(resolve => setTimeout(resolve, 50))
        }

        return NextResponse.json({
            success: true,
            sentCount: successCount,
            failedCount: failCount,
            totalCustomers: customersToSend.length,
            wasLimited,
            originalCount: customers.length,
            errors: errors.slice(0, 3)
        })
    } catch (error) {
        console.error('Product promotion error:', error)
        return NextResponse.json({ error: 'Failed to send promotion' }, { status: 500 })
    }
}

// GET - Get customer counts for different audiences + SMS credits
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { franchiseId: true }
        })

        if (!user?.franchiseId) {
            return NextResponse.json({ error: 'No franchise' }, { status: 400 })
        }

        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')

        // Count all customers with phones
        const allCount = await prisma.client.count({
            where: {
                franchiseId: user.franchiseId,
                phone: { not: null }
            }
        })

        // VIP = top 20%
        const vipCount = Math.ceil(allCount * 0.2)

        // Category buyers count
        let categoryCount = 0
        let hasCategory = false
        if (productId) {
            const product = await prisma.product.findUnique({
                where: { id: productId },
                select: { categoryId: true }
            })

            hasCategory = !!product?.categoryId

            if (product?.categoryId) {
                const categoryBuyers = await prisma.transactionLineItem.findMany({
                    where: {
                        product: {
                            categoryId: product.categoryId,
                            franchiseId: user.franchiseId
                        },
                        transaction: {
                            client: {
                                phone: { not: null }
                            }
                        }
                    },
                    select: {
                        transaction: {
                            select: { clientId: true }
                        }
                    },
                    distinct: ['transactionId']
                })

                const uniqueClients = new Set(
                    categoryBuyers
                        .map(b => b.transaction?.clientId)
                        .filter(Boolean)
                )
                categoryCount = uniqueClients.size
            }
        }

        // Get SMS credits remaining
        let creditsRemaining = 0
        try {
            const smsCredits = await prisma.smsCredits.findUnique({
                where: { franchiseId: user.franchiseId }
            })
            creditsRemaining = smsCredits?.creditsRemaining || 0
        } catch {
            // SMS credits table might not exist
        }

        return NextResponse.json({
            all: allCount,
            vip: vipCount,
            category: categoryCount,
            hasCategory,
            creditsRemaining
        })
    } catch (error) {
        console.error('Audience count error:', error)
        return NextResponse.json({ all: 0, vip: 0, category: 0, creditsRemaining: 0 })
    }
}
