import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAppointmentReminderSMS } from '@/lib/sms'

// This endpoint should be called by a cron job (e.g., Vercel Cron, every 15 minutes)
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret if configured
        const authHeader = request.headers.get('authorization')
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

        // Get all franchises with reminder settings
        const franchises = await prisma.franchise.findMany({
            include: {
                reminderSettings: true,
                locations: {
                    include: {
                        appointments: {
                            where: {
                                status: 'SCHEDULED',
                                startTime: {
                                    gte: now,
                                    lte: in24Hours
                                }
                            },
                            include: {
                                client: true,
                                service: true,
                                employee: true,
                                location: {
                                    include: { franchise: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        const remindersToSend: {
            type: '24h' | '2h'
            method: 'email' | 'sms'
            appointment: any
            settings: any
            franchiseId: string
        }[] = []

        for (const franchise of franchises) {
            if (!franchise.reminderSettings) continue
            const settings = franchise.reminderSettings

            for (const location of franchise.locations) {
                for (const appointment of location.appointments) {
                    const startTime = new Date(appointment.startTime)
                    const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)

                    // 24-hour reminder (23-25 hours out)
                    if (hoursUntil >= 23 && hoursUntil <= 25) {
                        if (settings.emailEnabled && settings.reminder24hEmail && appointment.client.email) {
                            remindersToSend.push({
                                type: '24h',
                                method: 'email',
                                appointment,
                                settings,
                                franchiseId: franchise.id
                            })
                        }
                        if (settings.smsEnabled && settings.smsApproved && settings.reminder24hSms && appointment.client.phone) {
                            remindersToSend.push({
                                type: '24h',
                                method: 'sms',
                                appointment,
                                settings,
                                franchiseId: franchise.id
                            })
                        }
                    }

                    // 2-hour reminder (1.5-2.5 hours out)
                    if (hoursUntil >= 1.5 && hoursUntil <= 2.5) {
                        if (settings.emailEnabled && settings.reminder2hEmail && appointment.client.email) {
                            remindersToSend.push({
                                type: '2h',
                                method: 'email',
                                appointment,
                                settings,
                                franchiseId: franchise.id
                            })
                        }
                        if (settings.smsEnabled && settings.smsApproved && settings.reminder2hSms && appointment.client.phone) {
                            remindersToSend.push({
                                type: '2h',
                                method: 'sms',
                                appointment,
                                settings,
                                franchiseId: franchise.id
                            })
                        }
                    }
                }
            }
        }

        // Send reminders
        const results = {
            sent: 0,
            failed: 0,
            details: [] as string[]
        }

        for (const reminder of remindersToSend) {
            try {
                if (reminder.method === 'email') {
                    await sendEmailReminder(reminder.appointment, reminder.settings, reminder.type)
                    results.sent++
                    results.details.push(`Email sent to ${reminder.appointment.client.email}`)
                } else if (reminder.method === 'sms') {
                    const result = await sendSmsReminder(reminder.appointment, reminder.franchiseId, reminder.type)
                    if (result.success) {
                        results.sent++
                        results.details.push(`SMS sent to ${reminder.appointment.client.phone}`)
                    } else {
                        results.failed++
                        results.details.push(`SMS failed for ${reminder.appointment.client.phone}: ${result.error}`)
                    }
                }
            } catch (error) {
                results.failed++
                results.details.push(`Failed: ${reminder.method} to ${reminder.appointment.client.email || reminder.appointment.client.phone}`)
            }
        }

        return NextResponse.json({
            success: true,
            processed: remindersToSend.length,
            ...results
        })
    } catch (error) {
        console.error('Error processing reminders:', error)
        return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 })
    }
}

async function sendEmailReminder(appointment: any, settings: any, type: '24h' | '2h') {
    const client = appointment.client
    const service = appointment.service
    const location = appointment.location
    const startTime = new Date(appointment.startTime)

    const subject = settings.emailSubject || 'Appointment Reminder'
    const timeString = type === '24h' ? 'tomorrow' : 'in 2 hours'

    // Simple email template
    const html = settings.emailTemplate || `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Appointment Reminder</h2>
            <p>Hi ${client.firstName},</p>
            <p>This is a reminder that your appointment is coming up ${timeString}!</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;"><strong>${service.name}</strong></p>
                <p style="margin: 8px 0 0 0;">${startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                <p style="margin: 8px 0 0 0;">${location.name}</p>
                ${location.address ? `<p style="margin: 4px 0 0 0; color: #666;">${location.address}</p>` : ''}
            </div>
            <p>We look forward to seeing you!</p>
        </div>
    `

    // TODO: Integrate with email service (e.g., Resend, SendGrid, AWS SES)
    console.log(`[EMAIL] Would send to: ${client.email}`)
    console.log(`[EMAIL] Subject: ${subject}`)
}

async function sendSmsReminder(appointment: any, franchiseId: string, type: '24h' | '2h') {
    const client = appointment.client
    const service = appointment.service
    const location = appointment.location
    const startTime = new Date(appointment.startTime)

    // Use actual SMS service
    const result = await sendAppointmentReminderSMS(
        client.phone,
        franchiseId,
        {
            customerName: `${client.firstName} ${client.lastName}`,
            businessName: location.franchise?.name || location.name,
            serviceName: service.name,
            date: startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            time: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            hoursUntil: type === '24h' ? 24 : 2
        }
    )

    return result
}

