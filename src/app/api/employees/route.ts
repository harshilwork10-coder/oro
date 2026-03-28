import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import { logActivity, ActionTypes } from '@/lib/auditLog'

export async function GET(req: NextRequest) {
    try {
        const authUser = await getAuthUser(request)
        if (!authUser?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        if (!session || !['PROVIDER', 'FRANCHISOR', 'OWNER', 'MANAGER'].includes(authUser.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // PROVIDER sees all non-provider users
        // FRANCHISOR only sees users in their franchises (via Franchisor record)
        // OWNER/MANAGER see employees in their own franchise
        // For booking purposes, we only want actual EMPLOYEE role (stylists)
        let whereClause: any = {
            role: 'EMPLOYEE'  // Only show actual stylists, not owners/managers
        }

        if (authUser.role === 'OWNER' || authUser.role === 'MANAGER') {
            // OWNER/MANAGER: scope to their own franchise
            if (!authUser.franchiseId) {
                return NextResponse.json({ error: 'No franchise associated' }, { status: 400 })
            }
            whereClause.franchiseId = authUser.franchiseId
        } else if (authUser.role === 'FRANCHISOR') {
            // Get the franchisor record for this user
            const franchisor = await prisma.franchisor.findUnique({
                where: { ownerId: user.id },
                select: {
                    franchises: {
                        select: { id: true }
                    }
                }
            })

            const franchiseIds = franchisor?.franchises.map(f => f.id) || []
            whereClause.franchiseId = { in: franchiseIds }
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                location: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Remove password from response
        const usersWithoutPassword = users.map(({ password, ...user }) => user)

        return NextResponse.json(usersWithoutPassword)
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        if (!session || authUser.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, email, role, franchiseId, locationId } = body

        if (!name || !email || !role) {
            return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 })
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
        }

        // Generate random password
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
        const hashedPassword = await hash(tempPassword, 12)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                franchiseId: franchiseId || null,
                locationId: locationId || null,
            },
            include: {
                franchise: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                location: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        })

        // Remove password from response but include temp password for user to see once
        const { password, ...userWithoutPassword } = user

        // Audit log
        await logActivity({
            userId: user.id,
            userEmail: user.email || '',
            userRole: authUser.role,
            franchiseId: franchiseId || undefined,
            action: ActionTypes.EMPLOYEE_ADDED,
            entityType: 'USER',
            entityId: user.id,
            details: { name, email, role }
        })

        return NextResponse.json({
            ...userWithoutPassword,
            tempPassword // Send this once so admin can give it to the user
        }, { status: 201 })
    } catch (error) {
        console.error('Error creating user:', error)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
}

