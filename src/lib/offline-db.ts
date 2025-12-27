// Offline POS Database - IndexedDB wrapper
// Provides local storage for products, transactions, and settings

const DB_NAME = 'OroPOS';
const DB_VERSION = 1;

interface Product {
    id: string;
    barcode?: string;
    name: string;
    price: number;
    cardPrice?: number;
    category?: string;
    taxable: boolean;
    inStock: boolean;
    imageUrl?: string;
}

interface PendingTransaction {
    id: string;
    items: { productId: string; name: string; quantity: number; price: number }[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    status: 'pending' | 'synced' | 'failed';
    createdAt: Date;
    synced: boolean;
    employeeId?: string;
    stationId?: string;
}

interface OfflineSettings {
    franchiseId: string;
    lastSync: Date;
    taxRate: number;
    pricingModel: string;
    cardSurcharge: number;
}

class OfflineDB {
    private db: IDBDatabase | null = null;
    private isReady = false;

    async init(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (typeof window === 'undefined') {
                resolve(false);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[OfflineDB] Failed to open database');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('[OfflineDB] Database ready');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Products store - indexed by barcode and category
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' });
                    productStore.createIndex('barcode', 'barcode', { unique: false });
                    productStore.createIndex('category', 'category', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                }

                // Pending transactions - sales made while offline
                if (!db.objectStoreNames.contains('pendingTransactions')) {
                    const txStore = db.createObjectStore('pendingTransactions', { keyPath: 'id' });
                    txStore.createIndex('status', 'status', { unique: false });
                    txStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Settings cache
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Sync log
                if (!db.objectStoreNames.contains('syncLog')) {
                    const logStore = db.createObjectStore('syncLog', { keyPath: 'id', autoIncrement: true });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                console.log('[OfflineDB] Database schema created');
            };
        });
    }

    // ========== PRODUCTS ==========

    async saveProducts(products: Product[]): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const tx = this.db.transaction('products', 'readwrite');
        const store = tx.objectStore('products');

        // Clear existing and add new
        await new Promise<void>((resolve, reject) => {
            const clearReq = store.clear();
            clearReq.onsuccess = () => resolve();
            clearReq.onerror = () => reject(clearReq.error);
        });

        for (const product of products) {
            store.put(product);
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => {
                console.log(`[OfflineDB] Saved ${products.length} products`);
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    }

    async getProductByBarcode(barcode: string): Promise<Product | null> {
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('products', 'readonly');
            const store = tx.objectStore('products');
            const index = store.index('barcode');
            const request = index.get(barcode);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async searchProducts(query: string): Promise<Product[]> {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('products', 'readonly');
            const store = tx.objectStore('products');
            const request = store.getAll();

            request.onsuccess = () => {
                const products = request.result as Product[];
                const q = query.toLowerCase();
                const filtered = products.filter(p =>
                    p.name.toLowerCase().includes(q) ||
                    p.barcode?.includes(q) ||
                    p.category?.toLowerCase().includes(q)
                );
                resolve(filtered.slice(0, 50)); // Limit results
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getProductCount(): Promise<number> {
        if (!this.db) return 0;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('products', 'readonly');
            const store = tx.objectStore('products');
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ========== PENDING TRANSACTIONS ==========

    async savePendingTransaction(transaction: PendingTransaction): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('pendingTransactions', 'readwrite');
            const store = tx.objectStore('pendingTransactions');
            const request = store.put(transaction);

            request.onsuccess = () => {
                console.log(`[OfflineDB] Saved pending transaction ${transaction.id}`);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getPendingTransactions(): Promise<PendingTransaction[]> {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('pendingTransactions', 'readonly');
            const store = tx.objectStore('pendingTransactions');
            const index = store.index('status');
            const request = index.getAll('pending');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async markTransactionSynced(id: string): Promise<void> {
        if (!this.db) return;

        const tx = this.db.transaction('pendingTransactions', 'readwrite');
        const store = tx.objectStore('pendingTransactions');

        return new Promise((resolve, reject) => {
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const transaction = getReq.result;
                if (transaction) {
                    transaction.status = 'synced';
                    transaction.synced = true;
                    store.put(transaction);
                }
                resolve();
            };
            getReq.onerror = () => reject(getReq.error);
        });
    }

    async getPendingCount(): Promise<number> {
        if (!this.db) return 0;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('pendingTransactions', 'readonly');
            const store = tx.objectStore('pendingTransactions');
            const index = store.index('status');
            const request = index.count('pending');

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ========== SETTINGS ==========

    async saveSetting(key: string, value: any): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            const request = store.put({ key, value, updatedAt: new Date() });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key: string): Promise<any> {
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('settings', 'readonly');
            const store = tx.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.value || null);
            request.onerror = () => reject(request.error);
        });
    }

    async getLastSyncTime(): Promise<Date | null> {
        return this.getSetting('lastSync');
    }

    async setLastSyncTime(): Promise<void> {
        return this.saveSetting('lastSync', new Date());
    }

    // ========== SYNC LOG ==========

    async logSync(action: string, details: any): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('syncLog', 'readwrite');
            const store = tx.objectStore('syncLog');
            const request = store.add({
                action,
                details,
                timestamp: new Date()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Singleton instance
export const offlineDB = new OfflineDB();
export type { Product, PendingTransaction, OfflineSettings };
