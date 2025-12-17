'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, WifiOff } from 'lucide-react'
import CheckIn from '@/components/kiosk/CheckIn'
import CustomerDisplay from '@/components/kiosk/CustomerDisplay'
import Review from '@/components/kiosk/Review'
import ThankYou from '@/components/kiosk/ThankYou'
import { useFullscreen } from '@/hooks/useFullscreen'

function DisplayContent() {
    const searchParams = useSearchParams()
    // Support both stationId (retail POS) and locationId (salon POS) - prefer stationId
    const stationId = searchParams.get('stationId')
    const locationId = searchParams.get('locationId')
    const displayKey = stationId || locationId // Use whichever is provided

    const [cart, setCart] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [savedTipAmount, setSavedTipAmount] = useState(0)
    const [networkErrorCount, setNetworkErrorCount] = useState(0)
    const [processingStartTime, setProcessingStartTime] = useState<number | null>(null)
    const { enterFullscreen, isSupported } = useFullscreen()
    const lastCartRef = useRef<string>('')

    // Timeout constants
    const PROCESSING_TIMEOUT_MS = 120000 // 2 minutes max for processing
    const NETWORK_ERROR_THRESHOLD = 10 // Show error after 10 consecutive failures

    // Auto-enter fullscreen on mount
    useEffect(() => {
        if (isSupported) {
            setTimeout(() => {
                enterFullscreen().catch(err => {
                    console.log('Fullscreen requires user interaction')
                })
            }, 1000)
        }
    }, [isSupported, enterFullscreen])

    // Server polling for location-specific cart (ONLY method - location-isolated)
    useEffect(() => {
        if (!displayKey) {
            setLoading(false)
            setError('No station or location ID provided. Open this URL from POS Display button.')
            return
        }

        const pollServer = async () => {
            try {
                // Use stationId param if available, else locationId
                const paramName = stationId ? 'stationId' : 'locationId'
                const res = await fetch(`/api/pos/display-sync?${paramName}=${displayKey}`)
                if (res.ok) {
                    const data = await res.json()
                    const cartString = JSON.stringify(data)
                    if (cartString !== lastCartRef.current) {
                        lastCartRef.current = cartString

                        // If we're in processing mode, check for exit conditions
                        if (isProcessing) {
                            // Exit processing if: transaction completed, cart cleared, or cart is new
                            if (data.status === 'COMPLETED' ||
                                data.status === 'IDLE' ||
                                data.status === 'CANCELLED' ||
                                !data.items ||
                                data.items.length === 0) {
                                setIsProcessing(false)
                                setSavedTipAmount(0)

                                // If it's a new active cart, show it. Otherwise clear display.
                                if (data.status === 'ACTIVE' && data.items && data.items.length > 0) {
                                    setCart(data)
                                } else if (data.status === 'COMPLETED') {
                                    setCart(data)
                                } else {
                                    setCart(null)
                                }
                                return
                            }
                            // Still processing and no exit condition - stay in processing mode
                            return
                        }

                        // Normal flow (not in processing mode)
                        if ((data.status === 'ACTIVE' || data.status === 'AWAITING_TIP' || data.status === 'TIP_SELECTED') && data.items && data.items.length > 0) {
                            setCart(data)
                        } else if (data.status === 'REVIEW' || data.status === 'COMPLETED') {
                            setCart(data)
                        } else {
                            setCart(null)
                        }
                    }
                    setNetworkErrorCount(0) // Reset on successful fetch
                }
            } catch (error) {
                console.error('Error polling server:', error)
                setNetworkErrorCount(prev => prev + 1)
            } finally {
                setLoading(false)
            }
        }

        // Poll immediately then every 500ms for fast updates
        pollServer()
        const interval = setInterval(pollServer, 500)
        return () => clearInterval(interval)
    }, [displayKey, stationId, isProcessing])

    // Processing timeout - exit processing if cashier abandons transaction
    useEffect(() => {
        if (isProcessing && processingStartTime) {
            const checkTimeout = setInterval(() => {
                const elapsed = Date.now() - processingStartTime
                if (elapsed > PROCESSING_TIMEOUT_MS) {
                    console.log('[DISPLAY] Processing timeout - resetting')
                    setIsProcessing(false)
                    setSavedTipAmount(0)
                    setProcessingStartTime(null)
                    setCart(null)
                }
            }, 5000) // Check every 5 seconds

            return () => clearInterval(checkTimeout)
        }
    }, [isProcessing, processingStartTime])

    // Handle tip selection - send back to POS
    const handleTipSelected = async (tipAmount: number) => {
        if (!displayKey) return

        // Save tip amount and enter processing mode with timestamp
        setSavedTipAmount(tipAmount)
        setIsProcessing(true)
        setProcessingStartTime(Date.now())

        try {
            await fetch('/api/pos/display-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    [stationId ? 'stationId' : 'locationId']: displayKey,
                    cart: {
                        ...cart,
                        tipAmount,
                        tipSelected: true,
                        status: 'TIP_SELECTED'
                    }
                })
            })
            setNetworkErrorCount(0) // Reset on success
        } catch (error) {
            console.error('Error sending tip:', error)
            // Even if API fails, stay in processing mode
        }
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 p-8">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-xl font-bold text-gray-800">Display Not Connected</h2>
                <p className="text-gray-500 text-center max-w-md">{error}</p>
                <p className="text-sm text-gray-400 mt-4">
                    Go to POS → Click "Display" → Use the URL or QR code shown
                </p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                <p className="text-gray-500 text-sm">Connecting to Location...</p>
            </div>
        )
    }

    // State Logic
    const status = cart?.status || 'IDLE'
    const showTipModal = status === 'AWAITING_TIP' && cart?.showTipPrompt

    // Show processing screen after tip selected - use local state for persistence
    if (isProcessing || status === 'TIP_SELECTED') {
        return (
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8">
                <div className="animate-spin h-16 w-16 border-4 border-orange-500 border-t-transparent rounded-full mb-6"></div>
                <h2 className="text-3xl font-bold text-white mb-2">Processing Payment...</h2>
                <p className="text-stone-400 text-xl">Please wait while your cashier completes the transaction</p>
                {(savedTipAmount > 0 || cart?.tipAmount > 0) && (
                    <div className="mt-6 bg-stone-800 rounded-xl px-8 py-4">
                        <span className="text-stone-400">Tip Added: </span>
                        <span className="text-orange-400 font-bold text-xl">${Number(savedTipAmount || cart?.tipAmount || 0).toFixed(2)}</span>
                    </div>
                )}
            </div>
        )
    }

    // Show network error after multiple failures (threshold: 5 consecutive failures = 2.5 seconds)
    const showNetworkWarning = networkErrorCount >= 5

    return (
        <>
            {/* Network error indicator */}
            {showNetworkWarning && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-lg animate-pulse">
                    <WifiOff className="h-5 w-5" />
                    <span className="text-sm font-medium">Connection lost - Reconnecting...</span>
                </div>
            )}

            {status === 'REVIEW' && <Review locationId={displayKey || undefined} onComplete={() => setCart(null)} />}
            {status === 'COMPLETED' && <ThankYou onComplete={() => setCart(null)} />}

            {(status === 'ACTIVE' || status === 'AWAITING_TIP') && cart?.items?.length > 0 && (
                <CustomerDisplay
                    cart={cart}
                    showTipModal={showTipModal}
                    onTipSelected={handleTipSelected}
                    onTipModalClose={() => handleTipSelected(0)}
                />
            )}

            {/* Keep CheckIn mounted but hidden when not active to preserve state */}
            <div style={{ display: status === 'IDLE' || !cart ? 'block' : 'none' }}>
                <CheckIn />
            </div>
        </>
    )
}

export default function CustomerDisplayPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        }>
            <DisplayContent />
        </Suspense>
    )
}
