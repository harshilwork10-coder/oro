import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: employeeId } = await params

        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Only owners/managers can reset passwords
        const userRole = session.user.role
        if (!['FRANCHISOR', 'MANAGER', 'PROVIDER', 'ADMIN'].includes(userRole)) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
        }

        const { password } = await request.json()

        if (!password || password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            )
        }

        // Get the employee
        const employee = await prisma.user.findUnique({
            where: { id: employeeId },
            include: {
                location: {
                    include: {
                        franchise: true
                    }
                }
            }
        })

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
        }

        // Verify the user has permission to reset this employee's password
        if (userRole === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findFirst({
                where: { ownerId: session.user.id },
                include: { franchises: true }
            })

            if (!franchisor) {
                return NextResponse.json({ error: 'Franchisor not found' }, { status: 404 })
            }

            // Check if employee belongs to one of the franchisor's franchises
            const franchiseIds = franchisor.franchises.map(f => f.id)
            if (!employee.franchiseId || !franchiseIds.includes(employee.franchiseId)) {
                return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
            }
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Update the password
        await prisma.user.update({
            where: { id: employeeId },
            data: { password: hashedPassword }
        })

        return NextResponse.json({ success: true, message: 'Password reset successfully' })
    } catch (error) {
        console.error('Error resetting password:', error)
        return NextResponse.json(
            { error: 'Failed to reset password' },
            { status: 500 }
        )
    }
}
