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

    if (!user?.franchiseId) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })

    const employees = await prisma.user.findMany({
        where: {
            franchiseId: user.franchiseId,
            role: 'EMPLOYEE'
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
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

    if (!user?.franchiseId) return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })

    // Only owners/managers can add employees
    if (user.role !== 'FRANCHISEE' && !user.canManageEmployees) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, permissions } = body

    if (!name || !email || !password) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 })
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
            franchiseId: user.franchiseId,
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
