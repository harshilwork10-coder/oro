import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ApiResponse } from '@/lib/api-response'

// GET: List brand categories
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        // Get user's franchisor (via role assignment OR direct ownership)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                roleAssignments: {
                    where: { franchisorId: { not: null } },
                    select: { franchisorId: true }
                },
                franchisor: {
                    select: { id: true }
                }
            }
        })

        // Check role assignment first, then direct ownership
        const franchisorId = user?.roleAssignments?.[0]?.franchisorId || user?.franchisor?.id
        if (!franchisorId) {
            return ApiResponse.forbidden('Not a franchisor')
        }

        const categories = await prisma.globalServiceCategory.findMany({
            where: { franchisorId },
            orderBy: { sortOrder: 'asc' }
        })

        return ApiResponse.success({ categories })

    } catch (error) {
        console.error('Error fetching brand categories:', error)
        return ApiResponse.serverError('Failed to fetch brand categories')
    }
}

// POST: Create brand category
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return ApiResponse.unauthorized()
        }

        // Get user's franchisor (via role assignment OR direct ownership)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                roleAssignments: {
                    where: { franchisorId: { not: null } },
                    select: { franchisorId: true }
                },
                franchisor: {
                    select: { id: true }
                }
            }
        })

        // Check role assignment first, then direct ownership
        const franchisorId = user?.roleAssignments?.[0]?.franchisorId || user?.franchisor?.id
        if (!franchisorId) {
            return ApiResponse.forbidden('Not a franchisor')
        }

        const body = await req.json()
        const { name, sortOrder = 0 } = body

        if (!name) {
            return ApiResponse.badRequest('Name is required')
        }

        // Get max sort order if not provided
        let finalSortOrder = sortOrder
        if (sortOrder === 0) {
            const maxCategory = await prisma.globalServiceCategory.findFirst({
                where: { franchisorId },
                orderBy: { sortOrder: 'desc' },
                select: { sortOrder: true }
            })
            finalSortOrder = (maxCategory?.sortOrder || 0) + 1
        }

        const category = await prisma.globalServiceCategory.create({
            data: {
                franchisorId,
                name,
                sortOrder: finalSortOrder
            }
        })

        return ApiResponse.success({ category }, 201)

    } catch (error) {
        console.error('Error creating brand category:', error)
        return ApiResponse.serverError('Failed to create brand category')
    }
}
