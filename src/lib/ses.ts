/**
 * Amazon SES Dual-Lane Email Service
 * 
 * Two isolated lanes:
 *   TRANSACTIONAL — receipts, gift cards, password resets, magic links
 *   MARKETING     — campaigns, promos, loyalty emails
 * 
 * Each lane uses a separate SES Configuration Set for reputation isolation.
 * Marketing emails check suppression list and include unsubscribe headers.
 * 
 * From format: "Store Name via ORO" <noreply@oronext.app>
 */

import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-sesv2'
import { prisma } from '@/lib/prisma'

// ─── Configuration ──────────────────────────────────────────────────────────

const SES_REGION = process.env.AWS_SES_REGION || 'us-east-1'
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@oronext.app'
const SES_RECEIPTS_EMAIL = process.env.SES_RECEIPTS_EMAIL || 'receipts@oronext.app'
const SES_DEALS_EMAIL = process.env.SES_DEALS_EMAIL || 'deals@oronext.app'
const SES_SECURITY_EMAIL = process.env.SES_SECURITY_EMAIL || 'security@oronext.app'
const SES_TRANSACTIONAL_CONFIG = process.env.SES_TRANSACTIONAL_CONFIG_SET || 'oro-transactional'
const SES_MARKETING_CONFIG = process.env.SES_MARKETING_CONFIG_SET || 'oro-marketing'
const APP_URL = process.env.NEXTAUTH_URL || 'https://www.oronext.app'

export type EmailLane = 'TRANSACTIONAL' | 'MARKETING'
export type EmailTemplate = 'receipt' | 'gift_card' | 'password_reset' | 'magic_link' | 'campaign' | 'promo' | 'loyalty' | 'welcome' | 'custom'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  /** Store/franchise name for "Store via ORO" from line */
  storeName?: string
  /** Store owner's reply-to email */
  replyTo?: string
  /** Which lane (auto-selects config set) */
  lane: EmailLane
  /** Template name for tracking */
  template?: EmailTemplate
  /** Franchise ID for tracking */
  franchiseId?: string
  /** Additional metadata for event tracking */
  metadata?: Record<string, string>
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
  suppressed?: boolean
}

// ─── SES Client (singleton) ─────────────────────────────────────────────────

let sesClient: SESv2Client | null = null

function getSESClient(): SESv2Client {
  if (!sesClient) {
    const config: any = { region: SES_REGION }

    // Use explicit credentials if provided, otherwise fall back to IAM role / env
    if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
      }
    }

    sesClient = new SESv2Client(config)
  }
  return sesClient
}

// ─── From Address Builder ───────────────────────────────────────────────────

function buildFromAddress(lane: EmailLane, storeName?: string, template?: EmailTemplate): string {
  // Security emails (password reset, etc.) come from ORO directly
  if (template === 'password_reset' || template === 'magic_link') {
    return `"ORO" <${SES_SECURITY_EMAIL}>`
  }

  // Receipt emails use receipts@ address
  if (template === 'receipt' || template === 'gift_card') {
    const name = storeName ? `${storeName} via ORO` : 'ORO'
    return `"${name}" <${SES_RECEIPTS_EMAIL}>`
  }

  // Marketing emails use deals@ address
  if (lane === 'MARKETING') {
    const name = storeName ? `${storeName}` : 'ORO Deals'
    return `"${name}" <${SES_DEALS_EMAIL}>`
  }

  // Default transactional
  const name = storeName ? `${storeName} via ORO` : 'ORO'
  return `"${name}" <${SES_FROM_EMAIL}>`
}

// ─── Suppression Check ──────────────────────────────────────────────────────

async function isEmailSuppressed(email: string, lane: EmailLane): Promise<boolean> {
  try {
    const suppression = await prisma.emailSuppression.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!suppression) return false

    // ALL-lane suppression blocks everything (hard bounce)
    if (suppression.lane === 'ALL') return true

    // MARKETING suppression only blocks marketing
    if (suppression.lane === 'MARKETING' && lane === 'MARKETING') return true

    return false
  } catch {
    // If DB check fails, don't block sending
    return false
  }
}

// ─── Unsubscribe Headers ────────────────────────────────────────────────────

