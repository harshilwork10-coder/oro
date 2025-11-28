'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import CheckIn from '@/components/kiosk/CheckIn'
import CustomerDisplay from '@/components/kiosk/CustomerDisplay'
import Review from '@/components/kiosk/Review'
import ThankYou from '@/components/kiosk/ThankYou'
import { useFullscreen } from '@/hooks/useFullscreen'

export default function KioskPage() {
    const [cart, setCart] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { enterFullscreen, isSupported } = useFullscreen()
    const lastCartRef = useRef<string>('')

    // Auto-enter fullscreen on mount
    useEffect(() => {
        if (isSupported) {
            // Delay to avoid blocking page load
            setTimeout(() => {
                enterFullscreen().catch(err => {
                    // User interaction required - that's okay
                    console.log('Fullscreen requires user interaction')
                })
            }, 1000)
        }
    }, [isSupported, enterFullscreen])

    const fetchCart = async () => {
        try {
            const res = await fetch('/api/pos/cart')
            if (res.ok) {
                const data = await res.json()
                const cartData = data.empty ? null : data
                const cartString = JSON.stringify(cartData)

                if (cartString !== lastCartRef.current) {
                    lastCartRef.current = cartString
                    setCart(cartData)
                }
            }
        } catch (error) {
            console.error('Error fetching cart:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // 1. Initial check from LocalStorage
        const savedCart = localStorage.getItem('pos_cart_sync')
        if (savedCart) {
            try {
                const parsed = JSON.parse(savedCart)
                if (parsed.type === 'CART_UPDATE') {
                    const cartString = JSON.stringify(parsed.data)
                    if (cartString !== lastCartRef.current) {
                        lastCartRef.current = cartString
                        setCart(parsed.data)
                    }
                    setLoading(false)
                }
            } catch (e) {
                console.error('Error parsing saved cart', e)
            }
        }

        // 2. Listen for direct updates from POS (BroadcastChannel)
        const channel = new BroadcastChannel('pos_channel')
        channel.onmessage = (event) => {
            if (event.data.type === 'CART_UPDATE') {
                const cartString = JSON.stringify(event.data.data)
                if (cartString !== lastCartRef.current) {
                    // console.log('Received NEW cart update from POS (Broadcast)')
                    lastCartRef.current = cartString
                    setCart(event.data.data)
                }
                setLoading(false)
            }
        }

        // 3. Listen for LocalStorage updates (Fallback)
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'pos_cart_sync' && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue)
                    if (parsed.type === 'CART_UPDATE') {
                        const cartString = JSON.stringify(parsed.data)
                        if (cartString !== lastCartRef.current) {
                            // console.log('Received NEW cart update from POS (Storage)')
                            lastCartRef.current = cartString
                            setCart(parsed.data)
                        }
                        setLoading(false)
                    }
                } catch (err) {
                    console.error('Error parsing storage update', err)
                }
            }
        }
        window.addEventListener('storage', handleStorage)

        return () => {
            channel.close()
            window.removeEventListener('storage', handleStorage)
        }
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    // State Logic
    const status = cart?.status || 'IDLE'

    return (
        <>
            {status === 'REVIEW' && <Review onComplete={fetchCart} />}
            {status === 'COMPLETED' && <ThankYou onComplete={fetchCart} />}

            {status === 'ACTIVE' && cart?.items?.length > 0 && <CustomerDisplay cart={cart} />}

            {/* Keep CheckIn mounted but hidden when not active to preserve state */}
            <div style={{ display: status === 'IDLE' ? 'block' : 'none' }}>
                <CheckIn />
            </div>
        </>
    )
}
