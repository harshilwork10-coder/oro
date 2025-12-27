// Offline Sync Service
// Handles syncing data between server and local IndexedDB

import { offlineDB, PendingTransaction } from './offline-db';

interface SyncResult {
    success: boolean;
    synced: number;
    failed: number;
    cardsPending: number;
    priceConflicts: { productId: string; soldPrice: number; currentPrice: number }[];
}

type SyncCallback = (result: SyncResult) => void;

class OfflineSyncService {
    private isSyncing = false;
    private syncInterval: NodeJS.Timeout | null = null;
    private onSyncComplete: SyncCallback | null = null;

    // Register callback for sync completion
    onSync(callback: SyncCallback) {
        this.onSyncComplete = callback;
    }

    // Start auto-sync (check every 30 seconds when online)
    startAutoSync() {
        if (this.syncInterval) return;

        // Check every 30 seconds
        this.syncInterval = setInterval(() => {
            if (navigator.onLine) {
                this.syncPendingTransactions();
            }
        }, 30000);

        // Sync immediately when coming back online
        window.addEventListener('online', this.handleOnline.bind(this));

        // Listen for visibility changes (user returns to tab)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                this.syncAll();
            }
        });
    }

    private async handleOnline() {
        console.log('[OfflineSync] Back online - syncing immediately...');
        const result = await this.syncAll();

        // Notify about pending card payments
        const cardPending = await offlineDB.getCardPendingCount();
        if (cardPending > 0) {
            console.log(`[OfflineSync] ${cardPending} card payments need processing`);
        }
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        window.removeEventListener('online', this.handleOnline.bind(this));
    }

    // Sync all data
    async syncAll(): Promise<SyncResult> {
        if (this.isSyncing) return { success: false, synced: 0, failed: 0, cardsPending: 0, priceConflicts: [] };
        if (!navigator.onLine) return { success: false, synced: 0, failed: 0, cardsPending: 0, priceConflicts: [] };

        this.isSyncing = true;
        console.log('[OfflineSync] Starting full sync...');

        try {
            // 1. Download fresh product catalog
            await this.downloadProducts();

            // 2. Sync pending cash transactions
            const txResult = await this.syncPendingTransactions();

            // 3. Check card pending transactions
            const cardsPending = await offlineDB.getCardPendingCount();

            // 4. Clean up old synced transactions
            await offlineDB.clearSyncedTransactions();

            // 5. Update last sync time
            await offlineDB.setLastSyncTime();
            await offlineDB.logSync('full-sync', {
                products: await offlineDB.getProductCount(),
                transactions: txResult,
                cardsPending
            });

            console.log('[OfflineSync] Full sync complete');
            const result: SyncResult = {
                success: true,
                ...txResult,
                cardsPending,
                priceConflicts: txResult.priceConflicts || []
            };

            if (this.onSyncComplete) {
                this.onSyncComplete(result);
            }

            return result;
        } catch (error) {
            console.error('[OfflineSync] Sync failed:', error);
            await offlineDB.logSync('sync-error', { error: String(error) });
            return { success: false, synced: 0, failed: 0, cardsPending: 0, priceConflicts: [] };
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
    async syncPendingTransactions(): Promise<{ synced: number; failed: number; priceConflicts: { productId: string; soldPrice: number; currentPrice: number }[] }> {
        if (!navigator.onLine) return { synced: 0, failed: 0, priceConflicts: [] };

        const pending = await offlineDB.getPendingTransactions();
        if (pending.length === 0) return { synced: 0, failed: 0, priceConflicts: [] };

        console.log(`[OfflineSync] Syncing ${pending.length} pending transactions...`);

        let synced = 0;
        let failed = 0;
        let allPriceConflicts: { productId: string; soldPrice: number; currentPrice: number }[] = [];

        for (const tx of pending) {
            try {
                // Check for price conflicts before syncing
                const conflicts = await offlineDB.checkPriceConflicts(
                    tx.items.map(i => ({ productId: i.productId, price: i.price }))
                );

                if (conflicts.length > 0) {
                    allPriceConflicts = [...allPriceConflicts, ...conflicts];
                    // Still sync but log the conflict
                    await offlineDB.logSync('price-conflict', { transactionId: tx.id, conflicts });
                }

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
                        stationId: tx.stationId,
                        priceConflicts: conflicts.length > 0 ? conflicts : undefined
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
        if (allPriceConflicts.length > 0) {
            console.warn(`[OfflineSync] ${allPriceConflicts.length} price conflicts detected`);
        }

        return { synced, failed, priceConflicts: allPriceConflicts };
    }

    // Process card payments that were queued while offline
    async processCardPayments(): Promise<{ processed: number; failed: number }> {
        if (!navigator.onLine) return { processed: 0, failed: 0 };

        const cardPending = await offlineDB.getCardPendingTransactions();
        if (cardPending.length === 0) return { processed: 0, failed: 0 };

        console.log(`[OfflineSync] Processing ${cardPending.length} card payments...`);

        let processed = 0;
        let failed = 0;

        for (const tx of cardPending) {
            // Card payments require terminal - notify user to process manually
            // For now, mark as needing manual processing
            console.log(`[OfflineSync] Card payment ${tx.id} requires manual processing`);
            failed++;
        }

        return { processed, failed };
    }

    // Get sync status
    async getStatus(): Promise<{
        isOnline: boolean;
        lastSync: Date | null;
        productCount: number;
        pendingTransactions: number;
        cardPendingTransactions: number;
    }> {
        return {
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
            lastSync: await offlineDB.getLastSyncTime(),
            productCount: await offlineDB.getProductCount(),
            pendingTransactions: await offlineDB.getPendingCount(),
            cardPendingTransactions: await offlineDB.getCardPendingCount()
        };
    }
}

export const offlineSync = new OfflineSyncService();
