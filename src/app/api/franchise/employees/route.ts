import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { ApiResponse } from '@/lib/api-response'
import { parsePaginationParams } from '@/lib/pagination'

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return ApiResponse.unauthorized()

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user) return ApiResponse.notFound('User')

    const searchParams = request.nextUrl.searchParams
    const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
    const search = searchParams.get('search')
    const locationId = searchParams.get('locationId')

    // Build where clause based on user role
    const whereClause: Record<string, unknown> = { role: 'EMPLOYEE' }

    if (user.role === 'FRANCHISOR') {
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: user.id }
        })
        if (!franchisor) return ApiResponse.success({ data: [], pagination: { hasMore: false, nextCursor: null } })

        whereClause.franchise = { franchisorId: franchisor.id }
    } else if (user.franchiseId) {
        whereClause.franchiseId = user.franchiseId
    } else {
        return ApiResponse.forbidden()
    }

    // Search filter
    if (search) {
        whereClause.OR = [
            { name: { contains: search } },
            { email: { contains: search } }
        ]
    }

    // Location filter
    if (locationId) {
        whereClause.locationId = locationId
    }

    // Build query with pagination
    const queryArgs: Record<string, unknown> = {
        where: whereClause,
        take: (take || 50) + 1,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            location: { select: { id: true, name: true } },
            canAddServices: true,
            canAddProducts: true,
            canManageInventory: true,
            canViewReports: true,
            canProcessRefunds: true,
            canManageSchedule: true,
            canManageEmployees: true,
            createdAt: true
        },
        orderBy: orderBy || { createdAt: 'desc' }
    }

    if (cursor) {
        queryArgs.cursor = { id: cursor }
        queryArgs.skip = 1
    }

    const employees = await prisma.user.findMany(
        queryArgs as Parameters<typeof prisma.user.findMany>[0]
    )

    const hasMore = employees.length > (take || 50)
    const data = hasMore ? employees.slice(0, take || 50) : employees
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null

    return ApiResponse.paginated(data, {
        nextCursor,
        hasMore,
        total: data.length
    })
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return ApiResponse.unauthorized()

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { franchise: true }
    })

    if (!user) return ApiResponse.notFound('User')

    // Only owners/managers can add employees
    if (user.role !== 'FRANCHISOR' && user.role !== 'FRANCHISEE' && !user.canManageEmployees) {
        return ApiResponse.forbidden('Permission denied to manage employees')
    }

    const body = await request.json()
    const { name, email, password, permissions, locationId, pin } = body

    if (!name || !email || !password) {
        return ApiResponse.validationError('Name, email, and password are required')
    }

    // Validate Location if provided
    let finalFranchiseId = user.franchiseId

    if (locationId) {
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: { franchise: true }
        })

        if (!location) {
            return ApiResponse.notFound('Location')
        }

        // Verify Access to this Location
        if (user.role === 'FRANCHISOR') {
            const franchisor = await prisma.franchisor.findUnique({ where: { ownerId: user.id } })
            if (!franchisor || location.franchise?.franchisorId !== franchisor.id) {
                return ApiResponse.forbidden('You do not own this location')
            }
        } else if (user.franchiseId && location.franchiseId !== user.franchiseId) {
            return ApiResponse.forbidden('Location does not belong to your franchise')
        }

        finalFranchiseId = location.franchiseId
    } else if (user.role === 'FRANCHISOR') {
        return ApiResponse.validationError('Location is required for Franchisors')
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        return ApiResponse.conflict('User with this email already exists')
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
                return ApiResponse.error(
                    `User limit reached. Your ${franchisor.config?.subscriptionTier || 'STARTER'} plan allows ${maxUsers} user(s). Upgrade to add more.`,
                    403,
                    { code: 'LIMIT_REACHED', details: { current: currentUserCount, limit: maxUsers } }
                )
            }
        }
    }

    const hashedPassword = await hash(password, 10)
    const hashedPin = pin ? await hash(pin, 10) : undefined

    const employee = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            pin: hashedPin,
            role: 'EMPLOYEE',
            franchiseId: finalFranchiseId,
            locationId: locationId || null,
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
    return ApiResponse.created(employeeWithoutPassword)
}
