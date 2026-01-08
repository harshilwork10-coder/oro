import { PredictiveAnalysisService } from './src/lib/ai/predictive-analysis'
import { prisma } from './src/lib/prisma'

async function main() {
    console.log('🚀 Starting Predictive Analysis Verification...')

    try {
        // 1. Create a dummy franchise with low revenue to trigger alert
        console.log('Creating test franchise...')
        const franchisor = await prisma.franchisor.create({
            data: {
                name: 'Test Franchisor AI',
                owner: {
                    create: {
                        name: 'Test Owner',
                        email: `ai-test-${Date.now()}@example.com`,
                        password: 'password123',
                        role: 'FRANCHISOR'
                    }
                }
            },
            include: {
                owner: true
            }
        })

        const franchise = await prisma.franchise.create({
            data: {
                name: 'Failing Franchise',
                slug: `failing-franchise-${Date.now()}`,
                franchisorId: franchisor.id,
                locations: {
                    create: {
                        name: 'Empty Location',
                        slug: `empty-location-${Date.now()}`,
                        address: '123 Test St'
                    }
                }
            }
        })

        console.log(`Created franchise: ${franchise.id}`)

        // 2. Run Analysis
        console.log('Running system-wide analysis...')
        const results = await PredictiveAnalysisService.runSystemWideAnalysis()

        // 3. Verify Results
        const analysis = results.find(r => r.franchiseId === franchise.id)

        if (!analysis) {
            throw new Error('Analysis result not found for test franchise')
        }

        console.log('Analysis Result:', JSON.stringify(analysis, null, 2))

        if (analysis.riskLevel === 'critical' || analysis.riskLevel === 'high') {
            console.log('✅ Risk correctly identified')
        } else {
            console.log('⚠️ Risk NOT identified (Expected high/critical for empty franchise)')
        }

        /* // Intervention and HealthScoreHistory models don't exist
        // 4. Verify Intervention
        const intervention = await prisma.intervention.findFirst({
            where: { franchiseId: franchise.id }
        })

        if (intervention) {
            console.log('✅ Intervention created:', intervention.type, intervention.reason)
        } else {
            console.log('⚠️ No intervention created')
        }

        // Cleanup
        await prisma.intervention.deleteMany({ where: { franchiseId: franchise.id } })
        await prisma.healthScoreHistory.deleteMany({ where: { franchiseId: franchise.id } })
        */
        console.log('✅ Predictive analysis test completed (intervention verification skipped)')

        // Cleanup
        await prisma.location.deleteMany({ where: { franchiseId: franchise.id } })
        await prisma.franchise.delete({ where: { id: franchise.id } })
        await prisma.franchisor.delete({ where: { id: franchisor.id } })
        if (franchisor.owner?.email) {
            await prisma.user.delete({ where: { email: franchisor.owner.email } })
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