function addUnsubscribeHeaders(email: string): Record<string, string> {
  const encodedEmail = encodeURIComponent(email)
  const unsubUrl = `${APP_URL}/api/email/unsubscribe?email=${encodedEmail}`

  return {
    'List-Unsubscribe': `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

// ─── Core Send Function ─────────────────────────────────────────────────────

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const {
    to,
    subject,
    html,
    text,
    storeName,
    replyTo,
    lane,
    template,
    franchiseId,
    metadata,
  } = options

  const recipients = Array.isArray(to) ? to : [to]

  // Check suppression for each recipient (marketing only)
  if (lane === 'MARKETING') {
    const suppressedResults = await Promise.all(
      recipients.map(email => isEmailSuppressed(email, lane))
    )
    const activeRecipients = recipients.filter((_, i) => !suppressedResults[i])

    if (activeRecipients.length === 0) {
      return { success: true, suppressed: true, messageId: `suppressed-${Date.now()}` }
    }
  }

  const fromAddress = buildFromAddress(lane, storeName, template)
  const configSet = lane === 'TRANSACTIONAL' ? SES_TRANSACTIONAL_CONFIG : SES_MARKETING_CONFIG

  // Build SES command
  const params: SendEmailCommandInput = {
    FromEmailAddress: fromAddress,
    Destination: {
      ToAddresses: recipients,
    },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          ...(text ? { Text: { Data: text, Charset: 'UTF-8' } } : {}),
        },
      },
    },
    ConfigurationSetName: configSet,
    EmailTags: [
      { Name: 'lane', Value: lane },
      { Name: 'template', Value: template || 'custom' },
      ...(franchiseId ? [{ Name: 'franchiseId', Value: franchiseId }] : []),
    ],
    ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
  }

  // Add unsubscribe headers for marketing emails
  if (lane === 'MARKETING') {
    const firstRecipient = recipients[0]
    const unsubHeaders = addUnsubscribeHeaders(firstRecipient)

    params.Content!.Simple!.Headers = Object.entries(unsubHeaders).map(([name, value]) => ({
      Name: name,
      Value: value,
    }))
  }

  try {
    const client = getSESClient()
    const command = new SendEmailCommand(params)
    const response = await client.send(command)
    const messageId = response.MessageId || `ses-${Date.now()}`

    // Log email event for tracking
    try {
      await prisma.emailEvent.create({
        data: {
          messageId,
          lane,
          recipientEmail: recipients[0],
          template: template || 'custom',
          status: 'SENT',
          franchiseId: franchiseId || null,
          metadata: metadata ? metadata : undefined,
        },
      })
    } catch {
      // Don't block send if logging fails
      console.warn('[SES] Failed to log email event for:', messageId)
    }

    return { success: true, messageId }
  } catch (error: any) {
    console.error(`[SES] Failed to send ${lane} email:`, error?.message?.slice(0, 200))

    return {
      success: false,
      error: error?.message || 'Failed to send email',
    }
  }
}

// ─── Convenience Functions ──────────────────────────────────────────────────

/** Send a receipt email */
export async function sendReceiptEmail(params: {
  to: string
  storeName: string
  storeEmail?: string
  subject: string
  html: string
  franchiseId?: string
}) {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    storeName: params.storeName,
    replyTo: params.storeEmail,
    lane: 'TRANSACTIONAL',
    template: 'receipt',
    franchiseId: params.franchiseId,
  })
}

/** Send a digital gift card */
export async function sendGiftCardEmail(params: {
  to: string
  storeName: string
  subject: string
  html: string
  franchiseId?: string
}) {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    storeName: params.storeName,
    lane: 'TRANSACTIONAL',
    template: 'gift_card',
    franchiseId: params.franchiseId,
  })
}

/** Send a password reset / magic link */
export async function sendAuthEmail(params: {
  to: string
  subject: string
  html: string
}) {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    lane: 'TRANSACTIONAL',
    template: 'password_reset',
  })
}

/** Send a marketing campaign email */
export async function sendMarketingEmail(params: {
  to: string | string[]
  storeName: string
  subject: string
  html: string
  franchiseId?: string
  template?: EmailTemplate
}) {
  return sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    storeName: params.storeName,
    lane: 'MARKETING',
    template: params.template || 'campaign',
    franchiseId: params.franchiseId,
  })
}
