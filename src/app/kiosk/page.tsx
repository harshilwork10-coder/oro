'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import CheckIn from '@/components/kiosk/CheckIn'
import CustomerDisplay from '@/components/kiosk/CustomerDisplay'
import Review from '@/components/kiosk/Review'
import { useFullscreen } from '@/hooks/useFullscreen'

export default function KioskPage() {
    const [cart, setCart] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { enterFullscreen, isSupported } = useFullscreen()

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
                setCart(data.empty ? null : data)
            }
        } catch (error) {
            console.error('Error fetching cart:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCart()
        const interval = setInterval(fetchCart, 1000) // Poll every second
        return () => clearInterval(interval)
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

    if (status === 'REVIEW') {
        return <Review onComplete={fetchCart} />
    }

    if (status === 'ACTIVE' && cart?.items?.length > 0) {
        return <CustomerDisplay cart={cart} />
    }

    // Default to Check-In (IDLE)
    return <CheckIn />
}
