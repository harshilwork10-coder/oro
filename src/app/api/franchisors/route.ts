import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only PROVIDER can view all franchisors
        if (session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Parse pagination params
        const searchParams = request.nextUrl.searchParams
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const skip = (page - 1) * limit

        // Get total count for pagination metadata
        const total = await prisma.franchisor.count()

        const franchisors = await prisma.franchisor.findMany({
            skip,
            take: limit,
            select: {
                id: true,
                ownerId: true, // Needed for password reset
                name: true,
                approvalStatus: true,
                accountStatus: true,       // Account suspension status
                suspendedReason: true,     // Reason for suspension
                createdAt: true,

                // Business Info
                businessType: true,
                address: true,
                phone: true,

                // Processing & Tax
                ssn: true,
                fein: true,
                routingNumber: true,
                accountNumber: true,

                // Documents
                voidCheckUrl: true,
                driverLicenseUrl: true,
                feinLetterUrl: true,

                owner: {
                    select: {
                        name: true,
                        email: true,
                        magicLinks: {
                            where: {
                                expiresAt: {
                                    gt: new Date()
                                }
                            },
                            orderBy: {
                                createdAt: 'desc'
                            },
                            take: 1,
                            select: {
                                token: true
                            }
                        }
                    }
                },
                // Include franchises with locations for expandable cards
                franchises: {
                    select: {
                        id: true,
                        name: true,
                        locations: {
                            select: {
                                id: true,
                                name: true,
                                address: true,
                                slug: true,
                                voidCheckUrl: true, // Per-location document status
                                _count: {
                                    select: {
                                        stations: true
                                    }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        franchises: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({
            data: franchisors,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Error fetching franchisors:', error)
        return NextResponse.json(
            { error: 'Failed to fetch franchisors' },
            { status: 500 }
        )
    }
}

