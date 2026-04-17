import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auditLog } from '@/lib/audit'
import { computeShiftSummary } from '@/lib/pos/shiftUtils'

export async function POST(req: NextRequest) {
    // Support both session (web) and Bearer token (mobile)
    const user = await getAuthUser(req)

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch fresh user data to ensure we have the latest locationId
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, locationId: true, franchiseId: true }
    })

    if (!dbUser?.locationId && !dbUser?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized: No Location/Franchise context' }, { status: 401 })
    }

    const locationId = dbUser.locationId

    try {
        const body = await req.json()
        const { action, amount, notes, stationId, stationName } = body

        if (action === 'OPEN') {
            let finalLocationId = locationId

            if (!finalLocationId && user.franchiseId) {
                const firstLocation = await prisma.location.findFirst({
                    where: { franchiseId: user.franchiseId }
                })
                if (!firstLocation) {
                    return NextResponse.json({ error: 'No location found for this franchise' }, { status: 400 })
                }
                finalLocationId = firstLocation.id
            }

            if (!finalLocationId) {
                return NextResponse.json({ error: 'Location ID required to open shift' }, { status: 400 })
            }

            // Check if already open
            const existing = await prisma.cashDrawerSession.findFirst({
                where: {
                    locationId: finalLocationId,
                    status: 'OPEN',
                    employeeId: user.id
                }
            })
            if (existing) return NextResponse.json({ error: 'Shift already open' }, { status: 400 })

            // S2-5: Check if station already has an open shift (by another employee)
            if (stationId) {
                const stationShift = await prisma.cashDrawerSession.findFirst({
                    where: {
                        locationId: finalLocationId,
                        status: 'OPEN',
                        notes: { contains: `[STATION:${stationId}]` }
                    }
                })
                if (stationShift) {
                    return NextResponse.json({
                        error: `Station "${stationName || stationId}" already has an open shift`
                    }, { status: 400 })
                }
            }

            const stationTag = stationId ? `[STATION:${stationId}] ${stationName || 'Unknown Station'}` : ''
            const newSession = await prisma.cashDrawerSession.create({
                data: {
                    locationId: finalLocationId,
                    employeeId: user.id,
                    startingCash: amount,
                    status: 'OPEN',
                    notes: stationTag ? `${stationTag}${notes ? `\n${notes}` : ''}` : notes
                }
            })

            await auditLog({
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                action: 'SHIFT_OPEN',
                entityType: 'CashDrawerSession',
                entityId: newSession.id,
                franchiseId: user.franchiseId,
                locationId: finalLocationId,
                metadata: { startingCash: amount }
            })

            return NextResponse.json(newSession)
        }

        if (action === 'CLOSE') {
            const currentSession = await prisma.cashDrawerSession.findFirst({
                where: {
                    ...(locationId ? { locationId } : {}),
                    status: 'OPEN',
                    employeeId: user.id
                }
            })
            if (!currentSession) return NextResponse.json({ error: 'No open shift found' }, { status: 404 })

            // ===== EXPECTED CASH CALCULATION (server-side truth) =====
            const sessionId = currentSession.id
            const startingCash = Number(currentSession.startingCash || 0)

            const summary = await computeShiftSummary(sessionId, startingCash)
            const expectedCash = summary.expectedCash
            const cashSales = summary.cashSales
            const splitCash = summary.splitCash
            const cashRefunds = summary.cashRefunds
            const cashDrops = summary.cashDrops
            const paidIn = summary.paidIn
            const paidOut = summary.paidOut
            const endingCash = Number(amount || 0)
            const variance = Math.round((endingCash - expectedCash) * 100) / 100

            const closedSession = await prisma.cashDrawerSession.update({
                where: { id: currentSession.id },
                data: {
                    endingCash: amount,
                    expectedCash,
                    variance,
                    endTime: new Date(),
                    status: 'CLOSED',
                    notes: notes ? `${currentSession.notes || ''}\n${notes}` : currentSession.notes
                }
            })

            await auditLog({
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                action: 'SHIFT_CLOSE',
                entityType: 'CashDrawerSession',
                entityId: currentSession.id,
                franchiseId: user.franchiseId,
                locationId: locationId || undefined,
                metadata: {
                    startingCash,
                    endingCash,
                    expectedCash,
                    variance,
                    cashSales,
                    cashRefunds,
                    cashDrops,
                    paidIn,
                    paidOut,
                    splitCash,
                }
            })

            return NextResponse.json({
                ...closedSession,
                breakdown: { startingCash, cashSales, splitCash, cashRefunds, cashDrops, paidIn, paidOut, expectedCash, endingCash, variance }
            })
        }

        if (action === 'DROP') {
            // Record cash drop in the current open shift
            const currentSession = await prisma.cashDrawerSession.findFirst({
                where: {
                    ...(locationId ? { locationId } : {}),
                    status: 'OPEN',
                    employeeId: user.id,
                },
            })
            if (!currentSession) return NextResponse.json({ error: 'No open shift found for drop' }, { status: 404 })

            if (!amount || amount <= 0) {
                return NextResponse.json({ error: 'Drop amount must be greater than 0' }, { status: 400 })
            }

            // P0 FIX: Persist cash drop to CashDrop model (was previously NOT saved)
            const cashDrop = await prisma.cashDrop.create({
                data: {
                    sessionId: currentSession.id,
                    amount: amount,
                    reason: notes || 'SAFE_DROP',
                    droppedBy: user.id
                }
            })

            await auditLog({
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                action: 'CASH_DROP',
                entityType: 'CashDrop',
                entityId: cashDrop.id,
                franchiseId: user.franchiseId,
                locationId: locationId || undefined,
                metadata: { amount, shiftId: currentSession.id, reason: notes || 'SAFE_DROP' }
            })

            return NextResponse.json({
                success: true,
                id: cashDrop.id,
                message: 'Cash drop recorded',
                amount,
                sessionId: currentSession.id
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('[POS_SHIFT_POST]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    // Support both session (web) and Bearer token (mobile)
    const user = await getAuthUser(req)

    if (!user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate user exists in DB (handle stale sessions after seed)
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, locationId: true, franchiseId: true }
    })

    if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Get shiftRequirement from BusinessConfig (if the field exists)
    let shiftRequirement = 'NONE' // Default: no shift required
    if (dbUser.franchiseId) {
        try {
            const franchise = await prisma.franchise.findUnique({
                where: { id: dbUser.franchiseId },
                select: { franchisorId: true }
            })
            if (franchise?.franchisorId) {
                const businessConfig = await prisma.businessConfig.findUnique({
                    where: { franchisorId: franchise.franchisorId }
                })
                // shiftRequirement field may not exist yet in schema
                if (businessConfig && 'shiftRequirement' in businessConfig) {
                    shiftRequirement = (businessConfig as any).shiftRequirement || 'NONE'
                }
            }
        } catch {
            // Field doesn't exist in schema yet — default to NONE
            shiftRequirement = 'NONE'
        }
    }

    // Get current open session for this user with linked transactions
    const whereClause: any = {
        status: 'OPEN',
        employeeId: dbUser.id
    }
    if (dbUser.locationId) {
        whereClause.locationId = dbUser.locationId
    }

    const currentSession = await prisma.cashDrawerSession.findFirst({
        where: whereClause,
    })

    let shiftData = null
    if (currentSession) {
        const startingCash = Number(currentSession.startingCash || 0)
        
        const summary = await computeShiftSummary(currentSession.id, startingCash)

        shiftData = {
            ...currentSession,
            cashTotal: summary.cashSales,
            expectedCash: summary.expectedCash,
            openingAmount: startingCash,
            cashSales: summary.cashSales,
            ...summary
        }
        // Remove raw transactions array from response
        delete (shiftData as any).transactions
    }

    // Fetch active TimeEntry for Clock-In UI state optimization
    const activeTimeEntry = await prisma.timeEntry.findFirst({
        where: {
            userId: dbUser.id,
            status: 'OPEN',
            clockOut: null
        },
        orderBy: { clockIn: 'desc' }
    })

    return NextResponse.json({ 
        shift: shiftData, 
        shiftRequirement,
        isClockedIn: !!activeTimeEntry,
        activeTimeEntryId: activeTimeEntry?.id || null 
    })
}
