import { useState, useEffect, useCallback } from 'react'

export interface NetworkStatus {
  isBrowserOnline: boolean
  isServerReachable: boolean
  isEffectivelyOnline: boolean
  lastHeartbeatAt: Date | null
  lastCheckAt: Date | null
}

export function useNetworkStatus(heartbeatIntervalMs = 15000) {
    const [status, setStatus] = useState<NetworkStatus>({
        isBrowserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isServerReachable: true,
        isEffectivelyOnline: true,
        lastHeartbeatAt: null,
        lastCheckAt: null
    })

    const checkServerReachable = useCallback(async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setStatus(prev => ({
                ...prev,
                isBrowserOnline: false,
                isEffectivelyOnline: false,
                lastCheckAt: new Date()
            }))
            return false
        }

        try {
            // Ping an actual API endpoint. 
            // Even if it returns 401 Unauthorized, the promise resolves, meaning the server is reachable.
            // Network failures (DNS, offline, server completely down) will trigger a catch block.
            await fetch('/api/pos/sync', { 
                method: 'GET', 
                cache: 'no-store' 
            })
            
            setStatus(prev => ({
                ...prev,
                isBrowserOnline: true,
                isServerReachable: true,
                isEffectivelyOnline: true,
                lastHeartbeatAt: new Date(),
                lastCheckAt: new Date()
            }))
            return true
        } catch (error) {
            setStatus(prev => ({
                ...prev,
                isBrowserOnline: true,
                isServerReachable: false,
                isEffectivelyOnline: false,
                lastCheckAt: new Date()
            }))
            return false
        }
    }, [])

    useEffect(() => {
        const handleOnline = () => {
            setStatus(prev => ({ ...prev, isBrowserOnline: true }))
            checkServerReachable()
        }
        const handleOffline = () => {
            setStatus(prev => ({ ...prev, isBrowserOnline: false, isEffectivelyOnline: false }))
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        checkServerReachable()
        const interval = setInterval(checkServerReachable, heartbeatIntervalMs)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
            clearInterval(interval)
        }
    }, [checkServerReachable, heartbeatIntervalMs])

    return {
        ...status,
        checkNow: checkServerReachable
    }
}
