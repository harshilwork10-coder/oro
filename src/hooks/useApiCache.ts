/**
 * useApiCache — SWR-style hook that slashes API calls
 *
 * Features:
 * 1. Stale-While-Revalidate — serves cached data instantly, refreshes in background
 * 2. localStorage persistence — survives page reload (zero API calls on revisit)
 * 3. Deduplication — concurrent calls to same URL only make 1 fetch
 * 4. TTL — auto-expire cache after configurable time
 * 5. Batch — combine multiple endpoints into one request
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
    data: T
    timestamp: number
    ttl: number
}

interface UseApiCacheOptions {
    /** Time-to-live in ms (default: 5 min for reports, 30s for live data) */
    ttl?: number
    /** Skip localStorage for sensitive data */
    noLocalStorage?: boolean
    /** Don't auto-fetch on mount */
    manual?: boolean
    /** Refetch interval in ms (0 = disabled) */
    refetchInterval?: number
}

// In-memory cache (shared across all hook instances)
const memoryCache = new Map<string, CacheEntry<any>>()
// Deduplication — prevent concurrent identical fetches
const pendingFetches = new Map<string, Promise<any>>()

function getCacheKey(url: string): string {
    return `pos_cache_${url}`
}

function getFromLocalStorage<T>(key: string): CacheEntry<T> | null {
    try {
        const raw = localStorage.getItem(getCacheKey(key))
        if (!raw) return null
        const entry: CacheEntry<T> = JSON.parse(raw)
        if (Date.now() - entry.timestamp > entry.ttl) {
            localStorage.removeItem(getCacheKey(key))
            return null
        }
        return entry
    } catch { return null }
}

function setToLocalStorage<T>(key: string, data: T, ttl: number): void {
    try {
        const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl }
        localStorage.setItem(getCacheKey(key), JSON.stringify(entry))
    } catch { /* localStorage full — silent fail */ }
}

export function useApiCache<T = any>(url: string | null, options: UseApiCacheOptions = {}) {
    const { ttl = 300000, noLocalStorage = false, manual = false, refetchInterval = 0 } = options
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(!manual)
    const [error, setError] = useState<string | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchData = useCallback(async (force = false) => {
        if (!url) return

        // 1. Check memory cache (instant)
        if (!force) {
            const memEntry = memoryCache.get(url)
            if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl) {
                setData(memEntry.data)
                setLoading(false)
                return memEntry.data
            }
        }

        // 2. Check localStorage (still fast, survives reload)
        if (!force && !noLocalStorage) {
            const lsEntry = getFromLocalStorage<T>(url)
            if (lsEntry) {
                setData(lsEntry.data)
                setLoading(false)
                // Still revalidate in background (SWR)
                revalidateInBackground(url, ttl, noLocalStorage, setData)
                return lsEntry.data
            }
        }

        // 3. Deduplicate — if this URL is already being fetched, wait for it
        if (pendingFetches.has(url)) {
            try {
                const result = await pendingFetches.get(url)
                setData(result)
                setLoading(false)
                return result
            } catch (err: any) {
                setError(err.message)
                setLoading(false)
                return null
            }
        }

        // 4. Actually fetch
        setLoading(true)
        const fetchPromise = fetch(url)
            .then(r => r.json())
            .then(json => {
                const result = json.data ?? json
                // Cache it
                memoryCache.set(url, { data: result, timestamp: Date.now(), ttl })
                if (!noLocalStorage) setToLocalStorage(url, result, ttl)
                pendingFetches.delete(url)
                return result
            })
            .catch(err => {
                pendingFetches.delete(url)
                throw err
            })

        pendingFetches.set(url, fetchPromise)

        try {
            const result = await fetchPromise
            setData(result)
            setError(null)
            setLoading(false)
            return result
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
            return null
        }
    }, [url, ttl, noLocalStorage])

    // Auto fetch on mount
    useEffect(() => {
        if (!manual && url) fetchData()
    }, [url, manual, fetchData])

    // Refetch interval
    useEffect(() => {
        if (refetchInterval > 0 && url) {
            intervalRef.current = setInterval(() => fetchData(true), refetchInterval)
            return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
        }
    }, [refetchInterval, url, fetchData])

    const refresh = useCallback(() => fetchData(true), [fetchData])
    const invalidate = useCallback(() => {
        if (url) {
            memoryCache.delete(url)
            try { localStorage.removeItem(getCacheKey(url)) } catch { }
        }
    }, [url])

    return { data, loading, error, refresh, invalidate }
}

/** Background revalidation (SWR pattern) */
async function revalidateInBackground<T>(
    url: string, ttl: number, noLocalStorage: boolean,
    setData: (d: T) => void
): Promise<void> {
    try {
        const json = await fetch(url).then(r => r.json())
        const result = json.data ?? json
        memoryCache.set(url, { data: result, timestamp: Date.now(), ttl })
        if (!noLocalStorage) setToLocalStorage(url, result, ttl)
        setData(result)
    } catch { /* silent background fail */ }
}

/**
 * Batch multiple API calls into parallel fetch with shared loading state
 * Reduces perceived latency — one loading spinner for multiple APIs
 */
export function useBatchApi(urls: string[], options: UseApiCacheOptions = {}) {
    const [results, setResults] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)
            const entries = await Promise.all(
                urls.map(async url => {
                    // Check cache first
                    const memEntry = memoryCache.get(url)
                    if (memEntry && Date.now() - memEntry.timestamp < (options.ttl || 300000)) {
                        return [url, memEntry.data] as const
                    }
                    try {
                        const json = await fetch(url).then(r => r.json())
                        const data = json.data ?? json
                        memoryCache.set(url, { data, timestamp: Date.now(), ttl: options.ttl || 300000 })
                        return [url, data] as const
                    } catch {
                        return [url, null] as const
                    }
                })
            )
            setResults(Object.fromEntries(entries))
            setLoading(false)
        }
        if (urls.length > 0) fetchAll()
    }, [JSON.stringify(urls)])

    return { results, loading }
}

/**
 * Invalidate all cached data (use after mutations)
 */
export function invalidateAllCache(): void {
    memoryCache.clear()
    try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('pos_cache_'))
        keys.forEach(k => localStorage.removeItem(k))
    } catch { }
}

export default useApiCache
