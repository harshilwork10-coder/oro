import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Smart refresh hook – psychology-aware API polling
 *
 * 1. Fetches immediately on mount
 * 2. Auto-refreshes at `intervalMs` ONLY when tab is visible
 * 3. Pauses completely when tab is hidden (saves 100% of background calls)
 * 4. Re-fetches immediately when user returns to tab (feels instant)
 * 5. Exposes `refresh()` for manual pull-to-refresh
 *
 * Default: 5 minutes. Nobody stares at dashboards — they glance.
 */
export function useSmartRefresh<T>(
    fetcher: () => Promise<T>,
    intervalMs = 5 * 60 * 1000 // 5 minutes default
) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const result = await fetcherRef.current()
            setData(result)
            setLastUpdated(new Date())
        } catch {
            // keep stale data, just stop loading
        }
        setLoading(false)
    }, [])

    // Start/stop interval based on tab visibility
    useEffect(() => {
        const startPolling = () => {
            if (timerRef.current) clearInterval(timerRef.current)
            timerRef.current = setInterval(refresh, intervalMs)
        }
        const stopPolling = () => {
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        }

        const onVisibility = () => {
            if (document.hidden) {
                stopPolling() // tab hidden → stop wasting calls
            } else {
                refresh()    // tab visible → refresh immediately (feels instant)
                startPolling()
            }
        }

        // Initial fetch + start polling
        refresh()
        startPolling()
        document.addEventListener('visibilitychange', onVisibility)

        return () => {
            stopPolling()
            document.removeEventListener('visibilitychange', onVisibility)
        }
    }, [refresh, intervalMs])

    return { data, loading, refresh, lastUpdated }
}
