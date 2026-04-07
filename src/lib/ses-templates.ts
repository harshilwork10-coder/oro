/**
 * SES Email Templates
 * 
 * Production-ready HTML email templates with inline CSS.
 * All templates use ORO gold (#D4A843) branding with dark theme.
 * Mobile-responsive with 600px max-width.
 */

const APP_URL = process.env.NEXTAUTH_URL || 'https://www.oronext.app'

// ─── Shared Styles ──────────────────────────────────────────────────────────

const baseStyles = `
  body { margin: 0; padding: 0; background-color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; background-color: #1c1917; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #D4A843 0%, #b8912e 100%); padding: 32px 24px; text-align: center; }
  .header h1 { color: #1c1917; font-size: 24px; font-weight: 700; margin: 0; }
  .header p { color: #44403c; font-size: 14px; margin: 8px 0 0; }
  .body { padding: 32px 24px; color: #d6d3d1; }
  .body h2 { color: #fafaf9; font-size: 20px; margin: 0 0 16px; }
  .body p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #a8a29e; }
  .card { background: #292524; border: 1px solid #44403c; border-radius: 8px; padding: 20px; margin: 16px 0; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #44403c33; }
  .row:last-child { border-bottom: none; }
  .label { color: #78716c; font-size: 13px; }
  .value { color: #fafaf9; font-size: 14px; font-weight: 600; text-align: right; }
  .total-row { padding: 12px 0 0; margin-top: 8px; border-top: 2px solid #D4A843; }
  .btn { display: inline-block; background: linear-gradient(135deg, #D4A843 0%, #b8912e 100%); color: #1c1917 !important; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; margin: 16px 0; }
  .footer { padding: 24px; text-align: center; border-top: 1px solid #292524; }
  .footer p { color: #57534e; font-size: 12px; margin: 4px 0; }
  .footer a { color: #D4A843; text-decoration: none; }
  .gold { color: #D4A843; }
  .badge { display: inline-block; background: #D4A84320; color: #D4A843; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 12px; }
`

