import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from '@/lib/api-response'

// GET: Fetch brand catalog (categories + services) for franchisor
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        // Get user's franchisor (via role, franchise ownership, or direct franchisor ownership)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                franchises: {
                    select: {
                        id: true,
                        franchisorId: true
                    },
                    take: 1
                }
            }
        })

        // Get franchisorId from user's franchise
        const franchiseId = user?.franchises?.[0]?.id
        const franchisorId = user?.franchises?.[0]?.franchisorId

        if (!franchiseId) {
            return ApiResponse.forbidden('No franchise found for user')
        }

        // Fetch services for this franchise with their categories
        const services = await prisma.service.findMany({
            where: {
                franchiseId,
                isActive: true
            },
            include: {
                serviceCategory: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { name: 'asc' }
        })

        // Fetch categories for this franchise
        const categories = await prisma.serviceCategory.findMany({
            where: { franchiseId },
            include: {
                services: {
                    where: { isActive: true },
                    orderBy: { name: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        })

        // Get uncategorized services
        const uncategorizedServices = services.filter(s => !s.serviceCategoryId)

        return ApiResponse.success({
            categories,
            uncategorizedServices: uncategorizedServices.map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                duration: s.duration,
                basePrice: s.price,
                priceMode: 'FIXED',
                commissionable: true,
                isAddOn: s.isAddOn,
                isActive: s.isActive,
                category: s.serviceCategory
            })),
            totalServices: services.length
        })

    } catch (error) {
        console.error('Error fetching brand catalog:', error)
        return ApiResponse.serverError('Failed to fetch brand catalog')
    }
}

// POST: Create new brand service
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        // Get user's franchise
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                franchises: {
                    select: { id: true },
                    take: 1
                }
            }
        })

        const franchiseId = user?.franchises?.[0]?.id
        if (!franchiseId) {
            return ApiResponse.forbidden('No franchise found')
        }

        const body = await req.json()
        const {
            name,
            description,
            duration,
            basePrice,
            categoryId,
            commissionable = true,
            isAddOn = false
        } = body

        if (!name || !duration || basePrice === undefined) {
            return ApiResponse.badRequest('Name, duration, and basePrice are required')
        }

        const service = await prisma.service.create({
            data: {
                franchiseId,
                name,
                description,
                duration: parseInt(duration),
                price: basePrice,
                serviceCategoryId: categoryId || null,
                isActive: true,
                isAddOn
            }
        })

        return ApiResponse.success({ service }, 201)

    } catch (error) {
        console.error('Error creating brand service:', error)
        return ApiResponse.serverError('Failed to create brand service')
    }
}
