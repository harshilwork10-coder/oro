'use client'

/**
 * FIX 8 — OWNER BULK PRICING
 * Replaces the 6-line silent redirect to /dashboard/inventory/bulk-price-update.
 * Now shows a contextual landing with an explanation and a labeled forward link
 * so the owner knows where they are going and why.
 */

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Tag } from 'lucide-react'

export default function OwnerBulkPricingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3 mb-8">
                <Link
                    href="/dashboard/owner"
                    className="flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors text-sm"
                >
                    <ArrowLeft className="h-4 w-4" /> Owner Portal
                </Link>
                <span className="text-stone-600">/</span>
                <span className="text-stone-200 font-medium">Bulk Pricing</span>
            </div>

            <div className="max-w-xl">
                <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mb-6">
                    <Tag className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-stone-100 mb-2">Bulk Pricing</h1>
                <p className="text-stone-400 mb-8">
                    Update prices and margins across multiple products or entire departments at once.
                    Changes apply immediately to all POS stations.
                </p>

                <Link
                    href="/dashboard/inventory/bulk-price-update"
                    className="flex items-center justify-between p-5 bg-stone-900/80 border border-stone-600 hover:border-orange-500/50 rounded-2xl transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <Tag className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="font-bold text-stone-100 group-hover:text-white">Open Bulk Price Update</p>
                            <p className="text-sm text-stone-400">Update prices by department, category, or supplier</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-stone-500 group-hover:text-orange-400 transition-colors" />
                </Link>

                <p className="text-xs text-stone-500 mt-4 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-stone-600 rounded-full inline-block" />
                    You will be taken to the Inventory section. Use the browser back button or the breadcrumb above to return.
                </p>
            </div>
        </div>
    )
}
