// SMS Service - Centralized Twilio SMS utility
// Handles all SMS notifications in the system
// 
// Twilio credentials are read from environment variables (.env):
//   TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
//   TWILIO_AUTH_TOKEN=xxxxx
//   TWILIO_PHONE_NUMBER=+15551234567
//
// This is more secure than storing in database!

import { prisma } from '@/lib/prisma'

interface SMSResult {
    success: boolean
    messageId?: string
    error?: string
}

// Get Twilio config from environment variables
function getTwilioConfig() {
    return {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
    }
}

// Check if franchise has SMS enabled and approved AND has credits
async function checkSmsAccess(franchiseId: string): Promise<{ allowed: boolean; credits: number; error?: string }> {
    try {
        const settings = await prisma.reminderSettings.findUnique({
            where: { franchiseId }
        })

        // Must have SMS enabled AND approved by provider
        if (!settings?.smsEnabled || !settings?.smsApproved) {
            return { allowed: false, credits: 0, error: 'SMS not enabled or not approved' }
        }

        // Check credits
        const smsCredits = await prisma.smsCredits.findUnique({
            where: { franchiseId }
        })

        const credits = smsCredits?.creditsRemaining || 0
        if (credits <= 0) {
            return { allowed: false, credits: 0, error: 'No SMS credits remaining. Please purchase a package.' }
        }

        return { allowed: true, credits }
    } catch {
        return { allowed: false, credits: 0, error: 'Failed to check SMS access' }
    }
}

// Deduct credit and log SMS
async function deductCreditAndLog(franchiseId: string, phone: string, message: string, status: string, twilioSid?: string, errorMsg?: string) {
    try {
        // Deduct credit
        await prisma.smsCredits.update({
            where: { franchiseId },
            data: {
                creditsRemaining: { decrement: 1 },
                creditsUsed: { increment: 1 }
            }
        })

        // Log the SMS
        await prisma.smsLog.create({
            data: {
                franchiseId,
                toPhone: phone,
                message: message.substring(0, 500), // Limit message length
                status,
                twilioSid,
                errorMsg
            }
        })
    } catch (error) {
        console.error('Failed to log SMS:', error)
    }
}

export async function sendSMS(
    to: string,
    message: string,
    franchiseId: string
): Promise<SMSResult> {
    try {
        // Check if franchise has SMS access and credits
        const access = await checkSmsAccess(franchiseId)
        if (!access.allowed) {
            return { success: false, error: access.error }
        }

        // Get Twilio credentials from environment variables
        const twilio = getTwilioConfig()

        if (!twilio.accountSid || !twilio.authToken || !twilio.phoneNumber) {
            return { success: false, error: 'Twilio not configured in .env' }
        }

        // Format phone number
        const formattedPhone = formatPhoneNumber(to)
        if (!formattedPhone) {
            return { success: false, error: 'Invalid phone number' }
        }

        // Send via Twilio
        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${twilio.accountSid}:${twilio.authToken}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    To: formattedPhone,
                    From: twilio.phoneNumber,
                    Body: message
                })
            }
        )

        const data = await response.json()

        if (response.ok) {
            // Deduct credit and log success
            await deductCreditAndLog(franchiseId, formattedPhone, message, 'sent', data.sid)
            return { success: true, messageId: data.sid }
        } else {
            // Log failure (still deduct? No - don't charge for failed)
            await prisma.smsLog.create({
                data: {
                    franchiseId,
                    toPhone: formattedPhone,
                    message: message.substring(0, 500),
                    status: 'failed',
                    errorMsg: data.message
                }
            })
            return { success: false, error: data.message || 'Failed to send SMS' }
        }
    } catch (error) {
        console.error('SMS Error:', error)
        return { success: false, error: 'SMS service error' }
    }
}

function formatPhoneNumber(phone: string): string | null {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '')

    // US number handling
    if (digits.length === 10) {
        return `+1${digits}`
    } else if (digits.length === 11 && digits.startsWith('1')) {
        return `+${digits}`
    } else if (digits.startsWith('+')) {
        return phone
    }

    return null
}

// ============ SMS Templates ============

export async function sendBookingConfirmationSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        serviceName: string
        date: string
        time: string
        location?: string
    }
): Promise<SMSResult> {
    const message = `✅ Booking Confirmed!

Hi ${data.customerName.split(' ')[0]}! Your appointment is confirmed.

📍 ${data.businessName}
📅 ${data.date}
⏰ ${data.time}
✂️ ${data.serviceName}

See you soon! 😊`

    return sendSMS(phone, message, franchiseId)
}

export async function sendBookingRequestSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        serviceName: string
        date: string
        time: string
    }
): Promise<SMSResult> {
    const message = `📱 Booking Request Received!

Hi ${data.customerName.split(' ')[0]}! We received your booking request.

📍 ${data.businessName}
📅 ${data.date}
⏰ ${data.time}
✂️ ${data.serviceName}

⏳ Please allow 10 minutes for confirmation. We'll text you when approved!`

    return sendSMS(phone, message, franchiseId)
}

export async function sendBookingApprovedSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        serviceName: string
        date: string
        time: string
    }
): Promise<SMSResult> {
    const message = `🎉 Great news, ${data.customerName.split(' ')[0]}!

Your appointment is CONFIRMED!

📍 ${data.businessName}
📅 ${data.date}
⏰ ${data.time}
✂️ ${data.serviceName}

We look forward to seeing you! ✨`

    return sendSMS(phone, message, franchiseId)
}

