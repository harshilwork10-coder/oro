// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { auditLog } from '@/lib/audit'

// GET — Get current receipt template
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const settings = await prisma.franchiseSettings.findFirst({
            where: { franchiseId: user.franchiseId }
        })

        const template = settings?.receiptTemplate
            ? JSON.parse(settings.receiptTemplate as string)
            : {
                header: {
                    showLogo: true,
                    storeName: true,
                    address: true,
                    phone: true,
                    customLine1: '',
                    customLine2: ''
                },
                body: {
                    showBarcode: false,
                    showSKU: false,
                    showSavings: true,
                    showTaxBreakdown: true
                },
                footer: {
                    returnPolicy: 'Returns accepted within 30 days with receipt.',
                    promoMessage: '',
                    showSurveyLink: false,
                    surveyUrl: '',
                    customLine1: '',
                    customLine2: '',
                    showThankYou: true
                }
            }

        return ApiResponse.success({ template })
    } catch (error) {
        console.error('[RECEIPT_TEMPLATE_GET]', error)
        return ApiResponse.error('Failed to fetch receipt template')
    }
}

// PUT — Update receipt template
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Owner+ only')
        }
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const body = await request.json()
        const { template } = body

        if (!template) return ApiResponse.badRequest('template object required')

        await prisma.franchiseSettings.updateMany({
            where: { franchiseId: user.franchiseId },
            data: { receiptTemplate: JSON.stringify(template) }
        })

        // Audit log
        await auditLog({
            userId: user.id,
            userEmail: user.email,
            userRole: user.role,
            action: 'RECEIPT_TEMPLATE_UPDATED',
            entityType: 'FranchiseSettings',
            entityId: user.franchiseId,
            metadata: { sections: Object.keys(template) }
        })

        return ApiResponse.success({ updated: true })
    } catch (error) {
        console.error('[RECEIPT_TEMPLATE_PUT]', error)
        return ApiResponse.error('Failed to update receipt template')
    }
}
