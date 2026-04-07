import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/webhooks/ses
 * 
 * Receives SES event notifications via SNS.
 * Tracks: Send, Delivery, Open, Click, Bounce, Complaint
 * 
 * Setup:
 * 1. Create SNS topic in AWS
 * 2. Subscribe this endpoint to the topic  
 * 3. Add SNS destination to both SES Configuration Sets
 */

interface SNSMessage {
  Type: string
  MessageId: string
  TopicArn: string
  Message: string
  SubscribeURL?: string
  Token?: string
}

interface SESEvent {
  eventType: string  // Send|Delivery|Open|Click|Bounce|Complaint
  mail: {
    messageId: string
    destination: string[]
    tags?: Record<string, string[]>
  }
  bounce?: {
    bounceType: string  // Permanent|Transient
    bouncedRecipients: Array<{ emailAddress: string }>
  }
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as SNSMessage

    // Handle SNS subscription confirmation
    if (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) {
      console.log('[SES_WEBHOOK] Confirming SNS subscription...')
      await fetch(body.SubscribeURL)
      return NextResponse.json({ confirmed: true })
    }

    // Handle notification
    if (body.Type === 'Notification') {
      const event: SESEvent = JSON.parse(body.Message)
      const { eventType, mail } = event
      const messageId = mail.messageId
      const recipientEmail = mail.destination?.[0]
      const lane = mail.tags?.lane?.[0] || 'TRANSACTIONAL'

      // Map SES event type to our status
      const statusMap: Record<string, string> = {
        'Send': 'SENT',
        'Delivery': 'DELIVERED',
        'Open': 'OPENED',
        'Click': 'CLICKED',
        'Bounce': 'BOUNCED',
        'Complaint': 'COMPLAINED',
      }
      const status = statusMap[eventType] || eventType

      // Update or create email event record
      try {
        await prisma.emailEvent.upsert({
          where: { messageId },
          update: { status, updatedAt: new Date() },
          create: {
            messageId,
            lane,
            recipientEmail: recipientEmail || '',
            template: mail.tags?.template?.[0] || 'unknown',
            status,
            franchiseId: mail.tags?.franchiseId?.[0] || null,
          },
        })
      } catch {
        console.warn('[SES_WEBHOOK] Failed to upsert email event:', messageId)
      }

      // Handle bounces — add to suppression list
      if (eventType === 'Bounce' && event.bounce) {
        const isPermanent = event.bounce.bounceType === 'Permanent'
        for (const recipient of event.bounce.bouncedRecipients) {
          const email = recipient.emailAddress.toLowerCase()
          try {
            await prisma.emailSuppression.upsert({
              where: { email },
              update: { 
                reason: 'BOUNCE', 
                lane: isPermanent ? 'ALL' : 'MARKETING',  
              },
              create: {
                email,
                reason: 'BOUNCE',
                lane: isPermanent ? 'ALL' : 'MARKETING',
              },
            })
            console.log(`[SES_WEBHOOK] ${isPermanent ? 'Hard' : 'Soft'} bounce suppressed: ${email}`)
          } catch {
            console.warn('[SES_WEBHOOK] Failed to suppress bounced email:', email)
          }
        }
      }

      // Handle complaints — auto-suppress from marketing
      if (eventType === 'Complaint' && event.complaint) {
        for (const recipient of event.complaint.complainedRecipients) {
          const email = recipient.emailAddress.toLowerCase()
          try {
            await prisma.emailSuppression.upsert({
              where: { email },
              update: { reason: 'COMPLAINT', lane: 'MARKETING' },
              create: {
                email,
                reason: 'COMPLAINT',
                lane: 'MARKETING',
              },
            })
            console.log(`[SES_WEBHOOK] Complaint suppressed: ${email}`)
          } catch {
            console.warn('[SES_WEBHOOK] Failed to suppress complained email:', email)
          }
        }
      }

      return NextResponse.json({ processed: true, event: eventType })
    }

    return NextResponse.json({ ignored: true })
  } catch (error: any) {
    console.error('[SES_WEBHOOK]', error?.message?.slice(0, 200))
    return NextResponse.json({ error: 'Webhook processing failed' })
  }
}
