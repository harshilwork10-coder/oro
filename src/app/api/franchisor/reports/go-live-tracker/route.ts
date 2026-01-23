import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Go-Live Tracker API
 * Returns pending locations with checklist status for franchisor dashboards
 */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Get franchisor ID
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                franchisorMemberships: {
                    include: { franchisor: true }
                }
            }
        }) as any

        const franchisorId = user?.franchisorMemberships?.[0]?.franchisor?.id
        if (!franchisorId) {
            return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
        }

        // Get all non-active locations with provisioning details
        const pendingLocations = await prisma.location.findMany({
            where: {
                franchisorId,
                provisioningStatus: { not: 'ACTIVE' }
            },
            include: {
                stations: { select: { id: true, name: true } },
                franchise: { select: { id: true, name: true } },
                provisioningTasks: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'asc' }
        })

        // Build checklist for each location
        const locations = pendingLocations.map(loc => {
            const task = loc.provisioningTasks[0]
            const daysStuck = task
                ? Math.floor((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                : Math.floor((Date.now() - new Date(loc.createdAt).getTime()) / (1000 * 60 * 60 * 24))

            // Checklist items
            const checklist = {
                stationsCreated: loc.stations.length > 0,
                pairingDone: loc.provisioningStatus === 'READY_FOR_INSTALL' || loc.provisioningStatus === 'ACTIVE',
                midTidAssigned: false, // Would check paymentTerminal config
                serviceMenuPublished: true, // Default true, check if has services
                stylistRosterComplete: true, // Would check employee count
                hoursSet: !!loc.hours,
                testAppointment: false, // Would check for test appointment
                testCheckout: false, // Would check for test transaction
            }

            const completedSteps = Object.values(checklist).filter(Boolean).length
            const totalSteps = Object.keys(checklist).length

            return {
                id: loc.id,
                name: loc.name,
                address: loc.address,
                franchisee: loc.franchise?.name || 'Unknown LLC',
                status: loc.provisioningStatus,
                taskStatus: task?.status || 'OPEN',
                daysStuck,
                checklist,
                progress: `${completedSteps}/${totalSteps}`,
                progressPercent: Math.round((completedSteps / totalSteps) * 100),
                createdAt: loc.createdAt
            }
        })

        // Summary stats
        const summary = {
            total: locations.length,
            provisioningPending: locations.filter(l => l.status === 'PROVISIONING_PENDING').length,
            readyForInstall: locations.filter(l => l.status === 'READY_FOR_INSTALL').length,
            stuckOver7Days: locations.filter(l => l.daysStuck > 7).length,
        }

        return NextResponse.json({
            success: true,
            data: {
                summary,
                locations
            }
        })

    } catch (error) {
        console.error('Go-Live Tracker API error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
