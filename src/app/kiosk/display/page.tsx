'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import CheckIn from '@/components/kiosk/CheckIn'
import CustomerDisplay from '@/components/kiosk/CustomerDisplay'
import Review from '@/components/kiosk/Review'
import ThankYou from '@/components/kiosk/ThankYou'
import { useFullscreen } from '@/hooks/useFullscreen'

function DisplayContent() {
    const searchParams = useSearchParams()
    const locationId = searchParams.get('locationId')

    const [cart, setCart] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { enterFullscreen, isSupported } = useFullscreen()
    const lastCartRef = useRef<string>('')

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
        if (!locationId) {
            setLoading(false)
            setError('No location ID provided. Open this URL from POS Display button.')
            return
        }

        const pollServer = async () => {
            try {
                const res = await fetch(`/api/pos/display-sync?locationId=${locationId}`)
                if (res.ok) {
                    const data = await res.json()
                    const cartString = JSON.stringify(data)
                    if (cartString !== lastCartRef.current) {
                        lastCartRef.current = cartString
                        // Only set cart if there are items
                        if (data.status === 'ACTIVE' && data.items && data.items.length > 0) {
                            setCart(data)
                        } else {
                            setCart(null)
                        }
                    }
                }
            } catch (error) {
                console.error('Error polling server:', error)
            } finally {
                setLoading(false)
            }
        }

        // Poll immediately then every 500ms for fast updates
        pollServer()
        const interval = setInterval(pollServer, 500)
        return () => clearInterval(interval)
    }, [locationId])

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

    return (
        <>
            {status === 'REVIEW' && <Review locationId={locationId || undefined} onComplete={() => setCart(null)} />}
            {status === 'COMPLETED' && <ThankYou onComplete={() => setCart(null)} />}

            {status === 'ACTIVE' && cart?.items?.length > 0 && <CustomerDisplay cart={cart} />}

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
