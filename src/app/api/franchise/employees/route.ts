import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let whereClause: any = { role: 'EMPLOYEE' }

    if (user.role === 'FRANCHISOR') {
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: user.id }
        })
        if (!franchisor) return NextResponse.json([])

        // Get all employees in franchises owned by this franchisor
        whereClause.franchise = {
            franchisorId: franchisor.id
        }
    } else if (user.franchiseId) {
        whereClause.franchiseId = user.franchiseId
    } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const employees = await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            location: {
                select: {
                    id: true,
                    name: true
                }
            },
            canAddServices: true,
            canAddProducts: true,
            canManageInventory: true,
            canViewReports: true,
            canProcessRefunds: true,
            canManageSchedule: true,
            canManageEmployees: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(employees)
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Only owners/managers can add employees
    if (user.role !== 'FRANCHISOR' && user.role !== 'FRANCHISEE' && !user.canManageEmployees) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, permissions, locationId } = body

    if (!name || !email || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate Location if provided (Optional for now to support legacy, but recommended)
    let finalFranchiseId = user.franchiseId

    if (locationId) {
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: { franchise: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Verify Access to this Location
        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({ where: { ownerId: user.id } })
            if (!franchisor || location.franchise?.franchisorId !== franchisor.id) {
                return NextResponse.json({ error: 'You do not own this location' }, { status: 403 })
            }
        } else if (user.franchiseId && location.franchiseId !== user.franchiseId) {
            return NextResponse.json({ error: 'Location does not belong to your franchise' }, { status: 403 })
        }

        finalFranchiseId = location.franchiseId
    } else if (user.role === 'FRANCHISOR') {
        return NextResponse.json({ error: 'Location is required for Franchisors' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 })
    }

    // Check user limit based on subscription
    if (user.role === 'FRANCHISOR') {
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: user.id },
            include: {
                config: { select: { maxUsers: true, subscriptionTier: true } },
                franchises: { select: { id: true } }
            }
        })

        if (franchisor) {
            const franchiseIds = franchisor.franchises.map(f => f.id)
            const currentUserCount = await prisma.user.count({
                where: { franchiseId: { in: franchiseIds } }
            })
            const maxUsers = franchisor.config?.maxUsers || 1

            if (currentUserCount >= maxUsers) {
                return NextResponse.json({
                    error: 'User limit reached',
                    message: `Your ${franchisor.config?.subscriptionTier || 'STARTER'} plan allows ${maxUsers} user(s). Upgrade to add more.`,
                    code: 'LIMIT_REACHED',
                    current: currentUserCount,
                    limit: maxUsers
                }, { status: 403 })
            }
        }
    }

    const hashedPassword = await hash(password, 10)
    const hashedPin = body.pin ? await hash(body.pin, 10) : undefined

    const employee = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            pin: hashedPin,
            role: 'EMPLOYEE',
            franchiseId: finalFranchiseId,
            locationId: locationId || null,
            // Permissions
            canAddServices: permissions?.canAddServices || false,
            canAddProducts: permissions?.canAddProducts || false,
            canManageInventory: permissions?.canManageInventory || false,
            canViewReports: permissions?.canViewReports || false,
            canProcessRefunds: permissions?.canProcessRefunds || false,
            canManageSchedule: permissions?.canManageSchedule || false,
            canManageEmployees: permissions?.canManageEmployees || false,
        }
    })

    const { password: _, ...employeeWithoutPassword } = employee
    return NextResponse.json(employeeWithoutPassword)
}
