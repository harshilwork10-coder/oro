import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                // Legacy 1:1 relation (for backward compatibility)
                franchisor: {
                    select: {
                        id: true,
                        approvalStatus: true,
                        processingType: true,
                        voidCheckUrl: true,
                        driverLicenseUrl: true,
                        feinLetterUrl: true
                    }
                },
                // NEW: Multi-business memberships
                franchisorMemberships: {
                    include: {
                        franchisor: {
                            select: {
                                id: true,
                                name: true,
                                businessType: true,
                                logoUrl: true,
                                approvalStatus: true
                            }
                        }
                    }
                },
                franchise: {
                    select: {
                        approvalStatus: true
                    }
                }
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // PROVIDER, ADMIN, EMPLOYEE, MANAGER are always approved (no onboarding needed)
        if (['PROVIDER', 'ADMIN', 'EMPLOYEE', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({
                status: 'APPROVED',
                processingType: 'POS_AND_PROCESSING',
                documents: {},
                memberships: []
            })
        }

        let status = 'PENDING'
        let documents = {}
        let processingType = 'POS_AND_PROCESSING'

        // Format memberships for frontend
        const memberships = user.franchisorMemberships.map(m => ({
            id: m.id,
            role: m.role,
            isPrimary: m.isPrimary,
            franchisor: {
                id: m.franchisor.id,
                name: m.franchisor.name || 'Unnamed Business',
                businessType: m.franchisor.businessType,
                logoUrl: m.franchisor.logoUrl,
                approvalStatus: m.franchisor.approvalStatus
            }
        }))

        // Check membership status - use first approved business or legacy franchisor
        if (memberships.length > 0) {
            // Find first approved business
            const approvedMembership = memberships.find(m => m.franchisor.approvalStatus === 'APPROVED')
            const primaryMembership = memberships.find(m => m.isPrimary) || memberships[0]

            status = approvedMembership ? 'APPROVED' : (primaryMembership?.franchisor.approvalStatus || 'PENDING')

            // Provider-created accounts: Provider handles all documents, so mark as complete
            documents = {
                voidCheck: true,
                dl: true,
                feinLetter: true
            }
        } else if (user.franchisor) {
            // Legacy: Check 1:1 franchisor relation
            status = user.franchisor.approvalStatus || 'PENDING'
            processingType = user.franchisor.processingType || 'POS_AND_PROCESSING'
            documents = {
                voidCheck: !!user.franchisor.voidCheckUrl,
                dl: !!user.franchisor.driverLicenseUrl,
                feinLetter: !!user.franchisor.feinLetterUrl
            }
        } else if (user.franchise && (user.franchise as any).approvalStatus) {
            // Franchise status check (for location managers)
            status = (user.franchise as any).approvalStatus
        }

        return NextResponse.json({
            status,
            processingType,
            documents,
            memberships,
            // Helper flags for frontend
            hasMultipleBusinesses: memberships.length > 1,
            needsBusinessSelection: memberships.length > 1
        })

    } catch (error) {
        console.error('Error fetching auth status:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
