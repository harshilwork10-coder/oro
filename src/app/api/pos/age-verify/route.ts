import { getAuthUser } from '@/lib/auth/mobileAuth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/auditLog'

/**
 * Sprint 1: Age Verification — Server-Issued Session System
 * POST /api/pos/age-verify
 *
 * This route creates immutable AgeVerificationSession records in the database.
 * The transaction route consumes these sessions atomically — never trusts client booleans.
 *
 * Actions:
 *   CHECK    — Query if a product requires age verification (read-only, no session created)
 *   CREATE   — Verify age and create a server-issued AgeVerificationSession (returns sessionId)
 *   VALIDATE — Check if an existing session is still valid (not expired, not consumed)
 *   CANCEL   — Explicitly expire/invalidate a session
 *
 * Session Rules:
 *   - Expires 30 minutes after creation (configurable)
 *   - Single-use: consumed=true is set atomically by transaction/route.ts, NOT here
 *   - Scoped to franchise + employee
 *   - Manager override requires managerPin verification + creates audit trail
 *   - Session is never marked consumed by this route — only by the transaction route
 */

// Session expiration: 10 minutes — a checkout cycle should not take longer.
// If the cashier hasn't checked out within 10 minutes, the customer may have left.
const AGE_SESSION_TTL_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user?.franchiseId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json()
        const { action } = body

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: CHECK — Does this product require age verification?
        // Read-only query. No session created.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'check' || action === 'CHECK') {
            const { productId } = body
            if (!productId) {
                return NextResponse.json({ error: 'productId required' }, { status: 400 })
            }

            const product = await prisma.product.findFirst({
                where: { id: productId, franchiseId: user.franchiseId },
                select: {
                    id: true, name: true, category: true,
                    ageRestricted: true, minimumAge: true,
                    productCategory: {
                        select: { ageRestricted: true, minimumAge: true }
                    }
                }
            })
            if (!product) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 })
            }

            // Check both product-level AND category-level age restriction
            const isRestricted = product.ageRestricted || product.productCategory?.ageRestricted || false

            // Fallback: detect by category name for stores that haven't migrated to flags
            const restrictedCategories = ['Tobacco', 'Cigarettes', 'Cigars', 'Vape', 'Beer', 'Wine', 'Liquor', 'Alcohol', 'Spirits']
            const categoryNameMatch = restrictedCategories.some(
                c => (product.category || '').toLowerCase().includes(c.toLowerCase())
            )

            const requiresVerification = isRestricted || categoryNameMatch

            // Resolve minimum age: product override > category > default 21
            let minAge = product.minimumAge || product.productCategory?.minimumAge || 0
            if (!minAge && requiresVerification) minAge = 21

            return NextResponse.json({
                productId: product.id,
                productName: product.name,
                requiresVerification,
                minimumAge: minAge,
                verificationMethods: [
                    { id: 'DL_SCAN', label: "Scan Driver's License", icon: '🪪', recommended: true },
                    { id: 'MANUAL_DOB', label: 'Enter Date of Birth', icon: '📅', recommended: false },
                    { id: 'VISUAL', label: 'Visual Confirmation (30+)', icon: '👁️', recommended: false },
                    { id: 'MANAGER_OVERRIDE', label: 'Manager Override', icon: '🔑', recommended: false }
                ]
            })
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: CREATE — Verify age and create server-issued session
        // This is the ONLY way to get an ageVerificationSessionId.
        // The frontend must call this, receive the sessionId, and pass
        // it to POST /api/pos/transaction at checkout.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'verify' || action === 'CREATE') {
            const { method, dateOfBirth, dlData, stationId, productId, productName, managerPin, overrideReason } = body

            if (!method) {
                return NextResponse.json({ error: 'method required (DL_SCAN, MANUAL_DOB, VISUAL, MANAGER_OVERRIDE)' }, { status: 400 })
            }

            // Sprint 1: Derive minimumAge from product/category server-side — never trust client-sent age
            let requiredAge = 21 // Default to strictest
            if (productId) {
                const restrictedProduct = await prisma.product.findFirst({
                    where: { id: productId, franchiseId: user.franchiseId },
                    select: {
                        minimumAge: true, ageRestricted: true,
                        productCategory: { select: { minimumAge: true, ageRestricted: true } }
                    }
                })
                if (restrictedProduct) {
                    // Product-level override > category-level > default 21
                    requiredAge = restrictedProduct.minimumAge
                        || restrictedProduct.productCategory?.minimumAge
                        || 21
                }
            }
            // Fallback: if client sent minimumAge AND no productId, use client value as floor
            // but never below 18 and never above 21 for safety
            if (!productId && body.minimumAge) {
                requiredAge = Math.max(18, Math.min(Number(body.minimumAge) || 21, 21))
            }

            let verified = false
            let customerAge: number | null = null
            let verificationDetail = ''
            let overrideByUserId: string | null = null

            // ── DL_SCAN: Compute age from driver's license DOB ──
            if (method === 'DL_SCAN' && dlData?.dateOfBirth) {
                const dob = new Date(dlData.dateOfBirth)
                if (isNaN(dob.getTime())) {
                    return NextResponse.json({ error: 'Invalid date of birth from DL scan' }, { status: 400 })
                }
                customerAge = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000))
                verified = customerAge >= requiredAge
                verificationDetail = `DL scanned: DOB ${dob.toLocaleDateString()}, Age ${customerAge}`

            // ── MANUAL_DOB: Compute age from manually entered DOB ──
            } else if (method === 'MANUAL_DOB' && dateOfBirth) {
                const dob = new Date(dateOfBirth)
                if (isNaN(dob.getTime())) {
                    return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
                }
                customerAge = Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400000))
                verified = customerAge >= requiredAge
                verificationDetail = `Manual DOB: ${dob.toLocaleDateString()}, Age ${customerAge}`

            // ── VISUAL: Cashier visually confirms customer appears 30+ ──
            } else if (method === 'VISUAL') {
                verified = true
                customerAge = null // Not computed for visual
                verificationDetail = 'Visual confirmation — customer appears 30+'

            // ── MANAGER_OVERRIDE: Manager authorizes sale via PIN ──
            } else if (method === 'MANAGER_OVERRIDE') {
                if (!managerPin) {
                    return NextResponse.json({ error: 'managerPin required for MANAGER_OVERRIDE' }, { status: 400 })
                }
                if (!overrideReason) {
                    return NextResponse.json({ error: 'overrideReason required for MANAGER_OVERRIDE' }, { status: 400 })
                }

                // Verify the manager PIN belongs to a user with OWNER or MANAGER role
                const manager = await prisma.user.findFirst({
                    where: {
                        franchiseId: user.franchiseId,
                        pin: managerPin,
                        role: { in: ['OWNER', 'MANAGER', 'ADMIN', 'FRANCHISOR', 'PROVIDER'] },
                        isActive: true,
                    },
                    select: { id: true, name: true, role: true }
                })

                if (!manager) {
                    await logActivity({
                        userId: user.id, userEmail: user.email, userRole: user.role,
                        franchiseId: user.franchiseId,
                        action: 'AGE_VERIFY_OVERRIDE_DENIED',
                        entityType: 'AgeVerificationSession', entityId: 'none',
                        details: {
                            reason: 'Invalid manager PIN or insufficient role',
                            productId, productName, requiredAge,
                            stationId, cashierId: user.id,
                        }
                    })
                    return NextResponse.json({ error: 'Invalid manager PIN or insufficient role' }, { status: 403 })
                }

                verified = true
                overrideByUserId = manager.id
                customerAge = null
                verificationDetail = `Manager override by ${manager.name} (${manager.role}): ${overrideReason}`

            } else {
                return NextResponse.json({
                    error: 'Invalid verification data. Provide method (DL_SCAN + dlData, MANUAL_DOB + dateOfBirth, VISUAL, or MANAGER_OVERRIDE + managerPin)'
                }, { status: 400 })
            }

            // ── If verification FAILED (customer too young) — log but do NOT create session ──
            if (!verified) {
                await logActivity({
                    userId: user.id, userEmail: user.email, userRole: user.role,
                    franchiseId: user.franchiseId,
                    action: 'AGE_VERIFY_FAILED',
                    entityType: 'Product', entityId: productId || 'unknown',
                    details: {
                        productName, method, requiredAge, customerAge,
                        verificationDetail, stationId,
                    }
                })

                return NextResponse.json({
                    verified: false,
                    ageVerificationSessionId: null,
                    reason: customerAge !== null
                        ? `Customer is ${customerAge} — must be ${requiredAge}+. Sale REFUSED.`
                        : 'Age verification failed. Sale REFUSED.',
                    action: 'REMOVE_ITEM'
                }, { status: 403 })
            }

            // ── Verification PASSED — create server-issued AgeVerificationSession ──
            const expiresAt = new Date(Date.now() + AGE_SESSION_TTL_MS)

            const session = await prisma.ageVerificationSession.create({
                data: {
                    franchiseId: user.franchiseId,
                    employeeId: user.id,
                    method,
                    minimumAge: requiredAge,
                    customerAge,
                    verified: true,
                    stationId: stationId || null,
                    expiresAt,
                    consumed: false,
                    consumedByTransactionId: null,
                    overrideByUserId,
                    overrideReason: method === 'MANAGER_OVERRIDE' ? (overrideReason || null) : null,
                }
            })

            // ── Audit log: successful verification ──
            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: method === 'MANAGER_OVERRIDE' ? 'AGE_VERIFY_MANAGER_OVERRIDE' : 'AGE_VERIFY_SESSION_CREATED',
                entityType: 'AgeVerificationSession', entityId: session.id,
                details: {
                    productId, productName, method, requiredAge, customerAge,
                    verificationDetail, stationId,
                    sessionExpiresAt: expiresAt.toISOString(),
                    overrideByUserId,
                    overrideReason: method === 'MANAGER_OVERRIDE' ? overrideReason : undefined,
                }
            })

            // ── Return server-issued session to frontend ──
            // The frontend stores ONLY the sessionId. It passes this to checkout.
            // The transaction route validates the session server-side.
            return NextResponse.json({
                verified: true,
                ageVerificationSessionId: session.id,
                expiresAt: session.expiresAt.toISOString(),
                minimumAge: session.minimumAge,
                method: session.method,
                detail: verificationDetail,
                canProceed: true,
            })
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: VALIDATE — Check if an existing session is still usable
        // Frontend calls this to verify a session hasn't expired before checkout.
        // Does NOT consume the session.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'VALIDATE') {
            const { ageVerificationSessionId } = body
            if (!ageVerificationSessionId) {
                return NextResponse.json({ error: 'ageVerificationSessionId required' }, { status: 400 })
            }

            const session = await prisma.ageVerificationSession.findFirst({
                where: {
                    id: ageVerificationSessionId,
                    franchiseId: user.franchiseId,
                }
            })

            if (!session) {
                return NextResponse.json({
                    valid: false,
                    reason: 'Session not found',
                }, { status: 404 })
            }

            const now = new Date()
            const isExpired = session.expiresAt < now
            const isConsumed = session.consumed
            const isValid = session.verified && !isExpired && !isConsumed

            return NextResponse.json({
                valid: isValid,
                ageVerificationSessionId: session.id,
                minimumAge: session.minimumAge,
                method: session.method,
                expiresAt: session.expiresAt.toISOString(),
                consumed: session.consumed,
                consumedByTransactionId: session.consumedByTransactionId,
                expired: isExpired,
                remainingMs: isExpired ? 0 : Math.max(0, session.expiresAt.getTime() - now.getTime()),
                reason: isConsumed
                    ? 'Session already consumed by a transaction'
                    : isExpired
                        ? 'Session expired'
                        : !session.verified
                            ? 'Session verification failed'
                            : undefined,
            })
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: CANCEL — Explicitly invalidate a session
        // Used when cashier removes all restricted items from cart,
        // or abandons the transaction.
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'CANCEL') {
            const { ageVerificationSessionId } = body
            if (!ageVerificationSessionId) {
                return NextResponse.json({ error: 'ageVerificationSessionId required' }, { status: 400 })
            }

            const session = await prisma.ageVerificationSession.findFirst({
                where: {
                    id: ageVerificationSessionId,
                    franchiseId: user.franchiseId,
                    consumed: false, // Can't cancel an already-consumed session
                }
            })

            if (!session) {
                return NextResponse.json({
                    cancelled: false,
                    reason: 'Session not found, already consumed, or belongs to another franchise',
                }, { status: 404 })
            }

            // Force-expire by setting expiresAt to now
            await prisma.ageVerificationSession.update({
                where: { id: session.id },
                data: { expiresAt: new Date() }
            })

            await logActivity({
                userId: user.id, userEmail: user.email, userRole: user.role,
                franchiseId: user.franchiseId,
                action: 'AGE_VERIFY_SESSION_CANCELLED',
                entityType: 'AgeVerificationSession', entityId: session.id,
                details: {
                    method: session.method,
                    minimumAge: session.minimumAge,
                    reason: 'Cashier cancelled age verification session',
                }
            })

            return NextResponse.json({
                cancelled: true,
                ageVerificationSessionId: session.id,
            })
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ACTION: get-settings — Configuration for frontend UI
        // (Preserved for backwards compatibility)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if (action === 'get-settings') {
            return NextResponse.json({
                defaultMinimumAge: 21,
                sessionTtlMinutes: AGE_SESSION_TTL_MS / 60000,
                restrictedCategories: ['Tobacco', 'Cigarettes', 'Cigars', 'Vape', 'Beer', 'Wine', 'Liquor', 'Alcohol'],
                allowVisualCheck: true,
                visualCheckMinAge: 30,
                allowManagerOverride: true,
                logAllVerifications: true,
            })
        }

        return NextResponse.json({ error: `Invalid action: '${action}'. Use CHECK, CREATE, VALIDATE, CANCEL, or get-settings.` }, { status: 400 })
    } catch (error: any) {
        console.error('[AGE_VERIFY_POST]', error)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
