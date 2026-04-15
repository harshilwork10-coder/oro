import { useState, useEffect, useCallback } from 'react'

const DB_NAME = 'OroPosOfflineStore'
const STORE_NAME = 'transaction_queue'
const DB_VERSION = 1

export interface QueuedTransaction {
    offlineId: string
    idempotencyKey: string // serves as idempotency lock
    status: 'queued' | 'syncing' | 'synced' | 'rejected' | 'retryable_error'
    createdAt: string
    lastTriedAt?: string
    lastError?: string
    payload: any // full POS transaction payload mapped for /api/pos/sync
    syncResult?: {
        transactionId?: string
        invoiceNumber?: string
        errorText?: string
    }
}

// Low-level IndexedDB Wrapper (No dependencies required)
const dbManager = {
    async open(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') return reject('SSR')
            const request = indexedDB.open(DB_NAME, DB_VERSION)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)
            request.onupgradeneeded = (e) => {
                const db = (e.target as IDBOpenDBRequest).result
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'offlineId' })
                }
            }
        })
    },
    async getAll(): Promise<QueuedTransaction[]> {
        const db = await this.open()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly')
            const store = tx.objectStore(STORE_NAME)
            const request = store.getAll()
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result || [])
        })
    },
    async put(item: QueuedTransaction): Promise<void> {
        const db = await this.open()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite')
            const store = tx.objectStore(STORE_NAME)
            const request = store.put(item)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve()
        })
    },
    async get(offlineId: string): Promise<QueuedTransaction | undefined> {
        const db = await this.open()
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly')
            const store = tx.objectStore(STORE_NAME)
            const request = store.get(offlineId)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)
        })
    }
}

export function useOfflineQueue() {
    const [queue, setQueue] = useState<QueuedTransaction[]>([])
    const [isSyncing, setIsSyncing] = useState(false)

    // Load queue actively from IndexedDB
    const loadQueue = useCallback(async () => {
        try {
            const items = await dbManager.getAll()
            // Sort oldest first
            setQueue(items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
        } catch (e) {
            console.error('[OFFLINE_QUEUE] Failed to load from DB:', e)
        }
    }, [])

    useEffect(() => {
        loadQueue()
    }, [loadQueue])

    // Generates an offline ID and enqueues payload safely
    const enqueueTransaction = useCallback(async (payloadData: any) => {
        const offlineId = crypto.randomUUID()
        const idempotencyKey = offlineId
        const newTx: QueuedTransaction = {
            offlineId,
            idempotencyKey,
            status: 'queued',
            createdAt: new Date().toISOString(),
            payload: { ...payloadData, offlineId, source: 'OFFLINE_WEB_POS' }
        }
        await dbManager.put(newTx)
        await loadQueue()
        return offlineId
    }, [loadQueue])

    // Specific status overrides (manual or automated)
    const markStatus = useCallback(async (offlineId: string, updates: Partial<QueuedTransaction>) => {
        try {
            const existing = await dbManager.get(offlineId)
            if (existing) {
                await dbManager.put({ ...existing, ...updates })
                await loadQueue()
            }
        } catch (e) {
            console.error('[OFFLINE_QUEUE] Failed to update status:', e)
        }
    }, [loadQueue])

    const getPendingCount = useCallback(() => {
        return queue.filter(q => ['queued', 'retryable_error'].includes(q.status)).length
    }, [queue])

    // Primary Sync Dispatch
    const syncPending = useCallback(async () => {
        if (isSyncing) return
        
        const eligible = queue.filter(q => ['queued', 'retryable_error'].includes(q.status))
        if (eligible.length === 0) return

        setIsSyncing(true)

        // Mark items as syncing locally so user knows
        for (const item of eligible) {
            await markStatus(item.offlineId, { status: 'syncing', lastTriedAt: new Date().toISOString() })
        }

        try {
            const res = await fetch('/api/pos/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: eligible.map(q => q.payload) })
            })

            // If the whole endpoint is 500ing, fail entire batch
            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`)
            }

            const data = await res.json()
            if (data.results) {
                // Determine per-item result states from the payload contract
                for (const result of data.results) {
                    let newStatus: QueuedTransaction['status'] = 'retryable_error'
                    if (result.status === 'synced' || result.status === 'skipped_duplicate') {
                        newStatus = 'synced'
                    } else if (result.status === 'rejected') {
                        newStatus = 'rejected'
                    }

                    await markStatus(result.offlineId, {
                        status: newStatus,
                        lastError: result.errorText,
                        syncResult: {
                            transactionId: result.transactionId,
                            invoiceNumber: result.invoiceNumber,
                            errorText: result.errorText
                        }
                    })
                }
            }
        } catch (e: any) {
            console.error('[OFFLINE_QUEUE] Sync failure:', e)
            for (const item of eligible) {
                await markStatus(item.offlineId, {
                    status: 'retryable_error',
                    lastError: e.message || 'Network failure'
                })
            }
        } finally {
            setIsSyncing(false)
            await loadQueue()
        }
    }, [queue, isSyncing, markStatus, loadQueue])

    return {
        queue,
        isSyncing,
        getPendingCount,
        enqueueTransaction,
        markStatus,
        syncPending,
        refreshQueue: loadQueue
    }
}
