import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Receipt Template — Get/update receipt template configuration
 * GET /api/settings/receipt-template
 * PUT /api/settings/receipt-template (Owner+ only)
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
        if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const settings = await prisma.franchiseSettings.findFirst({
            where: { franchiseId: user.franchiseId }
        })

        const template = settings?.receiptTemplate
            ? JSON.parse(settings.receiptTemplate as string)
            : {
                header: { showLogo: true, storeName: true, address: true, phone: true, customLine1: '', customLine2: '' },
                body: { showBarcode: false, showSKU: false, showSavings: true, showTaxBreakdown: true },
                footer: {
                    returnPolicy: 'Returns accepted within 30 days with receipt.',
                    promoMessage: '', showSurveyLink: false, surveyUrl: '',
                    customLine1: '', customLine2: '', showThankYou: true
                }
            }

        return NextResponse.json({ template })
    } catch (error: any) {
        console.error('[RECEIPT_TEMPLATE_GET]', error)
        return NextResponse.json({ error: 'Failed to fetch receipt template' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
        return NextResponse.json({ error: 'Owner+ only' }, { status: 403 })
    }

    try {
        const { template } = await req.json()
        if (!template) return NextResponse.json({ error: 'template object required' }, { status: 400 })

        await prisma.franchiseSettings.updateMany({
            where: { franchiseId: user.franchiseId },
            data: { receiptTemplate: JSON.stringify(template) }
        })

        await logActivity({
            userId: user.id, userEmail: user.email, userRole: user.role,
            franchiseId: user.franchiseId,
            action: 'RECEIPT_TEMPLATE_UPDATED', entityType: 'FranchiseSettings', entityId: user.franchiseId,
            details: { sections: Object.keys(template) }
        })

        return NextResponse.json({ updated: true })
    } catch (error: any) {
        console.error('[RECEIPT_TEMPLATE_PUT]', error)
        return NextResponse.json({ error: 'Failed to update receipt template' }, { status: 500 })
    }
}
