/**
 * Customer Display System — Shared Types
 *
 * These types define the contracts between the CustomerDisplayManager,
 * drivers, detector, and consumer hooks.
 */

// DisplayMode mirrors the Prisma enum but is defined locally
// to avoid requiring a migration before the manager can be used.
export type DisplayMode =
    | 'SECOND_SCREEN'
    | 'POLE_DISPLAY'
    | 'REMOTE_BROWSER'
    | 'ANDROID_DISPLAY'
    | 'VENDOR_INTEGRATED'
    | 'NONE'

// ─── Cart Payload (what POS sends to the display) ─────────────────────────
export interface CartItem {
    id?: string
    name: string
    quantity: number
    price: number
    total: number
}

export interface CartPayload {
    items: CartItem[]
    subtotal: number
    tax: number
    total: number
    subtotalCash?: number
    subtotalCard?: number
    taxCash?: number
    taxCard?: number
    cashTotal?: number
    cardTotal?: number
    showDualPricing?: boolean
    customerName?: string
    status: DisplayStatus
    stationId?: string
}

export type DisplayStatus =
    | 'IDLE'
    | 'ACTIVE'
    | 'PAYMENT'
    | 'PROCESSING'
    | 'COMPLETE'
    | 'COMPLETED'
    | 'AWAITING_TIP'
    | 'TIP_SELECTED'
    | 'CANCELLED'

// ─── Driver Config (passed to driver.connect()) ───────────────────────────
export interface DriverConfig {
    stationId: string
    hardwareIdentifier?: string
    protocolSettings?: Record<string, unknown>
}

// ─── Display Candidate (from detection) ───────────────────────────────────
export interface DisplayCandidate {
    id: string
    mode: string      // DisplayMode value
    driver: string    // driver id
    label: string     // human-readable, e.g. "Secondary Monitor (1920×1080)"
    hardwareId: string
    confidence: number // 0.0 - 1.0
    isLocal: boolean   // true = local transport (no server round-trip for rendering)
    source: 'browser' | 'agent' | 'saved'
    metadata?: Record<string, unknown>
}

// ─── Display Profile (saved to DB) ────────────────────────────────────────
export interface DisplayProfileData {
    displayMode: string
    hardwareIdentifier?: string
    driver?: string
    protocolSettings?: Record<string, unknown>
    fallbackMode?: string
    isAutoDetected?: boolean
}

// ─── Manager Status ───────────────────────────────────────────────────────
export interface DisplayManagerStatus {
    connected: boolean
    driverName: string | null
    mode: string | null
    hardwareId: string | null
    lastError: string | null
}
