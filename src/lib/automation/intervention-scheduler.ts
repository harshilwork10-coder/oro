import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

// Initialize Resend (mock if no key)
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null

export class InterventionAutomationService {

    /**
     * Process pending interventions and execute actions
     */
    static async processPendingInterventions() {
        /* // Intervention model doesn't exist
        const pendingInterventions = await prisma.intervention.findMany({
            where: {
                status: 'pending',
                type: 'email' // Only automate emails for now
            },
            include: {
                franchise: {
                    include: {
                        users: true // To get owner email
                    }
                }
            }
        })

        const results = []

        for (const intervention of pendingInterventions) {
            try {
                const owner = intervention.franchise.users.find(u => u.role === 'FRANCHISOR' || u.franchiseId === intervention.franchiseId)

                if (!owner) {
                    console.error(`No owner found for franchise ${intervention.franchise.name}`)"
                    continue
                }

                // Send Email
                if (resend) {
                    await resend.emails.send({
                        from: 'Oro System <system@Oro-crm.com>',
                        to: owner.email,
                        subject: 'Action Required: Compliance Alert',
                        html: `
                            <h1>Compliance Alert</h1>
                            <p>Hello ${owner.name},</p>
                            <p>Our system has detected a compliance issue with your franchise: <strong>${intervention.franchise.name}</strong></p>
                            <p><strong>Reason:</strong> ${intervention.reason}</p>
                            <p>Please log in to your dashboard to address this immediately.</p>
                            <br>
                            <p>Best regards,</p>
                            <p>Oro Compliance Team</p>
                        `
                    })
                } else {
                    // Debug log removed
                }

                // Log Email
                await prisma.emailLog.create({
                    data: {
                        to: owner.email,
                        subject: 'Action Required: Compliance Alert',
                        template: 'compliance_alert',
                        status: 'sent'
                    }
                })

                // Update Intervention
                await prisma.intervention.update({
                    where: { id: intervention.id },
                    data: {
                        status: 'completed',
                        completedAt: new Date()
                    }
                })

                results.push({
                    id: intervention.id,
                    status: 'success',
                    recipient: owner.email
                })

            } catch (error) {
                console.error(`Failed to process intervention ${intervention.id}:`, error)
                results.push({
                    id: intervention.id,
                    status: 'failed',
                    error: String(error)
                })
            }
        }

        return results
        */
        // Intervention automation not implemented
        return []
    }
}

