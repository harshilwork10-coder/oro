/**
 * CustomerDisplayManager — Central orchestrator
 *
 * LOCAL-FIRST TRANSPORT RULES:
 * - Attached displays (vendor, second-screen, pole, Android) update via
 *   local transport. NO server API call per cashier action.
 * - Remote displays (tablet/phone on different machine) use HTTP API.
 * - Backend API is ONLY for: profile persistence, setup, recovery, logging.
 * - POS transaction save and display rendering are separate concerns.
 *
 * Usage:
 *   const mgr = new CustomerDisplayManager()
 *   await mgr.autoConnect(stationId)   // tries local first, remote last
 *   mgr.sendCart(cart)                  // local driver → instant, no fetch
 *   mgr.showThankYou('John', 42.50)
 */

import type { DisplayDriver } from './drivers/DisplayDriver'
import {
    SecondScreenDriver,
    RemoteBrowserDriver,
    PoleDisplayDriver,
    AndroidDisplayDriver,
    VendorIntegratedDriver,
} from './drivers'
import { DisplayDetector } from './DisplayDetector'
import type {
    CartPayload,
    DisplayCandidate,
    DisplayProfileData,
    DisplayManagerStatus,
    DriverConfig,
} from './types'

// ─── Driver Registry ──────────────────────────────────────────────────────
// Ordered by local-first priority: vendor > android > second-screen > pole > remote
const DRIVER_REGISTRY: Record<string, () => DisplayDriver> = {
    'vendor-integrated': () => new VendorIntegratedDriver(),
    'android-display': () => new AndroidDisplayDriver(),
    'second-screen': () => new SecondScreenDriver(),
    'pole-display': () => new PoleDisplayDriver(),
    'remote-browser': () => new RemoteBrowserDriver(),
}

export class CustomerDisplayManager {
    private driver: DisplayDriver | null = null
    private stationId: string | null = null
    private lastError: string | null = null
    private detector = new DisplayDetector()

    // ─── Detection ────────────────────────────────────────────────────

    async detectAvailableDisplays(): Promise<DisplayCandidate[]> {
        const profile = this.stationId
            ? await this.loadSavedProfile(this.stationId)
            : null
        return this.detector.detect(profile)
    }

    // ─── Connection ───────────────────────────────────────────────────

    async connectDisplay(candidate: DisplayCandidate, config?: Partial<DriverConfig>): Promise<void> {
        this.disconnectDisplay()

        const factory = DRIVER_REGISTRY[candidate.driver]
        if (!factory) {
            throw new Error(`Unknown driver: ${candidate.driver}`)
        }

        this.driver = factory()
        const driverConfig: DriverConfig = {
            stationId: this.stationId || '',
            hardwareIdentifier: candidate.hardwareId,
            protocolSettings: config?.protocolSettings,
        }

        try {
            await this.driver.connect(driverConfig)
            this.lastError = null
        } catch (err) {
            this.lastError = err instanceof Error ? err.message : String(err)
            this.driver = null
            throw err
        }
    }

    disconnectDisplay(): void {
        if (this.driver) {
            try { this.driver.disconnect() } catch {}
            this.driver = null
        }
    }

    // ─── Content delivery (goes through LOCAL driver — no API call) ───

    sendCart(cart: CartPayload): void {
        this.driver?.sendCart(cart)
    }

    showIdleScreen(): void {
        this.driver?.showIdle()
    }

    showThankYou(customerName?: string, total?: number): void {
        this.driver?.showThankYou(customerName, total)
    }

    // ─── Diagnostics ──────────────────────────────────────────────────

    async runTestPattern(): Promise<boolean> {
        if (!this.driver) return false
        return this.driver.runTestPattern()
    }

    getStatus(): DisplayManagerStatus {
        return {
            connected: this.driver?.isConnected() ?? false,
            driverName: this.driver?.name ?? null,
            mode: this.driver?.mode ?? null,
            hardwareId: null,
            lastError: this.lastError,
        }
    }

    /** Whether the active driver uses local transport (no server round-trip). */
    get isLocalTransport(): boolean {
        return this.driver?.isLocal ?? false
    }

    // ─── Profile persistence (API only — not for rendering) ───────────

    async loadSavedProfile(stationId: string): Promise<DisplayProfileData | null> {
        try {
            const res = await fetch(`/api/pos/display-profile?stationId=${stationId}`)
            if (!res.ok) return null
            const data = await res.json()
            return data.profile ?? null
        } catch {
            return null
        }
    }

    async saveProfile(stationId: string, candidate: DisplayCandidate): Promise<void> {
        const profileData: DisplayProfileData = {
            displayMode: candidate.mode,
            hardwareIdentifier: candidate.hardwareId,
            driver: candidate.driver,
            fallbackMode: 'REMOTE_BROWSER',
            isAutoDetected: candidate.source !== 'saved',
        }

        try {
            await fetch('/api/pos/display-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stationId, ...profileData }),
            })
        } catch (err) {
            console.error('[CustomerDisplayManager] Failed to save profile:', err)
        }
    }

    // ─── Auto-reconnect (LOCAL FIRST, remote only as last resort) ─────

    /**
     * Auto-connect using saved profile, or fall back to best detected candidate.
     *
     * Priority:
     * 1. Saved profile if driver is local
     * 2. Detected local hardware (vendor > android > second-screen > pole)
     * 3. Saved profile if driver is remote
     * 4. Remote browser fallback (only if no local display exists)
     */
    async autoConnect(stationId: string): Promise<boolean> {
        this.stationId = stationId

        // 1. Try saved profile first — but only if it's LOCAL
        const saved = await this.loadSavedProfile(stationId)
        if (saved?.driver && saved.displayMode !== 'NONE') {
            const factory = DRIVER_REGISTRY[saved.driver]
            if (factory) {
                const testDriver = factory()
                if (testDriver.isLocal) {
                    try {
                        this.driver = testDriver
                        await this.driver.connect({
                            stationId,
                            hardwareIdentifier: saved.hardwareIdentifier,
                            protocolSettings: saved.protocolSettings as Record<string, unknown>,
                        })
                        this.lastError = null
                        return true
                    } catch (err) {
                        console.warn('[CustomerDisplayManager] Saved local profile failed:', err)
                        this.driver = null
                    }
                }
            }
        }

        // 2. Detect and try local candidates first (sorted: local first, then by confidence)
        const candidates = await this.detectAvailableDisplays()
        const localCandidates = candidates.filter(c => c.isLocal)

        for (const candidate of localCandidates) {
            try {
                await this.connectDisplay(candidate)
                await this.saveProfile(stationId, candidate)
                return true
            } catch {
                continue
            }
        }

        // 3. If saved profile is remote and no local was found, use it
        if (saved?.driver && !DRIVER_REGISTRY[saved.driver]?.()?.isLocal) {
            try {
                const remoteSaved = candidates.find(c => c.source === 'saved')
                if (remoteSaved) {
                    await this.connectDisplay(remoteSaved)
                    return true
                }
            } catch {}
        }

        // 4. Remote browser fallback (last resort — the display is NOT on this machine)
        const remoteFallback = candidates.find(c => c.driver === 'remote-browser')
        if (remoteFallback) {
            try {
                await this.connectDisplay(remoteFallback)
                return true
            } catch {}
        }

        this.lastError = 'No display available'
        return false
    }
}
