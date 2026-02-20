/**
 * Quick Switch API
 * 
 * POST: Switch to another clocked-in employee using their PIN
 * Used for Quick Switch feature (Toast POS style)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const currentUser = session.user as any
        const storeId = currentUser.storeId || currentUser.locationId

        if (!storeId) {
            return NextResponse.json({ error: 'No store context' }, { status: 400 })
        }

        const body = await request.json()
        const { employeeId, pin } = body

        if (!employeeId || !pin) {
            return NextResponse.json({ error: 'Employee ID and PIN required' }, { status: 400 })
        }

        // Verify the target employee exists and is clocked in
        const activeEntry = await prisma.timeEntry.findFirst({
            where: {
                locationId: storeId,
                userId: employeeId,
                status: 'OPEN',
                clockOut: null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        pin: true,
                        image: true
                    }
                }
            }
        })

        if (!activeEntry) {
            return NextResponse.json({ error: 'Employee not clocked in' }, { status: 400 })
        }

        const employee = activeEntry.user

        // Verify PIN
        if (!employee.pin) {
            return NextResponse.json({ error: 'Employee has no PIN set' }, { status: 400 })
        }

        // Check if PIN is hashed or plain
        let pinValid = false
        if (employee.pin.length > 10) {
            // Hashed PIN
            pinValid = await bcrypt.compare(pin, employee.pin)
        } else {
            // Plain PIN (legacy)
            pinValid = employee.pin === pin
        }

        if (!pinValid) {
            return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
        }

        // Log the switch for audit trail
        console.error('[Quick Switch] Audit:', {
            action: 'QUICK_SWITCH',
            fromEmployee: currentUser.id,
            fromName: currentUser.name,
            toEmployee: employeeId,
            toName: employee.name,
            storeId,
            timestamp: new Date().toISOString()
        })

        // Return employee data for session update
        return NextResponse.json({
            success: true,
            employee: {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                role: employee.role,
                image: employee.image,
                storeId
            }
        })
    } catch (error) {
        console.error('[Quick Switch] Error:', error)
        return NextResponse.json({ error: 'Quick switch failed' }, { status: 500 })
    }
}
