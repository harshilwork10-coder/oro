// React Hook for Offline Mode
// Provides network status, sync state, and offline operations

'use client';

import { useState, useEffect, useCallback } from 'react';
import { offlineDB, PendingTransaction } from './offline-db';
import { offlineSync } from './offline-sync';

interface OfflineStatus {
    isOnline: boolean;
    isReady: boolean;
    isSyncing: boolean;
    lastSync: Date | null;
    productCount: number;
    pendingCount: number;
}

export function useOfflineMode() {
    const [status, setStatus] = useState<OfflineStatus>({
        isOnline: true,
        isReady: false,
        isSyncing: false,
        lastSync: null,
        productCount: 0,
        pendingCount: 0
    });

    // Initialize offline DB and sync
    useEffect(() => {
        let mounted = true;

        async function init() {
            try {
                await offlineDB.init();

                // Get initial status
                const syncStatus = await offlineSync.getStatus();

                if (mounted) {
                    setStatus(prev => ({
                        ...prev,
                        isOnline: syncStatus.isOnline,
                        isReady: true,
                        lastSync: syncStatus.lastSync,
                        productCount: syncStatus.productCount,
                        pendingCount: syncStatus.pendingTransactions
                    }));
                }

                // Start auto-sync
                offlineSync.startAutoSync();

                // Do initial sync if online
                if (navigator.onLine) {
                    await offlineSync.syncAll();
                    const newStatus = await offlineSync.getStatus();
                    if (mounted) {
                        setStatus(prev => ({
                            ...prev,
                            lastSync: newStatus.lastSync,
                            productCount: newStatus.productCount,
                            pendingCount: newStatus.pendingTransactions
                        }));
                    }
                }
            } catch (error) {
                console.error('[useOfflineMode] Init error:', error);
            }
        }

        init();

        return () => {
            mounted = false;
            offlineSync.stopAutoSync();
        };
    }, []);

    // Listen for online/offline events
    useEffect(() => {
        function handleOnline() {
            setStatus(prev => ({ ...prev, isOnline: true }));
        }

        function handleOffline() {
            setStatus(prev => ({ ...prev, isOnline: false }));
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Manual sync trigger
    const sync = useCallback(async () => {
        if (!status.isOnline) return false;

        setStatus(prev => ({ ...prev, isSyncing: true }));

        try {
            await offlineSync.syncAll();
            const newStatus = await offlineSync.getStatus();
            setStatus(prev => ({
                ...prev,
                isSyncing: false,
                lastSync: newStatus.lastSync,
                productCount: newStatus.productCount,
                pendingCount: newStatus.pendingTransactions
            }));
            return true;
        } catch (error) {
            setStatus(prev => ({ ...prev, isSyncing: false }));
            return false;
        }
    }, [status.isOnline]);

    // Search products (works offline)
    const searchProducts = useCallback(async (query: string) => {
        // If offline, use local DB
        if (!status.isOnline) {
            return offlineDB.searchProducts(query);
        }

        // If online, try server first, fallback to local
        try {
            const res = await fetch(`/api/inventory/items?search=${encodeURIComponent(query)}`);
            if (res.ok) {
                const data = await res.json();
                return data.items || [];
            }
        } catch {
            // Server failed, use local
        }

        return offlineDB.searchProducts(query);
    }, [status.isOnline]);

    // Get product by barcode (works offline)
    const getProductByBarcode = useCallback(async (barcode: string) => {
        // If offline, use local DB
        if (!status.isOnline) {
            return offlineDB.getProductByBarcode(barcode);
        }

        // If online, try server first
        try {
            const res = await fetch(`/api/inventory/items?barcode=${encodeURIComponent(barcode)}`);
            if (res.ok) {
                const data = await res.json();
                const items = data.items || [];
                if (items.length > 0) return items[0];
            }
        } catch {
            // Server failed
        }

        return offlineDB.getProductByBarcode(barcode);
    }, [status.isOnline]);

    // Save transaction (works offline)
    const saveTransaction = useCallback(async (transaction: Omit<PendingTransaction, 'id' | 'createdAt' | 'synced' | 'status'>) => {
        const pendingTx: PendingTransaction = {
            ...transaction,
            id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            synced: false,
            status: 'pending'
        };

        // If online, try to submit directly
        if (status.isOnline) {
            try {
                const res = await fetch('/api/pos/transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transaction)
                });

                if (res.ok) {
                    const serverTx = await res.json();
                    return { success: true, transaction: serverTx, offline: false };
                }
            } catch {
                // Server failed, save locally
            }
        }

        // Save to local DB for later sync
        await offlineDB.savePendingTransaction(pendingTx);
        setStatus(prev => ({ ...prev, pendingCount: prev.pendingCount + 1 }));

        return { success: true, transaction: pendingTx, offline: true };
    }, [status.isOnline]);

    return {
        ...status,
        sync,
        searchProducts,
        getProductByBarcode,
        saveTransaction
    };
}
