/**
 * Email Service — Backward-compatible wrapper around SES
 * 
 * Replaces the old mock sendEmail function.
 * Existing consumers keep working without changes.
 * New code should import from '@/lib/ses' directly for full control.
 */

import { sendEmail as sesSendEmail, type SendEmailResult } from '@/lib/ses'

export async function sendEmail({ 
  to, 
  subject, 
  text, 
  html 
}: { 
  to: string
  subject: string
  text?: string
  html?: string 
}): Promise<{ success: boolean; messageId: string }> {
  const result: SendEmailResult = await sesSendEmail({
    to,
    subject,
    html: html || `<p>${text || ''}</p>`,
    text,
    lane: 'TRANSACTIONAL',
    template: 'custom',
  })

  return {
    success: result.success,
    messageId: result.messageId || `fallback-${Date.now()}`,
  }
}
