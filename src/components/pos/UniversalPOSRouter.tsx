'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBusinessConfig } from '@/hooks/useBusinessConfig'
import { Loader2 } from 'lucide-react'

/**
 * Universal POS Router
 * 
 * This component checks the business posMode and routes to the appropriate POS:
 * - SALON → Service-based POS (appointments, services)
 * - RETAIL → Product-based POS (inventory, barcode scanning)
 * - RESTAURANT → Menu-based POS (tables, kitchen display) [Future]
 * - HYBRID → Combined POS with tabs for both services and products
 */
export default function UniversalPOSRouter() {
    const router = useRouter()
    const { data: config, isLoading, error } = useBusinessConfig()

    useEffect(() => {
        if (isLoading || !config) return

        const posMode = config.posMode || 'SALON'

        switch (posMode) {
            case 'RETAIL':
                // Redirect to retail POS
                router.replace('/dashboard/pos/retail')
                break
            case 'RESTAURANT':
                // Future: redirect to restaurant POS
                // For now, show salon POS
                router.replace('/dashboard/pos/salon')
                break
            case 'HYBRID':
                // Redirect to hybrid POS (shows both)
                router.replace('/dashboard/pos/hybrid')
                break
            case 'SERVICE':
            case 'SALON':
            default:
                // Redirect to salon/service POS
                router.replace('/dashboard/pos/salon')
                break
        }
    }, [config, isLoading, router])

    // Show loading while determining POS mode
    return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-stone-400 text-lg">Loading Point of Sale...</p>
                {error && (
                    <p className="text-red-400 mt-2">Error loading config. Using default POS.</p>
                )}
            </div>
        </div>
    )
}
