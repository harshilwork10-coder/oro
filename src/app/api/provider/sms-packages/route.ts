import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get SMS packages
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get or create provider config
        let config = await prisma.providerSmsConfig.findFirst()

        if (!config) {
            config = await prisma.providerSmsConfig.create({
                data: {}
            })
        }

        return NextResponse.json({
            packages: [
                { name: config.package1Name, credits: config.package1Credits, price: Number(config.package1Price) },
                { name: config.package2Name, credits: config.package2Credits, price: Number(config.package2Price) },
                { name: config.package3Name, credits: config.package3Credits, price: Number(config.package3Price) },
                { name: config.package4Name, credits: config.package4Credits, price: Number(config.package4Price) }
            ]
        })
    } catch (error) {
        console.error('Error fetching SMS packages:', error)
        return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
    }
}

// PUT - Update SMS packages
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
            return NextResponse.json({ error: 'Only providers can update packages' }, { status: 403 })
        }

        const body = await request.json()
        const { packages } = body

        if (!packages || packages.length !== 4) {
            return NextResponse.json({ error: 'Invalid packages data' }, { status: 400 })
        }

        // Get existing config
        let config = await prisma.providerSmsConfig.findFirst()

        const data = {
            package1Name: packages[0].name,
            package1Credits: packages[0].credits,
            package1Price: packages[0].price,
            package2Name: packages[1].name,
            package2Credits: packages[1].credits,
            package2Price: packages[1].price,
            package3Name: packages[2].name,
            package3Credits: packages[2].credits,
            package3Price: packages[2].price,
            package4Name: packages[3].name,
            package4Credits: packages[3].credits,
            package4Price: packages[3].price
        }

        if (config) {
            config = await prisma.providerSmsConfig.update({
                where: { id: config.id },
                data
            })
        } else {
            config = await prisma.providerSmsConfig.create({ data })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating SMS packages:', error)
        return NextResponse.json({ error: 'Failed to update packages' }, { status: 500 })
    }
}