function wrapInLayout(content: string, storeName?: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head>
<body>
  <div style="padding: 20px; background-color: #1a1a1a;">
    <div class="container">
      ${content}
      <div class="footer">
        <p>${storeName ? `Sent by ${storeName} via ORO` : 'Sent by ORO'}</p>
        <p>Powered by <a href="${APP_URL}">ORO POS</a></p>
      </div>
    </div>
  </div>
</body>
</html>`
}

function wrapInMarketingLayout(content: string, storeName: string, recipientEmail: string): string {
  const unsubUrl = `${APP_URL}/api/email/unsubscribe?email=${encodeURIComponent(recipientEmail)}`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyles}</style></head>
<body>
  <div style="padding: 20px; background-color: #1a1a1a;">
    <div class="container">
      ${content}
      <div class="footer">
        <p>Sent by ${storeName}</p>
        <p>Powered by <a href="${APP_URL}">ORO POS</a></p>
        <p style="margin-top: 12px;">
          <a href="${unsubUrl}" style="color: #78716c; font-size: 11px;">Unsubscribe from marketing emails</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
}

// ─── Receipt Email ──────────────────────────────────────────────────────────

export interface ReceiptItem {
  name: string
  qty: number
  price: number
  total: number
}

export interface ReceiptData {
  storeName: string
  receiptNumber: string
  date: string
  items: ReceiptItem[]
  subtotal: number
  tax: number
  total: number
  paymentMethod: string
  cashierName?: string
  loyaltyPointsEarned?: number
  storeAddress?: string
  storePhone?: string
}

export function buildReceiptEmail(data: ReceiptData): { subject: string; html: string } {
  const itemRows = data.items.map(item => `
    <tr>
      <td style="padding: 8px 0; color: #d6d3d1; font-size: 14px;">${item.name}</td>
      <td style="padding: 8px 0; color: #a8a29e; font-size: 13px; text-align: center;">${item.qty}</td>
      <td style="padding: 8px 0; color: #fafaf9; font-size: 14px; text-align: right; font-weight: 500;">$${item.total.toFixed(2)}</td>
    </tr>
  `).join('')

  const content = `
    <div class="header">
      <h1>${data.storeName}</h1>
      <p>Digital Receipt</p>
    </div>
    <div class="body">
      <div class="card">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #44403c;">
            <td style="padding: 4px 0 8px; color: #78716c; font-size: 12px; text-transform: uppercase;">Item</td>
            <td style="padding: 4px 0 8px; color: #78716c; font-size: 12px; text-transform: uppercase; text-align: center;">Qty</td>
            <td style="padding: 4px 0 8px; color: #78716c; font-size: 12px; text-transform: uppercase; text-align: right;">Total</td>
          </tr>
          ${itemRows}
        </table>
      </div>

      <div class="card">
        <div class="row"><span class="label">Subtotal</span><span class="value">$${data.subtotal.toFixed(2)}</span></div>
        <div class="row"><span class="label">Tax</span><span class="value">$${data.tax.toFixed(2)}</span></div>
        <div class="row total-row"><span class="label" style="color: #D4A843; font-weight: 700;">Total</span><span class="value" style="color: #D4A843; font-size: 18px;">$${data.total.toFixed(2)}</span></div>
        <div class="row"><span class="label">Payment</span><span class="value">${data.paymentMethod}</span></div>
      </div>

      ${data.loyaltyPointsEarned ? `
        <div style="text-align: center; margin: 16px 0;">
          <span class="badge">+${data.loyaltyPointsEarned} loyalty points earned</span>
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 8px;">
        <p style="font-size: 12px; color: #57534e;">Receipt #${data.receiptNumber} · ${data.date}</p>
        ${data.cashierName ? `<p style="font-size: 12px; color: #57534e;">Served by ${data.cashierName}</p>` : ''}
        ${data.storeAddress ? `<p style="font-size: 12px; color: #57534e;">${data.storeAddress}</p>` : ''}
        ${data.storePhone ? `<p style="font-size: 12px; color: #57534e;">${data.storePhone}</p>` : ''}
      </div>
    </div>
  `

  return {
    subject: `Your receipt from ${data.storeName} — $${data.total.toFixed(2)}`,
    html: wrapInLayout(content, data.storeName),
  }
}

// ─── Gift Card Email ────────────────────────────────────────────────────────

export function buildGiftCardEmail(data: {
  storeName: string
  recipientName: string
  senderName: string
  amount: number
  code: string
  message?: string
}): { subject: string; html: string } {
  const content = `
    <div class="header">
      <h1>🎁 You've received a gift!</h1>
      <p>from ${data.senderName}</p>
    </div>
    <div class="body">
      <div style="text-align: center; margin: 24px 0;">
        <p style="color: #a8a29e; font-size: 15px;">Hi ${data.recipientName},</p>
        <p style="color: #d6d3d1; font-size: 16px;">${data.senderName} sent you a gift card to <strong class="gold">${data.storeName}</strong></p>
      </div>

      <div class="card" style="text-align: center;">
        <p style="color: #78716c; font-size: 13px; margin-bottom: 8px;">Gift Card Value</p>
        <p style="color: #D4A843; font-size: 36px; font-weight: 800; margin: 0;">$${data.amount.toFixed(2)}</p>
        <div style="margin: 20px 0; padding: 16px; background: #1c1917; border-radius: 8px; border: 1px dashed #D4A843;">
          <p style="color: #78716c; font-size: 11px; margin: 0 0 4px;">Redemption Code</p>
          <p style="color: #fafaf9; font-size: 24px; font-weight: 700; letter-spacing: 3px; margin: 0;">${data.code}</p>
        </div>
        ${data.message ? `<p style="color: #a8a29e; font-style: italic; font-size: 14px;">"${data.message}"</p>` : ''}
      </div>

      <p style="text-align: center; font-size: 13px; color: #78716c;">Present this code at ${data.storeName} to redeem.</p>
    </div>
  `

  return {
    subject: `${data.senderName} sent you a $${data.amount.toFixed(2)} gift card to ${data.storeName}!`,
    html: wrapInLayout(content, data.storeName),
  }
}

// ─── Password Reset Email ───────────────────────────────────────────────────

export function buildPasswordResetEmail(data: {
  userName: string
  resetUrl: string
  expiresInMinutes?: number
}): { subject: string; html: string } {
  const expires = data.expiresInMinutes || 60

  const content = `
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="body">
      <p>Hi ${data.userName},</p>
      <p>We received a request to reset your password. Click the button below to set a new one:</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.resetUrl}" class="btn">Reset Password</a>
      </div>

      <div class="card">
        <p style="font-size: 13px; color: #78716c; margin: 0;">This link expires in ${expires} minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    </div>
  `

  return {
    subject: 'Reset your ORO password',
    html: wrapInLayout(content),
  }
}

// ─── Magic Link Email ───────────────────────────────────────────────────────

export function buildMagicLinkEmail(data: {
  loginUrl: string
  expiresInMinutes?: number
}): { subject: string; html: string } {
  const expires = data.expiresInMinutes || 15

  const content = `
    <div class="header">
      <h1>Sign In to ORO</h1>
    </div>
    <div class="body">
      <p>Click the button below to sign in to your ORO account:</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.loginUrl}" class="btn">Sign In</a>
      </div>

      <div class="card">
        <p style="font-size: 13px; color: #78716c; margin: 0;">This link expires in ${expires} minutes and can only be used once.</p>
      </div>
    </div>
  `

  return {
    subject: 'Sign in to ORO',
    html: wrapInLayout(content),
  }
}

// ─── Marketing Campaign Email ───────────────────────────────────────────────

export function buildCampaignEmail(data: {
  storeName: string
  recipientEmail: string
  heading: string
  body: string
  ctaText?: string
  ctaUrl?: string
  imageUrl?: string
}): { subject: string; html: string } {
  const content = `
    <div class="header">
      <h1>${data.storeName}</h1>
    </div>
    <div class="body">
      ${data.imageUrl ? `<img src="${data.imageUrl}" alt="" style="width: 100%; border-radius: 8px; margin-bottom: 16px;" />` : ''}
      <h2>${data.heading}</h2>
      <div style="color: #a8a29e; font-size: 15px; line-height: 1.7;">${data.body}</div>

      ${data.ctaText && data.ctaUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${data.ctaUrl}" class="btn">${data.ctaText}</a>
        </div>
      ` : ''}
    </div>
  `

  return {
    subject: data.heading,
    html: wrapInMarketingLayout(content, data.storeName, data.recipientEmail),
  }
}

// ─── Loyalty Points Email ───────────────────────────────────────────────────

export function buildLoyaltyEmail(data: {
  storeName: string
  recipientEmail: string
  customerName: string
  currentPoints: number
  pointsToNextReward: number
  rewardDescription: string
}): { subject: string; html: string } {
  const content = `
    <div class="header">
      <h1>${data.storeName}</h1>
      <p>Loyalty Update</p>
    </div>
    <div class="body">
      <p>Hi ${data.customerName},</p>

      <div class="card" style="text-align: center;">
        <p style="color: #78716c; font-size: 13px; margin-bottom: 4px;">Your Points Balance</p>
        <p style="color: #D4A843; font-size: 40px; font-weight: 800; margin: 0;">${data.currentPoints.toLocaleString()}</p>
        <p style="color: #a8a29e; font-size: 14px; margin-top: 12px;">
          Only <strong class="gold">${data.pointsToNextReward}</strong> more points until your next reward!
        </p>
        <p style="color: #78716c; font-size: 13px;">${data.rewardDescription}</p>
      </div>

      <p style="text-align: center;">Visit ${data.storeName} to earn more points!</p>
    </div>
  `

  return {
    subject: `Your loyalty update from ${data.storeName}`,
    html: wrapInMarketingLayout(content, data.storeName, data.recipientEmail),
  }
}
