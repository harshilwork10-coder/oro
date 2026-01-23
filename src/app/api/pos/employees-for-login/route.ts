/**
 * POS Employees for Login API
 * 
 * GET /api/pos/employees-for-login
 * 
 * Returns employee list for login screen tiles.
 * Uses withPOSAuth() wrapper - station scope from validated token ONLY.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPOSAuth, POSContext } from '@/lib/posAuth'

function getInitials(name: string): string {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
}

/**
 * GET /api/pos/employees-for-login
 * 
 * Protected by withPOSAuth - requires X-Station-Token header
 * locationId comes from validated token, NEVER from client
 */
export const GET = withPOSAuth(async (_req: Request, ctx: POSContext) => {
    // SECURITY: locationId from validated token only
    const { locationId, stationName } = ctx

    try {
        // Get employees for this location only
        // Show all employees - they'll get error if no PIN when logging in
        const employees = await prisma.user.findMany({
            where: {
                locationId: locationId,
                role: { in: ['EMPLOYEE', 'MANAGER', 'OWNER'] },
                isActive: true
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true,
                pin: true, // To check hasPIN
                updatedAt: true
            },
            orderBy: [
                { role: 'asc' }, // Owners/Managers first
                { name: 'asc' }
            ],
            take: 20 // Max 20 employees for tiles
        })

        // Format for tile display with hasPIN indicator
        const tiles = employees.map(emp => ({
            id: emp.id,
            name: emp.name || emp.email?.split('@')[0] || 'Employee',
            initials: getInitials(emp.name || emp.email || 'E'),
            avatar: emp.image,
            role: emp.role,
            hasPIN: !!emp.pin // Android can show indicator if no PIN
        }))

        return NextResponse.json({
            success: true,
            employees: tiles,
            stationName: stationName,
            locationId: locationId
        })
    } catch (error) {
        console.error('[EMPLOYEES_FOR_LOGIN] Error:', error)
        return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }
})
