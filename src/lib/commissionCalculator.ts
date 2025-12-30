import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export interface CommissionBreakdown {
    employeeId: string
    employeeName: string

    // Revenue
    serviceRevenue: number
    productRevenue: number
    totalRevenue: number

    // Commissions
    serviceCommission: number
    productCommission: number
    totalCommission: number

    // Other earnings
    baseSalary: number
    hourlyWages: number
    tips: number
    bonuses: number

    // Deductions
    rentalFee: number

    // Final pay
    grossPay: number

    // Metadata
    hoursWorked: number
    servicesPerformed: number
    currentTier?: string
    paymentType: string
}

/**
 * Calculate commission for an employee for a given period
 * Handles all 15+ commission scenarios
 */
export async function calculateCommission(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
): Promise<CommissionBreakdown> {

    // Get employee payment config
    const config = await prisma.employeePaymentConfig.findUnique({
        where: { employeeId }
    })

    // Get employee info
    const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: { id: true, name: true, email: true }
    })

    if (!employee) {
        throw new Error('Employee not found')
    }

    // If no config, use defaults (40% commission)
    const paymentConfig = config || {
        paymentType: 'COMMISSION',
        defaultCommissionRate: new Decimal(0.40),
        usesTieredCommission: false,
        productCommissionRate: new Decimal(0.10),
        useProductCostDeduction: false,
        commissionOnDiscountedPrice: true,
        baseSalary: null,
        hourlyRate: null,
        rentalFee: null,
        useMaxSalaryOrCommission: false,
        useMaxHourlyOrCommission: false,
        newClientBonusAmount: new Decimal(0)
    }

    // Get transactions for period where this employee performed services
    const transactions = await prisma.transaction.findMany({
        where: {
            createdAt: {
                gte: periodStart,
                lte: periodEnd
            },
            lineItems: {
                some: {
                    staffId: employeeId  // staffId is the field for who performed the service
                }
            }
        },
        include: {
            lineItems: {
                where: {
                    staffId: employeeId
                }
            }
        }
    })

    let serviceRevenue = 0
    let productRevenue = 0
    let serviceCommission = 0
    let productCommission = 0
    let servicesPerformed = 0
    let newClientBonus = 0

    // Calculate service & product commissions
    for (const txn of transactions) {
        for (const item of txn.lineItems) {
            if (item.type === 'SERVICE') {
                servicesPerformed++

                // Get service-specific override if exists
                const serviceId = item.serviceId
                let override = null
                if (serviceId) {
                    override = await prisma.serviceCommissionOverride.findUnique({
                        where: {
                            employeeId_serviceId: {
                                employeeId,
                                serviceId
                            }
                        }
                    })
                }

                let rate = override
                    ? Number(override.percentage)
                    : Number(paymentConfig.defaultCommissionRate)

                // Apply tiered commission if enabled
                if (paymentConfig.usesTieredCommission) {
                    const monthlyRevenue = await getMonthlyRevenue(employeeId, periodStart)
                    const tier = await getTierForRevenue(employeeId, monthlyRevenue)
                    if (tier) {
                        rate = Number(tier.percentage)
                    }
                }

                // Handle discounts - use total which is the final price after discounts
                const revenue = Number(item.total)
                serviceRevenue += revenue
                serviceCommission += revenue * rate

            } else if (item.type === 'PRODUCT') {
                const revenue = Number(item.total)
                productRevenue += revenue

                // TODO: Implement product cost deduction when GlobalProduct has COGS
                let commissionBase = revenue
                if (paymentConfig.useProductCostDeduction) {
                    // commissionBase = revenue - productCost
                }

                const rate = Number(paymentConfig.productCommissionRate)
                productCommission += commissionBase * rate
            }
        }

        // Check for new client bonus
        // TODO: Implement new client tracking
    }

    const totalRevenue = serviceRevenue + productRevenue
    const totalCommission = serviceCommission + productCommission + newClientBonus

    // Get tips for period
    const tips = await getTipsForPeriod(employeeId, periodStart, periodEnd)

    // Get hours worked
    const hoursWorked = await getHoursWorked(employeeId, periodStart, periodEnd)

    // Calculate final pay based on payment type
    let grossPay = totalCommission + tips
    let baseSalary = 0
    let hourlyWages = 0
    let rentalFee = 0
    let currentTier = undefined

    switch (paymentConfig.paymentType) {
        case 'SALARY':
            baseSalary = Number(paymentConfig.baseSalary || 0)
            if (paymentConfig.useMaxSalaryOrCommission) {
                grossPay = Math.max(baseSalary, totalCommission) + tips
            } else {
                grossPay = baseSalary + tips
            }
            break

        case 'HOURLY':
            hourlyWages = hoursWorked * Number(paymentConfig.hourlyRate || 0)
            if (paymentConfig.useMaxHourlyOrCommission) {
                grossPay = Math.max(hourlyWages, totalCommission) + tips
            } else {
                grossPay = hourlyWages + tips
            }
            break

        case 'BOOTH_RENTAL':
            rentalFee = Number(paymentConfig.rentalFee || 0)
            grossPay = totalRevenue - rentalFee
            break

        case 'HYBRID':
            baseSalary = Number(paymentConfig.baseSalary || 0)
            grossPay = baseSalary + totalCommission + tips
            break

        default: // COMMISSION
            grossPay = totalCommission + tips
    }

    // Get current tier name if using tiered commissions
    if (paymentConfig.usesTieredCommission) {
        const monthlyRevenue = await getMonthlyRevenue(employeeId, periodStart)
        const tier = await getTierForRevenue(employeeId, monthlyRevenue)
        currentTier = tier?.tierName || undefined
    }

    return {
        employeeId: employee.id,
        employeeName: employee.name || employee.email,
        serviceRevenue,
        productRevenue,
        totalRevenue,
        serviceCommission,
        productCommission,
        totalCommission,
        baseSalary,
        hourlyWages,
        tips,
        bonuses: newClientBonus,
        rentalFee,
        grossPay,
        hoursWorked,
        servicesPerformed,
        currentTier,
        paymentType: paymentConfig.paymentType
    }
}

