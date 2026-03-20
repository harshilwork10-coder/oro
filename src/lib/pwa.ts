/**
 * PWA Registration — Register service worker + handle offline sync
 *
 * Import and call registerPWA() in your root layout to activate.
 * Zero-cost when online — only activates caching behavior.
 */

export function registerPWA(): void {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('/sw.js')
            console.log('[PWA] Service worker registered:', reg.scope)

            // Listen for offline sync results
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.type === 'OFFLINE_SYNC_COMPLETE') {
                    console.log(`[PWA] Synced ${event.data.synced} queued transactions, ${event.data.failed} failed`)
                }
            })

            // When coming back online, trigger sync
            window.addEventListener('online', () => {
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage('SYNC_OFFLINE_QUEUE')
                }
            })
        } catch (err) {
            console.warn('[PWA] Service worker registration failed:', err)
        }
    })
}

/** Check if app is currently offline */
export function isOffline(): boolean {
    return typeof navigator !== 'undefined' && !navigator.onLine
}

/** Get count of queued offline transactions */
export function getOfflineQueueCount(): number {
    try {
        const queue = JSON.parse(localStorage.getItem('oro9-offline-queue') || '[]')
        return queue.length
    } catch { return 0 }
}

export default registerPWA
