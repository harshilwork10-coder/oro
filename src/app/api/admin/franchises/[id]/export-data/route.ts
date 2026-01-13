import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Export all franchise data as JSON (GDPR/CCPA compliant)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || session.user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Unauthorized - Provider only' }, { status: 401 })
        }

        const { id } = await params

        const franchise = await prisma.franchise.findUnique({
            where: { id }
        })

        if (!franchise) {
            return NextResponse.json({ error: 'Franchise not found' }, { status: 404 })
        }

        // Collect all data for export
        const [
            franchiseData,
            users,
            locations,
            products,
            categories,
            transactions,
            clients,
            appointments,
            settings
        ] = await Promise.all([
            prisma.franchise.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    createdAt: true,
                    updatedAt: true
                }
            }),
            prisma.user.findMany({
                where: { franchiseId: id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    createdAt: true
                    // Explicitly exclude: password, pin
                }
            }),
            prisma.location.findMany({
                where: { franchiseId: id },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    createdAt: true
                }
            }),
            prisma.product.findMany({
                where: { franchiseId: id },
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    barcode: true,
                    price: true,
                    cost: true,
                    stock: true,
                    createdAt: true
                }
            }),
            prisma.productCategory.findMany({
                where: { franchiseId: id },
                select: {
                    id: true,
                    name: true
                }
            }),
            prisma.transaction.findMany({
                where: { franchiseId: id },
                select: {
                    id: true,
                    invoiceNumber: true,
                    subtotal: true,
                    tax: true,
                    total: true,
                    paymentMethod: true,
                    status: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' },
                take: 10000 // Limit to last 10k transactions
            }),
            prisma.client.findMany({
                where: { franchiseId: id },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    createdAt: true
                }
            }),
            prisma.appointment.findMany({
                where: {
                    location: { franchiseId: id }
                },
                select: {
                    id: true,
                    startTime: true,
                    endTime: true,
                    status: true,
                    notes: true,
                    createdAt: true
                },
                take: 5000
            }),
            prisma.franchiseSettings.findUnique({
                where: { franchiseId: id }
            })
        ])

        // Build export package
        const exportData = {
            exportedAt: new Date().toISOString(),
            exportedBy: session.user.email,
            franchise: franchiseData,
            settings,
            users,
            locations,
            products,
            categories,
            transactions,
            clients,
            appointments,
            summary: {
                totalUsers: users.length,
                totalLocations: locations.length,
                totalProducts: products.length,
                totalTransactions: transactions.length,
                totalClients: clients.length,
                totalAppointments: appointments.length
            }
        }

        // Mark that data was exported
        await prisma.franchise.update({
            where: { id },
            data: { dataExportedAt: new Date() }
        })

        // Debug log removed data exported by ${session.user.email}`)

        // Return as downloadable JSON
        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="oro-export-${franchise.slug}-${new Date().toISOString().split('T')[0]}.json"`
            }
        })

    } catch (error) {
        console.error('Data export error:', error)
        return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
    }
}
