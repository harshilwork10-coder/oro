/**
 * usePosDisplay — React hook for POS display integration
 *
 * Replaces direct PosDisplayBroadcast usage in POS pages.
 * Internally manages the CustomerDisplayManager lifecycle.
 *
 * Usage:
 *   const { sendCart, showThankYou, isConnected } = usePosDisplay(stationId)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CustomerDisplayManager } from '@/lib/display/CustomerDisplayManager'
import type { CartPayload, DisplayManagerStatus, DisplayCandidate } from '@/lib/display/types'

interface UsePosDisplayReturn {
    /** Push cart state to the connected display */
    sendCart: (cart: CartPayload) => void
    /** Show idle/welcome screen */
    showIdleScreen: () => void
    /** Show thank-you screen */
    showThankYou: (customerName?: string, total?: number) => void
    /** Run test pattern on connected display */
    runTestPattern: () => Promise<boolean>
    /** Current connection status */
    isConnected: boolean
    /** Whether the active driver uses local transport (no server round-trip) */
    isLocalTransport: boolean
    /** Full status object */
    status: DisplayManagerStatus
    /** Detected candidate displays */
    candidates: DisplayCandidate[]
    /** Manually connect to a specific candidate */
    connectTo: (candidate: DisplayCandidate) => Promise<void>
    /** Disconnect current display */
    disconnect: () => void
    /** Re-run detection */
    refreshDetection: () => Promise<void>
}

const DEFAULT_STATUS: DisplayManagerStatus = {
    connected: false,
    driverName: null,
    mode: null,
    hardwareId: null,
    lastError: null,
}

export function usePosDisplay(stationId: string | null): UsePosDisplayReturn {
    const managerRef = useRef<CustomerDisplayManager | null>(null)
    const [status, setStatus] = useState<DisplayManagerStatus>(DEFAULT_STATUS)
    const [candidates, setCandidates] = useState<DisplayCandidate[]>([])

    // Initialize manager singleton
    useEffect(() => {
        if (!managerRef.current) {
            managerRef.current = new CustomerDisplayManager()
        }
    }, [])

    // Auto-connect when stationId is available
    useEffect(() => {
        if (!stationId || !managerRef.current) return

        const mgr = managerRef.current
        let cancelled = false

        const init = async () => {
            await mgr.autoConnect(stationId)
            if (!cancelled) {
                setStatus(mgr.getStatus())
            }
        }

        init()

        return () => {
            cancelled = true
        }
    }, [stationId])

    const sendCart = useCallback((cart: CartPayload) => {
        managerRef.current?.sendCart(cart)
    }, [])

    const showIdleScreen = useCallback(() => {
        managerRef.current?.showIdleScreen()
    }, [])

    const showThankYou = useCallback((customerName?: string, total?: number) => {
        managerRef.current?.showThankYou(customerName, total)
    }, [])

    const runTestPattern = useCallback(async () => {
        const result = await managerRef.current?.runTestPattern() ?? false
        setStatus(managerRef.current?.getStatus() ?? DEFAULT_STATUS)
        return result
    }, [])

    const connectTo = useCallback(async (candidate: DisplayCandidate) => {
        if (!managerRef.current) return
        await managerRef.current.connectDisplay(candidate)
        if (stationId) {
            await managerRef.current.saveProfile(stationId, candidate)
        }
        setStatus(managerRef.current.getStatus())
    }, [stationId])

    const disconnect = useCallback(() => {
        managerRef.current?.disconnectDisplay()
        setStatus(managerRef.current?.getStatus() ?? DEFAULT_STATUS)
    }, [])

    const refreshDetection = useCallback(async () => {
        if (!managerRef.current) return
        const detected = await managerRef.current.detectAvailableDisplays()
        setCandidates(detected)
    }, [])

    return {
        sendCart,
        showIdleScreen,
        showThankYou,
        runTestPattern,
        isConnected: status.connected,
        /** True when the display uses local transport (no server round-trip for rendering) */
        isLocalTransport: managerRef.current?.isLocalTransport ?? false,
        status,
        candidates,
        connectTo,
        disconnect,
        refreshDetection,
    }
}
