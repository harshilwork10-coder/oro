import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const client = await prisma.franchisor.findUnique({
            where: { id: params.id },
            include: {
                owner: true,
                franchises: {
                    include: {
                        _count: {
                            select: { employees: true }
                        }
                    }
                },
                _count: {
                    select: { franchises: true }
                }
            }
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        return NextResponse.json(client)
    } catch (error) {
        console.error('Error fetching client details:', error)
        return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
    }
}

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, ownerName, ownerEmail, status, notes } = await req.json()

        // Update franchisor
        const updated = await prisma.franchisor.update({
            where: { id: params.id },
            data: {
                name,
                // Update owner info
                owner: {
                    update: {
                        name: ownerName,
                        email: ownerEmail,
                    }
                }
            },
            include: {
                owner: true,
                _count: {
                    select: { franchises: true }
                }
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating client:', error)
        return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Soft delete by updating status or hard delete
        await prisma.franchisor.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting client:', error)
        return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }
}
