import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth' // Adjust path if needed
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
                franchisor: {
                    select: {
                        approvalStatus: true,
                        needToDiscussProcessing: true,
                        voidCheckUrl: true,
                        driverLicenseUrl: true,
                        feinLetterUrl: true
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

        let status = 'PENDING'
        let documents = {}
        let needToDiscussProcessing = false

        // Check if user is franchisor owner
        if (user.franchisor) {
            status = user.franchisor.approvalStatus || 'PENDING'
            needToDiscussProcessing = user.franchisor.needToDiscussProcessing || false
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
            needToDiscussProcessing,
            documents
        })

    } catch (error) {
        console.error('Error fetching auth status:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
