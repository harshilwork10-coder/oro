import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST - PIN Login for employees (station-based)
// Terminal sends locationId, we only search employees at that location
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { pin, locationId, employeeId } = body

        if (!pin || pin.length !== 4) {
            return NextResponse.json({ error: 'Enter 4-digit PIN' }, { status: 400 })
        }

        // If employeeId is provided, verify PIN for that specific employee
        if (employeeId) {
            const employee = await prisma.user.findUnique({
                where: { id: employeeId },
                include: {
                    location: true,
                    franchise: {
                        include: { franchisor: true }
                    }
                }
            })

            if (!employee || !employee.pin) {
                return NextResponse.json({ error: 'Invalid employee' }, { status: 401 })
            }

            const isValid = await bcrypt.compare(pin, employee.pin)
            if (!isValid) {
                return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
            }

            return NextResponse.json({
                success: true,
                user: buildUserResponse(employee)
            })
        }

        // Build query based on locationId (station-based login)
        const whereClause: any = {
            role: 'EMPLOYEE',
            pin: { not: null }
        }

        // If locationId provided, only search that location's employees
        if (locationId) {
            whereClause.locationId = locationId
        }

        // Find employees
        const employees = await prisma.user.findMany({
            where: whereClause,
            include: {
                location: true,
                franchise: {
                    include: { franchisor: true }
                }
            }
        })

        // Check PIN against each employee and find match
        for (const employee of employees) {
            if (employee.pin) {
                const isValid = await bcrypt.compare(pin, employee.pin)
                if (isValid) {
                    return NextResponse.json({
                        success: true,
                        user: buildUserResponse(employee)
                    })
                }
            }
        }

        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })

    } catch (error) {
        console.error('PIN login error:', error)
        return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }
}

// Helper to build user response
function buildUserResponse(employee: any) {
    const industryType = employee.franchise?.franchisor?.industryType || 'RETAIL'
    return {
        id: employee.id,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        locationId: employee.locationId,
        franchiseId: employee.franchiseId,
        industryType: industryType
    }
}


