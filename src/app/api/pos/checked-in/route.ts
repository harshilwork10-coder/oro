import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/mobileAuth'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, cacheDelete, CACHE_KEYS } from '@/lib/cache'
import crypto from 'crypto'

/**
 * GET /api/pos/checked-in
 *
 * Returns today's checked-in customers for the CURRENT LOCATION only.
 * Used by Android POS to populate the cashier queue.
 *
 * OPTIMIZATIONS (P1):
 * - ETag/304:        Skip response body if queue hasn't changed (saves bandwidth)
 * - Redis cache:     10s TTL per location — multiple devices share one DB query
 * - Adaptive poll:   X-Suggested-Poll-Ms header tells Android how fast to poll
 * - Cache invalidation: /api/kiosk/check-in deletes queue cache on new check-in
 *
 * Location isolation: Filters by user.locationId (set during station pairing),
 * NOT by franchiseId. A cashier at Location A will never see Location B's queue.
 */
export async function GET(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        // ═══ LOCATION ISOLATION: Filter by user's assigned location ═══
        // Previously used all franchise locationIds — that showed cross-location check-ins.
        // Now strictly scoped to the cashier's own location.
        const locationId = user.locationId
        if (!locationId) {
            // User has no location assigned (e.g., roaming admin) — empty queue
            return NextResponse.json([])
        }

        // ── ETag check (before any DB or Redis call) ──
        const clientETag = req.headers.get('if-none-match')

        // ── Redis cache: 10s TTL per location ──
        // Multiple devices at the same location share one cached result.
        // At 50K locations with 10 devices each: reduces DB queries by 90%.
        const cacheKey = CACHE_KEYS.QUEUE(locationId)
        const cached = await cacheGet<{ customers: QueueCustomer[]; etag: string }>(cacheKey)

        if (cached) {
            // Check ETag — if unchanged, send 304 (no body)
            if (clientETag === cached.etag) {
                return new NextResponse(null, {
                    status: 304,
                    headers: {
                        'ETag': cached.etag,
                        'X-Queue-Count': String(cached.customers.length),
                        'X-Suggested-Poll-Ms': cached.customers.length > 0 ? '15000' : '60000',
                    }
                })
            }

            // ETag changed or no ETag sent — return cached data
            return NextResponse.json(cached.customers, {
                headers: {
                    'ETag': cached.etag,
                    'X-Queue-Count': String(cached.customers.length),
                    'X-Suggested-Poll-Ms': cached.customers.length > 0 ? '15000' : '60000',
                    'X-Cache': 'HIT',
                }
            })
        }

        // ── Cache miss: query DB ──
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        // Query the CheckIn table for today's active check-ins at THIS location
        // WAITING = in queue, IN_SERVICE = stylist has taken customer
        const checkIns = await prisma.checkIn.findMany({
            where: {
                locationId: locationId,
                checkedInAt: { gte: today, lt: tomorrow },
                status: { in: ['WAITING', 'IN_SERVICE'] }
            },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true
                    }
                }
            },
            orderBy: { checkedInAt: 'asc' },
            take: 50
        })

        // Map to response shape expected by POS queue
        const customers: QueueCustomer[] = checkIns.map(ci => ({
            id: ci.id,  // CheckIn record ID (for status updates)
            clientId: ci.client.id,
            firstName: ci.client.firstName,
            lastName: ci.client.lastName,
            phone: ci.client.phone,
            email: ci.client.email,
            status: ci.status,
            source: ci.source,
            appointmentId: ci.appointmentId,
            checkedInAt: ci.checkedInAt,
            updatedAt: ci.updatedAt
        }))

        // Generate ETag from queue content (MD5 of IDs + timestamps)
        const etag = `"q-${crypto.createHash('md5')
            .update(JSON.stringify(customers.map(c => c.id + String(c.updatedAt))))
            .digest('hex').slice(0, 12)}"`

        // Cache for 10 seconds — all devices at this location share this result
        cacheSet(cacheKey, { customers, etag }, 10).catch(() => {})

        // Adaptive polling: poll faster when queue has items, slower when empty
        const suggestedPollMs = customers.length > 0 ? '15000' : '60000'

        return NextResponse.json(customers, {
            headers: {
                'ETag': etag,
                'X-Queue-Count': String(customers.length),
                'X-Suggested-Poll-Ms': suggestedPollMs,
                'X-Cache': 'MISS',
            }
        })
    } catch (error) {
        console.error('Failed to fetch checked-in customers:', error)
        return NextResponse.json([])
    }
}

/**
 * PATCH /api/pos/checked-in
 *
 * Transitions a CheckIn record to a new status.
 * Used by the Salon POS queue panel to manage customer lifecycle.
 *
 * Allowed transitions:
 *   WAITING    → IN_SERVICE | CANCELLED | NO_SHOW
 *   IN_SERVICE → SERVED | CANCELLED
 *
 * Disallowed (terminal states): SERVED, CANCELLED, NO_SHOW cannot transition.
 */
export async function PATCH(req: NextRequest) {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { checkInId, status } = body

        if (!checkInId || !status) {
            return NextResponse.json({ error: 'checkInId and status are required' }, { status: 400 })
        }

        // Validate target status is one of our known states
        const VALID_STATUSES = ['WAITING', 'IN_SERVICE', 'SERVED', 'CANCELLED', 'NO_SHOW']
        if (!VALID_STATUSES.includes(status)) {
            return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 })
        }

        // Fetch existing check-in — must exist at user's location
        const checkIn = await prisma.checkIn.findFirst({
            where: {
                id: checkInId,
                locationId: user.locationId || undefined
            }
        })

        if (!checkIn) {
            return NextResponse.json({ error: 'Check-in not found at this location' }, { status: 404 })
        }

        // Validate transition is legal
        const ALLOWED_TRANSITIONS: Record<string, string[]> = {
            'WAITING': ['IN_SERVICE', 'CANCELLED', 'NO_SHOW', 'SERVED'],
            'IN_SERVICE': ['SERVED', 'CANCELLED'],
        }

        const allowed = ALLOWED_TRANSITIONS[checkIn.status]
        if (!allowed || !allowed.includes(status)) {
            return NextResponse.json(
                { error: `Cannot transition from ${checkIn.status} to ${status}` },
                { status: 400 }
            )
        }

        // Perform update
        const updated = await prisma.checkIn.update({
            where: { id: checkInId },
            data: { status },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        email: true
                    }
                }
            }
        })

        // Invalidate queue cache so all devices see the change immediately
        if (user.locationId) {
            cacheDelete(CACHE_KEYS.QUEUE(user.locationId)).catch(() => {})
        }

        return NextResponse.json({
            id: updated.id,
            clientId: updated.client.id,
            firstName: updated.client.firstName,
            lastName: updated.client.lastName,
            phone: updated.client.phone,
            email: updated.client.email,
            status: updated.status,
            source: updated.source,
            appointmentId: updated.appointmentId,
            checkedInAt: updated.checkedInAt,
            updatedAt: updated.updatedAt
        })
    } catch (error) {
        console.error('Failed to update check-in status:', error)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }
}

// Response type for queue entries
interface QueueCustomer {
    id: string
    clientId: string
    firstName: string | null
    lastName: string | null
    phone: string | null
    email: string | null
    status: string
    source: string
    appointmentId: string | null
    checkedInAt: Date
    updatedAt: Date
}
