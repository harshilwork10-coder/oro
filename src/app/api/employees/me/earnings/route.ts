import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { calculateCommission } from '@/lib/commissionCalculator'
import { prisma } from '@/lib/prisma'

/**
 * Get real-time earnings for logged-in employee
 * Shows current shift or today's earnings
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                paymentConfig: true
            }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Get current shift or use today
        const now = new Date()
        const startOfDay = new Date(now)
        startOfDay.setHours(0, 0, 0, 0)

        // Check if employee has an active shift
        const activeShift = await prisma.cashDrawerSession.findFirst({
            where: {
                employeeId: user.id,
                endTime: null  // null means shift is still open
            },
            orderBy: {
                startTime: 'desc'
            }
        })

        const periodStart = activeShift?.startTime || startOfDay
        const periodEnd = now

        // Calculate earnings
        const earnings = await calculateCommission(user.id, periodStart, periodEnd)

        // Get payment config
        const config = user.paymentConfig || {
            paymentType: 'COMMISSION',
            defaultCommissionRate: 0.40,
            usesTieredCommission: false
        }

        // Get tier progress if tiered commission
        let tierProgress = null
        if (config.usesTieredCommission) {
            const tiers = await prisma.commissionTier.findMany({
                where: { employeeId: user.id, isActive: true },
                orderBy: { priority: 'asc' }
            })

            // Find current tier
            const currentTier = tiers.find(tier => {
                const min = Number(tier.minRevenue)
                const max = tier.maxRevenue ? Number(tier.maxRevenue) : Infinity
                return earnings.totalRevenue >= min && earnings.totalRevenue <= max
            })

            // Find next tier
            const nextTierIndex = currentTier ? tiers.findIndex(t => t.id === currentTier.id) + 1 : 0
            const nextTier = tiers[nextTierIndex]

            if (currentTier && nextTier) {
                const progress = (earnings.totalRevenue - Number(currentTier.minRevenue)) /
                    (Number(nextTier.minRevenue) - Number(currentTier.minRevenue))
                const remaining = Number(nextTier.minRevenue) - earnings.totalRevenue

                tierProgress = {
                    currentTier: {
                        name: currentTier.tierName,
                        percentage: Number(currentTier.percentage) * 100
                    },
                    nextTier: {
                        name: nextTier.tierName,
                        percentage: Number(nextTier.percentage) * 100,
                        minRevenue: Number(nextTier.minRevenue)
                    },
                    progress: Math.min(progress * 100, 100),
                    remaining: Math.max(remaining, 0)
                }
            }
        }

        // Get shift duration
        const shiftDuration = activeShift
            ? (now.getTime() - activeShift.startTime.getTime()) / (1000 * 60 * 60)
            : (now.getTime() - startOfDay.getTime()) / (1000 * 60 * 60)

        return NextResponse.json({
            employeeName: user.name || user.email,
            shiftStart: periodStart,
            currentTime: now,
            shiftDuration: Math.round(shiftDuration * 10) / 10, // Round to 1 decimal
            isActiveShift: !!activeShift,

            // Revenue
            serviceRevenue: earnings.serviceRevenue,
            productRevenue: earnings.productRevenue,
            totalRevenue: earnings.totalRevenue,

            // Earnings
            serviceCommission: earnings.serviceCommission,
            productCommission: earnings.productCommission,
            totalCommission: earnings.totalCommission,
            tips: earnings.tips,
            baseSalary: earnings.baseSalary,
            hourlyWages: earnings.hourlyWages,

            // Total
            grossPay: earnings.grossPay,

            // Stats
            servicesPerformed: earnings.servicesPerformed,
            hoursWorked: earnings.hoursWorked,

            // Payment type
            paymentType: earnings.paymentType,
            commissionRate: config.defaultCommissionRate,

            // Tier progress
            tierProgress,

            // Averages
            averagePerService: earnings.servicesPerformed > 0
                ? earnings.totalRevenue / earnings.servicesPerformed
                : 0,
            averagePerHour: shiftDuration > 0
                ? earnings.grossPay / shiftDuration
                : 0
        })

    } catch (error) {
        console.error('Error fetching real-time earnings:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