export async function sendBookingRejectedSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        serviceName: string
        date: string
        time: string
    }
): Promise<SMSResult> {
    const message = `Hi ${data.customerName.split(' ')[0]},

Unfortunately, we couldn't confirm your appointment for ${data.date} at ${data.time}.

📞 Please call us to reschedule or book a different time online.

Sorry for any inconvenience!
- ${data.businessName}`

    return sendSMS(phone, message, franchiseId)
}

export async function sendBookingCancelledSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        serviceName: string
        date: string
        time: string
    }
): Promise<SMSResult> {
    const message = `Hi ${data.customerName.split(' ')[0]},

Your appointment has been cancelled:

📅 ${data.date} at ${data.time}
✂️ ${data.serviceName}

Need to rebook? Visit us online or give us a call!
- ${data.businessName}`

    return sendSMS(phone, message, franchiseId)
}

export async function sendAppointmentReminderSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        serviceName: string
        date: string
        time: string
        hoursUntil: number
    }
): Promise<SMSResult> {
    const timeText = data.hoursUntil <= 2 ? 'in 2 hours' : 'tomorrow'

    const message = `🗓️ Reminder: Your appointment is ${timeText}!

📍 ${data.businessName}
📅 ${data.date}
⏰ ${data.time}
✂️ ${data.serviceName}

See you soon! 😊`

    return sendSMS(phone, message, franchiseId)
}

export async function sendWaitlistNotificationSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        position?: number
    }
): Promise<SMSResult> {
    const message = `🔔 ${data.customerName.split(' ')[0]}, you're up next!

📍 ${data.businessName}

Please head to the front desk now. We're ready for you!

See you in a moment! 🏃`

    return sendSMS(phone, message, franchiseId)
}

export async function sendWaitlistAddedSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        position: number
        estimatedWait: number
    }
): Promise<SMSResult> {
    const message = `📝 You're on the waitlist!

Hi ${data.customerName.split(' ')[0]}! You're #${data.position} in line.

📍 ${data.businessName}
⏱️ Estimated wait: ~${data.estimatedWait} minutes

We'll text you when you're up! Feel free to grab a coffee nearby. ☕`

    return sendSMS(phone, message, franchiseId)
}

// ============ Promotional SMS Templates ============

export async function sendPromotionalSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        offerTitle: string
        offerDetails: string
        expiryDate?: string
        promoCode?: string
    }
): Promise<SMSResult> {
    let message = `🎁 Special Offer for You!

Hi ${data.customerName.split(' ')[0]}!

${data.offerTitle}
${data.offerDetails}`

    if (data.promoCode) {
        message += `\n\n🏷️ Use code: ${data.promoCode}`
    }

    if (data.expiryDate) {
        message += `\n⏰ Expires: ${data.expiryDate}`
    }

    message += `\n\nBook now at ${data.businessName}! 💜

Reply STOP to unsubscribe`

    return sendSMS(phone, message, franchiseId)
}

export async function sendDiscountSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        discountPercent: number
        validUntil?: string
    }
): Promise<SMSResult> {
    const message = `🔥 ${data.discountPercent}% OFF Just For You!

Hi ${data.customerName.split(' ')[0]}!

Get ${data.discountPercent}% off your next visit to ${data.businessName}! 

${data.validUntil ? `📅 Valid until: ${data.validUntil}\n` : ''}
Book now and save! 💰

Reply STOP to unsubscribe`

    return sendSMS(phone, message, franchiseId)
}

export async function sendBirthdaySMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        offerDetails: string
    }
): Promise<SMSResult> {
    const message = `🎂 Happy Birthday, ${data.customerName.split(' ')[0]}! 🎉

From all of us at ${data.businessName}, we wish you an amazing day!

🎁 Here's a special birthday gift:
${data.offerDetails}

Treat yourself! You deserve it! 💜

Reply STOP to unsubscribe`

    return sendSMS(phone, message, franchiseId)
}

export async function sendMissYouSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        lastVisitDays: number
        offerDetails?: string
    }
): Promise<SMSResult> {
    let message = `💜 We Miss You, ${data.customerName.split(' ')[0]}!

It's been ${data.lastVisitDays} days since your last visit to ${data.businessName}.`

    if (data.offerDetails) {
        message += `\n\n🎁 Come back soon and enjoy:\n${data.offerDetails}`
    }

    message += `\n\nWe'd love to see you again! Book today! 😊

Reply STOP to unsubscribe`

    return sendSMS(phone, message, franchiseId)
}

export async function sendReviewRequestSMS(
    phone: string,
    franchiseId: string,
    data: {
        customerName: string
        businessName: string
        reviewLink?: string
    }
): Promise<SMSResult> {
    const message = `⭐ How was your visit, ${data.customerName.split(' ')[0]}?

We hope you loved your experience at ${data.businessName}!

Your feedback means the world to us. Could you take 30 seconds to leave us a review?

${data.reviewLink || 'Visit our website to share your thoughts!'}

Thank you! 💜`

    return sendSMS(phone, message, franchiseId)
}

export async function sendCustomSMS(
    phone: string,
    franchiseId: string,
    message: string
): Promise<SMSResult> {
    return sendSMS(phone, message, franchiseId)
}


