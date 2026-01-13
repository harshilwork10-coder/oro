import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'oronext_device_id'
const DB_NAME = 'OronextSystem'
const STORE_NAME = 'SysConfig'

export class DeviceTrust {
    /**
     * Get the persistent Device ID (Cockroach method)
     * Tries Memory -> LocalStorage -> IndexedDB -> Generates New
     */
    static async getDeviceId(): Promise<string> {
        if (typeof window === 'undefined') return ''

        // 1. Try LocalStorage
        let deviceId = localStorage.getItem(STORAGE_KEY)

        // 2. Try IndexedDB (Deeper storage)
        if (!deviceId) {
            deviceId = await this.readFromIndexedDB()
            if (deviceId) {
                // Self-heal LocalStorage
                localStorage.setItem(STORAGE_KEY, deviceId)
            }
        }

        // 3. Generate New if absolutely nothing found
        if (!deviceId) {
            deviceId = uuidv4()
            this.saveDeviceId(deviceId)
        }

        return deviceId
    }

    /**
     * Save Device ID to all layers
     */
    static async saveDeviceId(id: string) {
        if (typeof window === 'undefined') return

        localStorage.setItem(STORAGE_KEY, id)
        await this.writeToIndexedDB(id)
    }

    /**
     * IndexedDB Helper - Read
     */
    private static readFromIndexedDB(): Promise<string | null> {
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, 1)

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME)
                }
            }

            request.onsuccess = (event: any) => {
                const db = event.target.result
                const transaction = db.transaction([STORE_NAME], 'readonly')
                const store = transaction.objectStore(STORE_NAME)
                const query = store.get(STORAGE_KEY)

                query.onsuccess = () => {
                    resolve(query.result || null)
                }
                query.onerror = () => {
                    resolve(null)
                }
            }

            request.onerror = () => {
                resolve(null)
            }
        })
    }

    /**
     * IndexedDB Helper - Write
     */
    private static writeToIndexedDB(id: string): Promise<void> {
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, 1)

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME)
                }
            }

            request.onsuccess = (event: any) => {
                const db = event.target.result
                const transaction = db.transaction([STORE_NAME], 'readwrite')
                const store = transaction.objectStore(STORE_NAME)
                store.put(id, STORAGE_KEY)

                transaction.oncomplete = () => resolve()
                transaction.onerror = () => resolve() // Fail silent
            }

            request.onerror = () => resolve()
        })
    }

    /**
     * Attempt to restore session using Device ID
     */
    static async restoreSession(): Promise<boolean> {
        const deviceId = await this.getDeviceId()

        try {
            const res = await fetch('/api/auth/restore-device', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ deviceId })
            })

            if (res.ok) {
                const data = await res.json()
                return data.restored
            }
        } catch (e) {
            console.error('Device restoration failed', e)
        }
        return false
    }
}
