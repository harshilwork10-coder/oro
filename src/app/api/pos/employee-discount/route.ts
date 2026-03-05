// @ts-nocheck
'use strict'

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

// GET — Check if employee discount applies at checkout
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!user.franchiseId) return ApiResponse.badRequest('No franchise')

        const { searchParams } = new URL(request.url)
        const employeeId = searchParams.get('employeeId')

        if (!employeeId) return ApiResponse.badRequest('employeeId required')

        const employee = await prisma.user.findFirst({
            where: { id: employeeId, franchiseId: user.franchiseId },
            select: { id: true, name: true, role: true, employeeDiscountPct: true, employeeDiscountEnabled: true }
        })

        if (!employee) return ApiResponse.notFound('Employee not found')

        return ApiResponse.success({
            employeeId: employee.id,
            name: employee.name,
            discountEnabled: employee.employeeDiscountEnabled || false,
            discountPercent: employee.employeeDiscountPct ? Number(employee.employeeDiscountPct) : 0
        })
    } catch (error) {
        console.error('[EMP_DISCOUNT_GET]', error)
        return ApiResponse.error('Failed to check employee discount')
    }
}

// PUT — Set employee discount rate
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) return ApiResponse.unauthorized()

        const user = session.user as any
        if (!['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'OWNER'].includes(user.role)) {
            return ApiResponse.forbidden('Owner+ only')
        }

        const body = await request.json()
        const { employeeId, discountPercent, enabled } = body

        if (!employeeId) return ApiResponse.badRequest('employeeId required')

        await prisma.user.update({
            where: { id: employeeId },
            data: {
                employeeDiscountPct: discountPercent ?? 0,
                employeeDiscountEnabled: enabled ?? false
            }
        })

        return ApiResponse.success({ updated: true })
    } catch (error) {
        console.error('[EMP_DISCOUNT_PUT]', error)
        return ApiResponse.error('Failed to update employee discount')
    }
}
