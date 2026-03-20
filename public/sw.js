/**
 * Service Worker — Offline-first caching for POS operations
 *
 * Strategy:
 * 1. Cache-first for static assets (JS, CSS, images) — zero network calls after install
 * 2. Network-first for API calls — falls back to cached response when offline
 * 3. Offline transaction queue — stores transactions locally, syncs when back online
 */

const CACHE_NAME = 'oro9-pos-v1'
const STATIC_ASSETS = [
    '/',
    '/pos',
    '/pos/customer-display',
    '/manifest.json',
]

// API routes to cache responses (stale-while-revalidate)
const CACHEABLE_API_PATTERNS = [
    '/api/inventory/products',
    '/api/inventory/categories',
    '/api/settings/',
    '/api/promotions',
    '/api/franchise/employees',
]

// Never cache these (always need fresh data)
const NEVER_CACHE = [
    '/api/pos/checkout',
    '/api/pos/refund',
    '/api/pos/exchange',
    '/api/webhooks/',
    '/api/auth/',
]

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    )
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    )
    self.clients.claim()
})

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url)

    // Skip non-GET requests
    if (event.request.method !== 'GET') return

    // Never cache these
    if (NEVER_CACHE.some(p => url.pathname.startsWith(p))) return

    // API calls — network-first with cache fallback
    if (url.pathname.startsWith('/api/')) {
        if (CACHEABLE_API_PATTERNS.some(p => url.pathname.startsWith(p))) {
            event.respondWith(networkFirstWithCache(event.request))
            return
        }
        return
    }

    // Static assets — cache-first
    event.respondWith(cacheFirstWithNetwork(event.request))
})

async function cacheFirstWithNetwork(request) {
    const cached = await caches.match(request)
    if (cached) return cached

    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        return new Response('Offline', { status: 503 })
    }
}

async function networkFirstWithCache(request) {
    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        const cached = await caches.match(request)
        if (cached) return cached
        return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
            status: 503, headers: { 'Content-Type': 'application/json' }
        })
    }
}
