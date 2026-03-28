/**
 * DisplayDetector — Confidence-based hardware detection
 *
 * LOCAL-FIRST PRIORITY:
 * 1. Vendor/integrated local driver   (confidence: 0.95)
 * 2. Second-screen browser display     (confidence: 0.85)
 * 3. Serial/pole display local agent   (confidence: 0.80)
 * 4. Android dual display bridge       (confidence: 0.90)
 * 5. Remote browser display            (confidence: 0.30)
 * 6. API fallback only                 (never — API is for persistence, not rendering)
 *
 * The detector sorts by confidence AND prefers isLocal=true candidates.
 * Attached hardware should NEVER use remote API for per-action rendering.
 */

import type { DisplayCandidate, DisplayProfileData } from './types'

// Which drivers are local (no server round-trip for rendering)?
const LOCAL_DRIVERS = new Set(['second-screen', 'pole-display', 'android-display', 'vendor-integrated'])

export class DisplayDetector {
    /**
     * Detect all available display candidates.
     * Returns candidates sorted by: isLocal first, then confidence descending.
     */
    async detect(savedProfile?: DisplayProfileData | null): Promise<DisplayCandidate[]> {
        const candidates: DisplayCandidate[] = []

        // 1. Saved profile — highest confidence for known-good configs
        if (savedProfile?.driver && savedProfile.displayMode !== 'NONE') {
            const isLocal = LOCAL_DRIVERS.has(savedProfile.driver)
            candidates.push({
                id: `saved-${savedProfile.driver}`,
                mode: savedProfile.displayMode,
                driver: savedProfile.driver,
                label: `Last used: ${savedProfile.driver}${savedProfile.hardwareIdentifier ? ` (${savedProfile.hardwareIdentifier})` : ''}`,
                hardwareId: savedProfile.hardwareIdentifier || 'saved',
                confidence: isLocal ? 0.95 : 0.40,  // Saved local gets highest, saved remote gets low
                isLocal,
                source: 'saved',
            })
        }

        if (typeof window !== 'undefined') {
            // 2. Vendor SDK detection — highest priority for attached hardware
            if ((window as any).VendorDisplaySDK) {
                candidates.push({
                    id: 'vendor-sdk',
                    mode: 'VENDOR_INTEGRATED',
                    driver: 'vendor-integrated',
                    label: 'Vendor Integrated Display',
                    hardwareId: 'vendor-sdk',
                    confidence: 0.95,
                    isLocal: true,
                    source: 'browser',
                })
            }

            // 3. Android bridge detection — direct hardware, very high priority
            if ((window as any).AndroidDisplay) {
                candidates.push({
                    id: 'android-native',
                    mode: 'ANDROID_DISPLAY',
                    driver: 'android-display',
                    label: 'Android Built-in Display',
                    hardwareId: 'android-native',
                    confidence: 0.90,
                    isLocal: true,
                    source: 'browser',
                })
            }

            // 4. Browser multi-screen detection — second monitor on same machine
            try {
                if ('getScreenDetails' in window) {
                    const screenDetails = await (window as any).getScreenDetails?.()
                    if (screenDetails?.screens?.length > 1) {
                        for (const screen of screenDetails.screens) {
                            if (!screen.isPrimary) {
                                candidates.push({
                                    id: `screen-${screen.label || screen.width}x${screen.height}`,
                                    mode: 'SECOND_SCREEN',
                                    driver: 'second-screen',
                                    label: `Secondary Monitor: ${screen.label || `${screen.width}×${screen.height}`}`,
                                    hardwareId: `screen-${screen.left}-${screen.top}-${screen.width}x${screen.height}`,
                                    confidence: 0.85,
                                    isLocal: true,
                                    source: 'browser',
                                    metadata: {
                                        width: screen.width,
                                        height: screen.height,
                                        left: screen.left,
                                        top: screen.top,
                                        label: screen.label,
                                    },
                                })
                            }
                        }
                    }
                }

                // Fallback: offer second-screen option even without getScreenDetails
                if (candidates.filter(c => c.mode === 'SECOND_SCREEN').length === 0) {
                    candidates.push({
                        id: 'screen-secondary-window',
                        mode: 'SECOND_SCREEN',
                        driver: 'second-screen',
                        label: 'Open second browser window',
                        hardwareId: 'secondary-window',
                        confidence: 0.60,
                        isLocal: true,
                        source: 'browser',
                    })
                }
            } catch (err) {
                console.warn('[DisplayDetector] Screen detection error:', err)
            }
        }

        // 5. Remote browser — LOWEST priority, only for off-machine displays
        candidates.push({
            id: 'remote-browser-fallback',
            mode: 'REMOTE_BROWSER',
            driver: 'remote-browser',
            label: 'Remote Display (tablet/phone — requires network)',
            hardwareId: 'remote-http',
            confidence: 0.30,
            isLocal: false,
            source: 'browser',
        })

        // Sort: local candidates first, then by confidence descending
        return candidates.sort((a, b) => {
            if (a.isLocal !== b.isLocal) return a.isLocal ? -1 : 1
            return b.confidence - a.confidence
        })
    }
}
