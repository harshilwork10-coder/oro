import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch sales restrictions for locations
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let franchiseId: string | null = null
        if (user.role !== 'PROVIDER' && user.franchiseId) {
            franchiseId = user.franchiseId
        }

        // Get locations with their settings
        const locations = await prisma.location.findMany({
            where: franchiseId ? { franchiseId } : {},
            select: {
                id: true,
                name: true,
                franchiseId: true
            }
        })

        // Get franchise settings (stored in franchise metadata or separate table)
        // For now, return default restrictions that can be customized
        // In production, these would be stored in db
        const defaultRestrictions = {
            alcohol: {
                enabled: true,
                minimumAge: 21,
                sundayStart: '12:00', // Can't sell before this time
                sundayEnd: '23:59',
                weekdayStart: '06:00',
                weekdayEnd: '02:00', // 2 AM next day
                requireIDScan: true,
                idOverrideRequiresManager: false
            },
            tobacco: {
                enabled: true,
                minimumAge: 21,
                requireIDScan: true
            },
            lottery: {
                enabled: true,
                minimumAge: 18
            }
        }

        // Return locations with their restriction settings
        const locationSettings = locations.map(loc => ({
            id: loc.id,
            name: loc.name,
            restrictions: defaultRestrictions // In production, fetch per-location settings
        }))

        return NextResponse.json({
            locations: locationSettings,
            defaultRestrictions
        })

    } catch (error) {
        console.error('Sales restrictions GET error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PUT - Update sales restrictions for a location
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { locationId, restrictions, applyToAll } = body

        // In production, save these to a LocationSettings or SalesRestrictions table
        // For now, we'll log the intent
        console.log('Sales restrictions updated:', {
            locationId,
            restrictions,
            applyToAll,
            updatedBy: user.id
        })

        // Create audit event for the change
        const franchiseId = user.franchiseId
        if (franchiseId && locationId) {
            try {
                await prisma.auditEvent.create({
                    data: {
                        locationId,
                        franchiseId,
                        eventType: 'SETTINGS_CHANGE',
                        severity: 'MEDIUM',
                        employeeId: user.id,
                        employeeName: user.name,
                        details: JSON.stringify({
                            type: 'salesRestrictions',
                            restrictions,
                            applyToAll
                        })
                    }
                })
            } catch (e) {
                // Audit optional
            }
        }

        return NextResponse.json({
            success: true,
            message: applyToAll ? 'Applied to all locations' : 'Settings saved'
        })

    } catch (error) {
        console.error('Sales restrictions PUT error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// POST - Check if a sale is allowed (called from POS)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { locationId, productType, currentTime } = body
        // productType: 'alcohol', 'tobacco', 'lottery'

        const now = currentTime ? new Date(currentTime) : new Date()
        const dayOfWeek = now.getDay() // 0 = Sunday
        const timeStr = now.toTimeString().slice(0, 5) // "14:30"

        let allowed = true
        let reason = ''

        if (productType === 'alcohol') {
            // Sunday restriction (common in many states)
            if (dayOfWeek === 0) { // Sunday
                const sundayStart = '12:00'
                if (timeStr < sundayStart) {
                    allowed = false
                    reason = `Alcohol sales not allowed before ${sundayStart} on Sundays`
                }
            }

            // Late night restriction
            const lateNightCutoff = '02:00'
            if (timeStr >= '02:00' && timeStr < '06:00') {
                allowed = false
                reason = 'Alcohol sales not allowed between 2 AM and 6 AM'
            }
        }

        return NextResponse.json({
            allowed,
            reason,
            productType,
            checkedAt: now.toISOString()
        })

    } catch (error) {
        console.error('Sales restriction check error:', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

