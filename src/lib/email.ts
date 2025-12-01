import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
})

export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('[Email] Credentials missing. Logging email instead:')
        console.log(`To: ${to}\nSubject: ${subject}\nBody: ${html}`)
        return
    }

    try {
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to,
            subject,
            html
        })
        console.log(`[Email] Sent to ${to}`)
    } catch (error) {
        console.error('[Email] Failed to send:', error)
        // Don't throw, just log, so we don't break the flow if email fails
    }
}
