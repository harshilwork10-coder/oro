import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Mark appointment as no-show
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        const user = session?.user as any

        if (!user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { chargeFee } = body

        // Get the appointment
        const appointment = await prisma.appointment.findUnique({
            where: { id },
            include: {
                client: true,
                service: true,
                location: {
                    include: {
                        franchise: {
                            include: {
                                settings: true
                            }
                        }
                    }
                }
            }
        })

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        // Verify user has access (same franchise)
        if (appointment.location.franchise.id !== user.franchiseId && user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Update appointment status to NO_SHOW
        const updatedAppointment = await prisma.appointment.update({
            where: { id },
            data: {
                status: 'NO_SHOW'
            }
        })

        let chargeResult = null

        // If chargeFee is requested and client has card on file
        // TODO: Implement card charging when Authorize.net is integrated
        // This will be enabled once card-on-file is set up
        if (chargeFee && appointment.client) {
            // Get no-show fee from settings
            const settings = appointment.location.franchise.settings
            const noShowFee = (settings as any)?.noShowFeeAmount || 25 // Default $25
            const feeType = (settings as any)?.noShowFeeType || 'flat' // flat or percentage

            let feeAmount = noShowFee
            if (feeType === 'percentage') {
                feeAmount = Number(appointment.service.price) * (noShowFee / 100)
            }

            // For now, just log that a charge would be made
            // Actual charging will be implemented with Authorize.net
            chargeResult = {
                wouldCharge: true,
                amount: feeAmount,
                message: 'Card-on-file charging pending Authorize.net integration'
            }

            // TODO: When Authorize.net is ready:
            // 1. Get client's saved payment profile
            // 2. Charge the no-show fee
            // 3. Create a transaction record
        }

        return NextResponse.json({
            success: true,
            appointment: updatedAppointment,
            chargeResult
        })
    } catch (error) {
        console.error('Error marking no-show:', error)
        return NextResponse.json({ error: 'Failed to mark no-show' }, { status: 500 })
    }
}
