import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Default waiver text - franchises can customize this
const DEFAULT_WAIVER_TEXT = `
WAIVER AND RELEASE OF LIABILITY

By signing below, I acknowledge and agree to the following:

1. I understand that the services provided may involve physical contact and the use of various tools and products.

2. I have disclosed any relevant medical conditions, allergies, or sensitivities that may affect the service.

3. I understand that results may vary and no guarantees have been made regarding the outcome of any service.

4. I release and hold harmless the business, its owners, employees, and contractors from any claims, damages, or injuries that may arise from the services provided.

5. I consent to the collection and use of my personal information as described in the privacy policy.

6. I understand that I may cancel or reschedule my appointment according to the business's cancellation policy.

7. This waiver is binding upon me, my heirs, and legal representatives.

I have read and fully understand this waiver and release of liability. I agree to these terms and conditions.
`

// GET - Get waiver text for a franchise
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const franchiseId = searchParams.get('franchiseId')

        if (!franchiseId) {
            return NextResponse.json({ error: 'Franchise ID required' }, { status: 400 })
        }

        // TODO: In future, allow franchises to customize waiver text
        // const customWaiver = await prisma.franchiseWaiverSettings.findUnique(...)

        return NextResponse.json({
            waiverText: DEFAULT_WAIVER_TEXT.trim(),
            version: '1.0'
        })
    } catch (error) {
        console.error('Error fetching waiver:', error)
        return NextResponse.json({ error: 'Failed to fetch waiver' }, { status: 500 })
    }
}

// POST - Save signed waiver
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            franchiseId,
            clientId,
            appointmentId,
            customerName,
            customerEmail,
            customerPhone,
            signatureName,
            waiverText,
            waiverVersion
        } = body

        // Validate required fields
        if (!franchiseId || !customerName || !customerEmail || !signatureName) {
            return NextResponse.json({
                error: 'Missing required fields: franchiseId, customerName, customerEmail, signatureName'
            }, { status: 400 })
        }

        // Get IP and user agent from request
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'

        // Create waiver record
        const waiver = await prisma.clientWaiver.create({
            data: {
                franchiseId,
                clientId: clientId || null,
                appointmentId: appointmentId || null,
                customerName,
                customerEmail,
                customerPhone: customerPhone || null,
                waiverVersion: waiverVersion || '1.0',
                waiverText: waiverText || DEFAULT_WAIVER_TEXT.trim(),
                signatureName,
                signatureDate: new Date(),
                consentGiven: true,
                ipAddress,
                userAgent
            }
        })

        // If client exists, update their liabilitySigned flag
        if (clientId) {
            await prisma.client.update({
                where: { id: clientId },
                data: { liabilitySigned: true }
            })
        }

        return NextResponse.json({
            success: true,
            waiverId: waiver.id,
            signedAt: waiver.signatureDate
        })
    } catch (error) {
        console.error('Error saving waiver:', error)
        return NextResponse.json({ error: 'Failed to save waiver' }, { status: 500 })
    }
}
