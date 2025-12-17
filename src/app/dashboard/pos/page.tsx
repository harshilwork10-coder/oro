'use client'

import { Suspense } from 'react'
import UniversalPOSRouter from '@/components/pos/UniversalPOSRouter'
import { Loader2 } from 'lucide-react'

/**
 * Main POS Page
 * 
 * This page automatically routes to the appropriate POS based on business type:
 * - SALON → /dashboard/pos/salon
 * - RETAIL → /dashboard/pos/retail
 * - RESTAURANT → /dashboard/pos/restaurant (future)
 * - HYBRID → /dashboard/pos/hybrid
 */
export default function POSPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            </div>
        }>
            <UniversalPOSRouter />
        </Suspense>
    )
}
