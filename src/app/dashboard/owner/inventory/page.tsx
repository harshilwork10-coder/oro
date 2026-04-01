'use client'

/**
 * FIX 8 — OWNER INVENTORY HUB
 * Replaces the 6-line silent redirect to /dashboard/inventory/retail.
 * Owner stays in context, sees their inventory command center,
 * with explicit links to each inventory sub-area.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
    ArrowLeft, Package, ShoppingCart, ClipboardList,
    Tag, ArrowLeftRight, Zap, TrendingDown, AlertCircle
} from 'lucide-react'

interface InventorySummary {
    totalProducts: number
    lowStockCount: number
    pendingPOs: number
    pendingTransfers: number
}

export default function OwnerInventoryHubPage() {
    const [summary, setSummary] = useState<InventorySummary | null>(null)

    useEffect(() => {
        fetch('/api/inventory/summary')
            .then(r => r.json())
            .then(d => setSummary(d.data))
            .catch(() => {})
    }, [])

    const hubs = [
        {
            href: '/dashboard/inventory/retail',
            icon: Package,
            label: 'Products',
            desc: 'View, edit, and manage your product catalog',
            color: 'from-blue-500 to-cyan-500',
            badge: summary?.totalProducts != null ? `${summary.totalProducts} items` : null,
        },
        {
            href: '/dashboard/inventory/purchase-orders',
            icon: ShoppingCart,
            label: 'Purchase Orders',
            desc: 'Manage open orders, receive shipments',
            color: 'from-violet-500 to-purple-500',
            badge: summary?.pendingPOs ? `${summary.pendingPOs} pending` : null,
            badgeColor: summary?.pendingPOs ? 'bg-amber-500/20 text-amber-400' : undefined,
        },
        {
            href: '/dashboard/inventory/physical-count',
            icon: ClipboardList,
            label: 'Physical Count',
            desc: 'Count inventory to reconcile stock levels',
            color: 'from-emerald-500 to-teal-500',
            badge: null,
        },
        {
            href: '/dashboard/inventory/bulk-price-update',
            icon: Tag,
            label: 'Bulk Pricing',
            desc: 'Update prices across departments at once',
            color: 'from-orange-500 to-amber-500',
            badge: null,
        },
        {
            href: '/dashboard/owner/transfers',
            icon: ArrowLeftRight,
            label: 'Stock Transfers',
            desc: 'Move inventory between locations',
            color: 'from-pink-500 to-rose-500',
            badge: summary?.pendingTransfers ? `${summary.pendingTransfers} pending` : null,
            badgeColor: summary?.pendingTransfers ? 'bg-blue-500/20 text-blue-400' : undefined,
        },
        {
            href: '/dashboard/inventory/smart-ordering',
            icon: Zap,
            label: 'Smart Ordering',
            desc: 'Auto-reorder suggestions based on velocity',
            color: 'from-yellow-500 to-orange-500',
            badge: null,
        },
        {
            href: '/dashboard/inventory/label-printing',
            icon: Tag,
            label: 'Print Labels',
            desc: 'Generate and print shelf labels',
            color: 'from-teal-500 to-emerald-500',
            badge: null,
        },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Breadcrumb — FIX 8: explicit context so owner knows where they are */}
            <div className="flex items-center gap-3 mb-8">
                <Link
                    href="/dashboard/owner"
                    className="flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors text-sm"
                >
                    <ArrowLeft className="h-4 w-4" /> Owner Portal
                </Link>
                <span className="text-stone-600">/</span>
                <span className="text-stone-200 font-medium">Inventory</span>
            </div>

            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Inventory
                </h1>
                <p className="text-stone-400 mt-1">Manage products, orders, counts, labels, and transfers</p>
            </div>

            {/* Low stock alert */}
            {summary?.lowStockCount != null && summary.lowStockCount > 0 && (
                <div className="mb-6 flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                    <div>
                        <span className="font-semibold text-amber-300">{summary.lowStockCount} items</span>
                        <span className="text-amber-400/80 ml-1">are at or below minimum stock levels</span>
                    </div>
                    <Link
                        href="/dashboard/owner/exceptions?filter=LOW_STOCK"
                        className="ml-auto text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
                    >
                        View →
                    </Link>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {hubs.map(hub => {
                    const Icon = hub.icon
                    return (
                        <Link
                            key={hub.href}
                            href={hub.href}
                            className="group bg-stone-900/80 border border-stone-700 hover:border-stone-500 rounded-2xl p-5 transition-all hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${hub.color} flex items-center justify-center`}>
                                    <Icon className="h-6 w-6 text-white" />
                                </div>
                                {hub.badge && (
                                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${hub.badgeColor || 'bg-stone-700 text-stone-300'}`}>
                                        {hub.badge}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-stone-100 group-hover:text-white transition-colors">{hub.label}</h3>
                            <p className="text-sm text-stone-400 mt-0.5">{hub.desc}</p>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
