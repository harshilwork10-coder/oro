import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get provider SMS package configuration
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is provider
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can access this' }, { status: 403 })
        }

        // Get or create provider SMS config (package pricing)
        let config = await prisma.providerSmsConfig.findFirst()

        if (!config) {
            config = await prisma.providerSmsConfig.create({
                data: {}
            })
        }

        return NextResponse.json(config)
    } catch (error) {
        console.error('Error fetching SMS config:', error)
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
    }
}

// PUT - Update provider SMS package configuration
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        })

        if (user?.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can update this' }, { status: 403 })
        }

        const body = await request.json()
        const {
            package1Name,
            package1Credits,
            package1Price,
            package2Name,
            package2Credits,
            package2Price,
            package3Name,
            package3Credits,
            package3Price,
            package4Name,
            package4Credits,
            package4Price
        } = body

        // Get existing config
        let config = await prisma.providerSmsConfig.findFirst()

        // Build update data with valid fields only
        const updateData: {
            package1Name?: string
            package1Credits?: number
            package1Price?: number
            package2Name?: string
            package2Credits?: number
            package2Price?: number
            package3Name?: string
            package3Credits?: number
            package3Price?: number
            package4Name?: string
            package4Credits?: number
            package4Price?: number
        } = {}

        if (package1Name !== undefined) updateData.package1Name = package1Name
        if (package1Credits !== undefined) updateData.package1Credits = package1Credits
        if (package1Price !== undefined) updateData.package1Price = parseFloat(package1Price)
        if (package2Name !== undefined) updateData.package2Name = package2Name
        if (package2Credits !== undefined) updateData.package2Credits = package2Credits
        if (package2Price !== undefined) updateData.package2Price = parseFloat(package2Price)
        if (package3Name !== undefined) updateData.package3Name = package3Name
        if (package3Credits !== undefined) updateData.package3Credits = package3Credits
        if (package3Price !== undefined) updateData.package3Price = parseFloat(package3Price)
        if (package4Name !== undefined) updateData.package4Name = package4Name
        if (package4Credits !== undefined) updateData.package4Credits = package4Credits
        if (package4Price !== undefined) updateData.package4Price = parseFloat(package4Price)

        if (config) {
            config = await prisma.providerSmsConfig.update({
                where: { id: config.id },
                data: updateData
            })
        } else {
            config = await prisma.providerSmsConfig.create({
                data: updateData
            })
        }

        return NextResponse.json({
            success: true,
            config
        })
    } catch (error) {
        console.error('Error updating SMS config:', error)
        return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
    }
}