/**
 * Get monthly revenue for employee (for tiered commission calculation)
 */
async function getMonthlyRevenue(employeeId: string, date: Date): Promise<number> {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    const transactions = await prisma.transaction.findMany({
        where: {
            createdAt: {
                gte: startOfMonth,
                lte: endOfMonth
            },
            lineItems: {
                some: {
                    staffId: employeeId
                }
            }
        },
        include: {
            lineItems: {
                where: {
                    staffId: employeeId
                }
            }
        }
    })

    return transactions.reduce((sum, txn) => {
        return sum + txn.lineItems.reduce((itemSum, item) => {
            return itemSum + Number(item.total)
        }, 0)
    }, 0)
}

/**
 * Get commission tier for revenue amount
 */
async function getTierForRevenue(employeeId: string, revenue: number) {
    const tiers = await prisma.commissionTier.findMany({
        where: { employeeId, isActive: true },
        orderBy: { priority: 'asc' }
    })

    for (const tier of tiers) {
        const min = Number(tier.minRevenue)
        const max = tier.maxRevenue ? Number(tier.maxRevenue) : Infinity

        if (revenue >= min && revenue <= max) {
            return tier
        }
    }

    return null
}

/**
 * Get tips for period
 */
async function getTipsForPeriod(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
): Promise<number> {
    const transactions = await prisma.transaction.findMany({
        where: {
            createdAt: {
                gte: periodStart,
                lte: periodEnd
            },
            tip: {
                gt: 0
            },
            lineItems: {
                some: {
                    staffId: employeeId
                }
            }
        }
    })

    return transactions.reduce((sum, txn) => sum + Number(txn.tip || 0), 0)
}

/**
 * Get hours worked for period
 */
async function getHoursWorked(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date
): Promise<number> {
    const timeEntries = await prisma.timeEntry.findMany({
        where: {
            userId: employeeId,
            clockIn: {
                gte: periodStart,
                lte: periodEnd
            },
            clockOut: {
                not: null
            }
        }
    })

    return timeEntries.reduce((sum, entry) => {
        if (entry.clockOut) {
            const hours = (entry.clockOut.getTime() - entry.clockIn.getTime()) / (1000 * 60 * 60)
            return sum + hours
        }
        return sum
    }, 0)
}

/**
 * Create or update payroll run for period
 */
export async function createPayrollRun(
    periodStart: Date,
    periodEnd: Date,
    createdBy: string
) {
    // Get all employees
    const employees = await prisma.user.findMany({
        where: {
            role: {
                in: ['EMPLOYEE', 'MANAGER', 'FRANCHISEE']
            }
        }
    })

    // Create payroll run
    const payrollRun = await prisma.payrollRun.create({
        data: {
            periodStart,
            periodEnd,
            status: 'DRAFT',
            createdBy
        }
    })

    // Calculate commissions for all employees
    for (const employee of employees) {
        const breakdown = await calculateCommission(employee.id, periodStart, periodEnd)

        await prisma.payrollEntry.create({
            data: {
                payrollRunId: payrollRun.id,
                employeeId: employee.id,
                serviceRevenue: breakdown.serviceRevenue,
                productRevenue: breakdown.productRevenue,
                totalRevenue: breakdown.totalRevenue,
                serviceCommission: breakdown.serviceCommission,
                productCommission: breakdown.productCommission,
                totalCommission: breakdown.totalCommission,
                baseSalary: breakdown.baseSalary,
                hourlyWages: breakdown.hourlyWages,
                tips: breakdown.tips,
                bonuses: breakdown.bonuses,
                rentalFee: breakdown.rentalFee,
                grossPay: breakdown.grossPay,
                hoursWorked: breakdown.hoursWorked,
                servicesPerformed: breakdown.servicesPerformed
            }
        })
    }

    return payrollRun
}

