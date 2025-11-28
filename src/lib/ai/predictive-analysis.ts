import { prisma } from '@/lib/prisma'

interface HealthScoreResult {
    score: number
    breakdown: {
        revenue: number
        compliance: number
        customerSat: number
        employeeRetention: number
        growth: number
    }
    trend: 'up' | 'down' | 'stable'
    predictedScore: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export class PredictiveAnalysisService {

    /**
     * Calculate health score and predict future trend for a franchise
     */
    static async analyzeFranchise(franchiseId: string): Promise<HealthScoreResult> {
        // Fetch franchise data with history
        const franchise = await prisma.franchise.findUnique({
            where: { id: franchiseId },
            include: {
                locations: {
                    include: {
                        users: true,
                        appointments: true
                    }
                }
                // healthScoreHistory: {  // Model doesn't exist
                //     orderBy: { recordedAt: 'desc' },
                //     take: 5
                // }
            }
        })

        if (!franchise) {
            throw new Error('Franchise not found')
        }

        // 1. Calculate Current Metrics
        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

        // Revenue Calculation (Mocked as Appointment -> Transaction relation is missing)
        const monthlyRevenue = 0
        /*
        const monthlyRevenue = franchise.locations.reduce((sum: number, loc: any) => {
            return sum + loc.appointments
                .filter((apt: any) => apt.transaction && new Date(apt.transaction.date) >= thirtyDaysAgo)
                .reduce((locSum: number, apt: any) => locSum + Number(apt.transaction!.amount), 0)
        }, 0)
        */

        const previousMonthRevenue = 0
        /*
        const previousMonthRevenue = franchise.locations.reduce((sum: number, loc: any) => {
            return sum + loc.appointments
                .filter((apt: any) => {
                    if (!apt.transaction) return false
                    const date = new Date(apt.transaction.date)
                    return date >= sixtyDaysAgo && date < thirtyDaysAgo
                })
                .reduce((locSum: number, apt: any) => locSum + Number(apt.transaction!.amount), 0)
        }, 0)
        */

        // Compliance Calculation
        const totalAppointments = (franchise as any).locations?.reduce((sum: number, loc: any) => sum + loc.appointments.length, 0) || 0
        const completedAppointments = (franchise as any).locations?.reduce((sum: number, loc: any) => {
            return sum + loc.appointments.filter((apt: any) => apt.status === 'COMPLETED').length
        }, 0) || 0

        const complianceScore = totalAppointments > 0
            ? Math.round((completedAppointments / totalAppointments) * 100)
            : 85 // Default for new franchises

        // Growth Rate
        const growthRate = previousMonthRevenue > 0
            ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
            : 0

        // Component Scores (0-100)
        const revenueScore = Math.min(100, (monthlyRevenue / 50000) * 100) // Target $50k/mo
        const customerSat = complianceScore // Proxy for now
        const employeeRetention = 85 // Placeholder
        const growthScore = Math.min(100, Math.max(0, 50 + growthRate))

        // Weighted Health Score
        const currentScore = Math.round(
            (revenueScore * 0.30) +
            (complianceScore * 0.25) +
            (customerSat * 0.20) +
            (employeeRetention * 0.15) +
            (growthScore * 0.10)
        )

        // 2. Analyze Trend & Prediction
        const history: any[] = [] // franchise.healthScoreHistory (model doesn't exist)
        let trend: 'up' | 'down' | 'stable' = 'stable'
        let predictedScore = currentScore

        if (history.length > 0) {
            const previousScore = history[0].score
            if (currentScore > previousScore + 2) trend = 'up'
            else if (currentScore < previousScore - 2) trend = 'down'

            // Simple linear projection based on last month change
            const change = currentScore - previousScore
            predictedScore = Math.max(0, Math.min(100, currentScore + change))
        }

        // 3. Determine Risk Level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
        if (predictedScore < 60) riskLevel = 'critical'
        else if (predictedScore < 70) riskLevel = 'high'
        else if (predictedScore < 80) riskLevel = 'medium'

        return {
            score: currentScore,
            breakdown: {
                revenue: Math.round(revenueScore),
                compliance: complianceScore,
                customerSat,
                employeeRetention,
                growth: Math.round(growthScore)
            },
            trend,
            predictedScore,
            riskLevel
        }
    }

    /**
     * Run analysis for all franchises and trigger interventions
     */
    static async runSystemWideAnalysis() {
        const franchises = await prisma.franchise.findMany()
        const results = []

        for (const franchise of franchises) {
            const analysis = await this.analyzeFranchise(franchise.id)

            /* // Save history (model doesn't exist)
            await prisma.healthScoreHistory.create({
                data: {
                    franchiseId: franchise.id,
                    score: analysis.score,
                    breakdown: JSON.stringify(analysis.breakdown)
                }
            })
            */

            // Trigger Interventions
            if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
                await this.triggerIntervention(franchise.id, analysis)
            }

            results.push({
                franchiseId: franchise.id,
                ...analysis
            })
        }

        return results
    }

    private static async triggerIntervention(franchiseId: string, analysis: HealthScoreResult) {
        /* // Check if pending intervention exists (model doesn't exist)
        const existing = await prisma.intervention.findFirst({
            where: {
                franchiseId,
                status: 'pending'
            }
        })

        if (existing) return // Don't duplicate
        */

        let type = 'email'
        let reason = `Health score dropped to ${analysis.score} (Risk: ${analysis.riskLevel})`

        if (analysis.riskLevel === 'critical') {
            type = 'improvement_plan'
            reason = `CRITICAL: Predicted score ${analysis.predictedScore}. Immediate action required.`
        } else if (analysis.riskLevel === 'high') {
            type = 'call'
            reason = `High risk detected. Schedule support call.`
        }

        /* // Create intervention (model doesn't exist)
        await prisma.intervention.create({
            data: {
                franchiseId,
                type,
                reason,
                status: 'pending'
            }
        })
        */
        console.log('Intervention triggered:', { franchiseId, type, reason })
    }
}
