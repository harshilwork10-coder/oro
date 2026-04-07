import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/email/unsubscribe?email=xxx
 * 
 * One-click unsubscribe for marketing emails (RFC 8058 compliant).
 * Only affects MARKETING lane — transactional emails (receipts, etc.) still send.
 * 
 * GET  → Shows confirmation page
 * POST → Processes unsubscribe (for List-Unsubscribe-Post header)
 */

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')

  if (!email) {
    return new Response(buildPage('Invalid Link', 'This unsubscribe link is invalid.', false), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Check if already unsubscribed
  try {
    const existing = await prisma.emailSuppression.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing && (existing.lane === 'MARKETING' || existing.lane === 'ALL')) {
      return new Response(
        buildPage('Already Unsubscribed', `${email} is already unsubscribed from marketing emails.`, true),
        { headers: { 'Content-Type': 'text/html' } }
      )
    }
  } catch {
    // Continue even if DB check fails
  }

  // Process unsubscribe immediately on GET (one-click)
  try {
    await prisma.emailSuppression.upsert({
      where: { email: email.toLowerCase() },
      update: { reason: 'UNSUBSCRIBE', lane: 'MARKETING' },
      create: {
        email: email.toLowerCase(),
        reason: 'UNSUBSCRIBE',
        lane: 'MARKETING',
      },
    })
  } catch (error: any) {
    console.error('[UNSUBSCRIBE]', error?.message?.slice(0, 100))
    return new Response(
      buildPage('Error', 'Something went wrong. Please try again later.', false),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  return new Response(
    buildPage('Unsubscribed', `${email} has been unsubscribed from marketing emails. You will still receive receipts and account emails.`, true),
    { headers: { 'Content-Type': 'text/html' } }
  )
}

/** POST handler for RFC 8058 List-Unsubscribe-Post */
export async function POST(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  }

  try {
    await prisma.emailSuppression.upsert({
      where: { email: email.toLowerCase() },
      update: { reason: 'UNSUBSCRIBE', lane: 'MARKETING' },
      create: {
        email: email.toLowerCase(),
        reason: 'UNSUBSCRIBE',
        lane: 'MARKETING',
      },
    })

    return NextResponse.json({ success: true, message: 'Unsubscribed from marketing emails' })
  } catch (error: any) {
    console.error('[UNSUBSCRIBE_POST]', error?.message?.slice(0, 100))
    return NextResponse.json({ error: 'Failed to unsubscribe' })
  }
}

// ─── HTML Page Builder ──────────────────────────────────────────────────────

function buildPage(title: string, message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ORO</title>
  <style>
    body { margin: 0; padding: 0; background: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { max-width: 420px; background: #1c1917; border: 1px solid #292524; border-radius: 16px; padding: 40px; text-align: center; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #fafaf9; font-size: 22px; margin: 0 0 12px; }
    p { color: #a8a29e; font-size: 15px; line-height: 1.6; margin: 0; }
    .badge { display: inline-block; margin-top: 20px; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; }
    .success { background: #D4A84320; color: #D4A843; }
    .error { background: #ef444420; color: #ef4444; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <span class="badge ${success ? 'success' : 'error'}">${success ? 'Done' : 'Error'}</span>
  </div>
</body>
</html>`
}
