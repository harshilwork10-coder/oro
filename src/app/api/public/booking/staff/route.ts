import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Get staff profile by slug for public booking
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const slug = searchParams.get('slug')
        const staffSlug = searchParams.get('staffSlug')

        if (!slug) {
            return NextResponse.json({ error: 'Franchise slug required' }, { status: 400 })
        }

        // Find franchise by slug
        const franchise = await prisma.franchise.findUnique({
            where: { slug },
            include: {
                locations: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                }
            }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Business not found' }, { status: 404 })
        }

        // If staffSlug provided, get specific staff member
        if (staffSlug) {
            const staff = await prisma.user.findFirst({
                where: {
                    franchiseId: franchise.id,
                    staffSlug: staffSlug,
                    role: { in: ['EMPLOYEE', 'MANAGER', 'OWNER'] },
                    isActive: true,
                    acceptingClients: true
                },
                select: {
                    id: true,
                    name: true,
                    image: true,
                    staffSlug: true,
                    bio: true,
                    specialties: true,
                    profilePhotoUrl: true,
                    acceptingClients: true
                }
            })

            if (!staff) {
                return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
            }

            // Get services this staff can perform
            const services = await prisma.service.findMany({
                where: { franchiseId: franchise.id },
                orderBy: { name: 'asc' },
                include: {
                    serviceCategory: { select: { name: true } }
                }
            })

            return NextResponse.json({
                franchise: {
                    id: franchise.id,
                    name: franchise.name,
                    slug: franchise.slug
                },
                locations: franchise.locations,
                staff: {
                    ...staff,
                    specialties: staff.specialties ? JSON.parse(staff.specialties) : []
                },
                services: services.map(s => ({
                    id: s.id,
                    name: s.name,
                    description: s.description,
                    duration: s.duration,
                    price: Number(s.price),
                    category: s.serviceCategory?.name || null
                }))
            })
        }

        // Get all staff members for this franchise
        const allStaff = await prisma.user.findMany({
            where: {
                franchiseId: franchise.id,
                role: { in: ['EMPLOYEE', 'MANAGER', 'OWNER'] },
                isActive: true,
                acceptingClients: true
            },
            select: {
                id: true,
                name: true,
                image: true,
                staffSlug: true,
                bio: true,
                specialties: true,
                profilePhotoUrl: true
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({
            franchise: {
                id: franchise.id,
                name: franchise.name,
                slug: franchise.slug
            },
            locations: franchise.locations,
            staff: allStaff.map(s => ({
                ...s,
                specialties: s.specialties ? JSON.parse(s.specialties) : []
            }))
        })
    } catch (error) {
        console.error('Error fetching staff profiles:', error)
        return NextResponse.json({ error: 'Failed to fetch staff profiles' }, { status: 500 })
    }
}
