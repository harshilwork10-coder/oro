// Offline Sync Service
// Handles syncing data between server and local IndexedDB

import { offlineDB, PendingTransaction } from './offline-db';

class OfflineSyncService {
    private isSyncing = false;
    private syncInterval: NodeJS.Timeout | null = null;

    // Start auto-sync (check every 30 seconds when online)
    startAutoSync() {
        if (this.syncInterval) return;

        this.syncInterval = setInterval(() => {
            if (navigator.onLine) {
                this.syncPendingTransactions();
            }
        }, 30000);

        // Also sync immediately when coming back online
        window.addEventListener('online', () => {
            console.log('[OfflineSync] Back online - syncing...');
            this.syncAll();
        });
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // Sync all data
    async syncAll(): Promise<{ success: boolean; synced: number; failed: number }> {
        if (this.isSyncing) return { success: false, synced: 0, failed: 0 };
        if (!navigator.onLine) return { success: false, synced: 0, failed: 0 };

        this.isSyncing = true;
        console.log('[OfflineSync] Starting full sync...');

        try {
            // 1. Download fresh product catalog
            await this.downloadProducts();

            // 2. Sync pending transactions
            const txResult = await this.syncPendingTransactions();

            // 3. Update last sync time
            await offlineDB.setLastSyncTime();
            await offlineDB.logSync('full-sync', {
                products: await offlineDB.getProductCount(),
                transactions: txResult
            });

            console.log('[OfflineSync] Full sync complete');
            return { success: true, ...txResult };
        } catch (error) {
            console.error('[OfflineSync] Sync failed:', error);
            await offlineDB.logSync('sync-error', { error: String(error) });
            return { success: false, synced: 0, failed: 0 };
        } finally {
            this.isSyncing = false;
        }
    }

    // Download products from server to local DB
    async downloadProducts(): Promise<number> {
        if (!navigator.onLine) return 0;

        try {
            // Fetch all products from server
            const res = await fetch('/api/inventory/items?limit=10000');
            if (!res.ok) throw new Error('Failed to fetch products');

            const data = await res.json();
            const products = (data.items || []).map((item: any) => ({
                id: item.id,
                barcode: item.barcode,
                name: item.name,
                price: item.price,
                cardPrice: item.cardPrice,
                category: item.category?.name || 'Uncategorized',
                taxable: item.taxable ?? true,
                inStock: item.inStock ?? true,
                imageUrl: item.imageUrl
            }));

            await offlineDB.saveProducts(products);
            console.log(`[OfflineSync] Downloaded ${products.length} products`);
            return products.length;
        } catch (error) {
            console.error('[OfflineSync] Failed to download products:', error);
            return 0;
        }
    }

    // Upload pending transactions to server
    async syncPendingTransactions(): Promise<{ synced: number; failed: number }> {
        if (!navigator.onLine) return { synced: 0, failed: 0 };

        const pending = await offlineDB.getPendingTransactions();
        if (pending.length === 0) return { synced: 0, failed: 0 };

        console.log(`[OfflineSync] Syncing ${pending.length} pending transactions...`);

        let synced = 0;
        let failed = 0;

        for (const tx of pending) {
            try {
                const res = await fetch('/api/pos/transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: tx.items,
                        subtotal: tx.subtotal,
                        tax: tx.tax,
                        total: tx.total,
                        paymentMethod: tx.paymentMethod,
                        offlineId: tx.id,
                        offlineCreatedAt: tx.createdAt,
                        stationId: tx.stationId
                    })
                });

                if (res.ok) {
                    await offlineDB.markTransactionSynced(tx.id);
                    synced++;
                } else {
                    failed++;
                    console.error(`[OfflineSync] Failed to sync tx ${tx.id}:`, await res.text());
                }
            } catch (error) {
                failed++;
                console.error(`[OfflineSync] Error syncing tx ${tx.id}:`, error);
            }
        }

        console.log(`[OfflineSync] Synced ${synced}/${pending.length} transactions`);
        return { synced, failed };
    }

    // Get sync status
    async getStatus(): Promise<{
        isOnline: boolean;
        lastSync: Date | null;
        productCount: number;
        pendingTransactions: number;
    }> {
        return {
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
            lastSync: await offlineDB.getLastSyncTime(),
            productCount: await offlineDB.getProductCount(),
            pendingTransactions: await offlineDB.getPendingCount()
        };
    }
}

export const offlineSync = new OfflineSyncService();
