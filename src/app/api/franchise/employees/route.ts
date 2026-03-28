import {NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { parsePaginationParams } from '@/lib/pagination'

export async function GET(req: NextRequest) {
    if (!authUser?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
        where: { email: user.email },
        include: { franchise: true }
    })

    if (!user) return NextResponse.json({ error: 'User' }, { status: 404 })

    const searchParams = req.nextUrl.searchParams
    const { take = 50, cursor, orderBy } = parsePaginationParams(searchParams)
    const search = searchParams.get('search')
    const locationId = searchParams.get('locationId')

    // Build where clause based on user role
    const whereClause: Record<string, unknown> = {
        role: 'EMPLOYEE',
        isActive: true  // Hide deactivated/soft-deleted employees
    }

    if (user.role === 'FRANCHISOR') {
        const franchisor = await prisma.franchisor.findUnique({
            where: { ownerId: user.id }
        })
        if (!franchisor) return NextResponse.json({ data: [], pagination: { hasMore: false, nextCursor: null } })

        whereClause.franchise = { franchisorId: franchisor.id }
    } else if (user.franchiseId) {
        whereClause.franchiseId = user.franchiseId
    } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
            phone: true,          // For Phone + PIN login
            role: true,
            locationId: true,     // For edit form
            location: { select: { id: true, name: true } },
            // Permission fields
            canAddServices: true,
            canAddProducts: true,
            canManageInventory: true,
            canViewReports: true,
            canProcessRefunds: true,
            canManageSchedule: true,
            canManageEmployees: true,
            // Employee settings
            canSetOwnPrices: true,
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

    return NextResponse.json({ data: data, pagination: {
        nextCursor,
        hasMore,
        total: data.length
    } })
}

export async function POST(req: NextRequest) {
  try {
        const authUser = await getAuthUser(req)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!authUser?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
        where: { email: user.email },
        include: { franchise: true }
    })

    if (!user) return NextResponse.json({ error: 'User' }, { status: 404 })

    // Only owners/managers can add employees
    if (user.role !== 'FRANCHISOR' && user.role !== 'FRANCHISEE' && !user.canManageEmployees) {
        return NextResponse.json({ error: 'Permission denied to manage employees' }, { status: 403 })
    }

    const body = await req.json()
    const {
        name,
        email,
        phone,
        password,
        permissions,
        locationId,
        pin,
        // Compensation fields
        compensationType,
        chairRentAmount,
        chairRentPeriod,
        assignedResourceId,
        commissionSplit,
        hourlyRate,
        salaryAmount,
        salaryPeriod,
        requiresTimeClock,
        canSetOwnPrices
    } = body

    if (!name || !email || !password) {
        return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 422 })
    }

    // Validate Location if provided
    let finalFranchiseId = user.franchiseId

    if (locationId) {
        const location = await prisma.location.findUnique({
            where: { id: locationId },
            include: { franchise: true }
        })

        if (!location) {
            return NextResponse.json({ error: 'Location' }, { status: 404 })
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
        return NextResponse.json({ error: 'Location is required for Franchisors' }, { status: 422 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    // NOTE: maxUsers limit is for Oro 9 Plus customer app, not for employee management
    // Employees are unlimited - subscription limits only apply to Oro 9 Plus features

    const hashedPassword = await hash(password, 10)
    const hashedPin = pin ? await hash(pin, 10) : undefined

    // Create employee and compensation plan in a transaction
    const result = await prisma.$transaction(async (tx) => {
        // Create employee user
        const employee = await tx.user.create({
            data: {
                name,
                email,
                phone: phone?.replace(/\D/g, '') || null, // Store only digits
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

        // Create CompensationPlan if compensation type is specified
        if (compensationType) {
            await tx.compensationPlan.create({
                data: {
                    userId: employee.id,
                    locationId: locationId || null,
                    workerType: compensationType === 'CHAIR_RENTAL' ? 'BOOTH_RENTER' : 'W2_EMPLOYEE',
                    compensationType,
                    effectiveFrom: new Date(),
                    // Chair rental fields
                    chairRentAmount: chairRentAmount ? parseFloat(chairRentAmount) : null,
                    chairRentPeriod: chairRentPeriod || null,
                    chairRentStartDate: compensationType === 'CHAIR_RENTAL' ? new Date() : null,
                    // Commission fields
                    commissionSplit: commissionSplit ? parseFloat(commissionSplit) : null,
                    // Hourly fields
                    hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
                    // Salary fields
                    salaryAmount: salaryAmount ? parseFloat(salaryAmount) : null,
                    salaryPeriod: salaryPeriod || null,
                    // Time clock
                    requiresTimeClock: requiresTimeClock || false,
                    // Price control
                    canSetOwnPrices: canSetOwnPrices ?? (compensationType === 'CHAIR_RENTAL'),
                }
            })

            // If assigned resource (chair), create the UserResource link
            if (assignedResourceId) {
                await tx.userResource.create({
                    data: {
                        userId: employee.id,
                        resourceId: assignedResourceId,
                        isDefault: true
                    }
                })
            }
        }

        return employee
    })

    const { password: _, ...employeeWithoutPassword } = result
    return NextResponse.json(employeeWithoutPassword, { status: 201 })
  } catch (error) {
    console.error('[FRANCHISE_EMPLOYEES_POST]', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
