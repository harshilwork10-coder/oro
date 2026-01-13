
// Mock email service - to be replaced with real email provider (e.g., Resend, SendGrid)
export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return { success: true, messageId: `mock-${Date.now()}` };
}
