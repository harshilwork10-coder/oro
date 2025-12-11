import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: employeeId } = await params
        const body = await req.json()

        const { serviceId, serviceName, percentage } = body

        const override = await prisma.serviceCommissionOverride.upsert({
            where: {
                employeeId_serviceId: {
                    employeeId,
                    serviceId
                }
            },
            create: {
                employeeId,
                serviceId,
                serviceName,
                percentage
            },
            update: {
                serviceName,
                percentage
            }
        })

        return NextResponse.json({ success: true, override })

    } catch (error) {
        console.error('Error setting service override:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: employeeId } = await params

        const overrides = await prisma.serviceCommissionOverride.findMany({
            where: { employeeId }
        })

        return NextResponse.json(overrides)

    } catch (error) {
        console.error('Error fetching service overrides:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: employeeId } = await params
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const serviceId = searchParams.get('serviceId')

        if (!serviceId) {
            return NextResponse.json({ error: 'Service ID required' }, { status: 400 })
        }

        await prisma.serviceCommissionOverride.delete({
            where: {
                employeeId_serviceId: {
                    employeeId,
                    serviceId
                }
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error deleting service override:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
