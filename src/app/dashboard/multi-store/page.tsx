'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Store, DollarSign, ShoppingCart, AlertTriangle, Users, RefreshCw, Package, ChevronRight, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

import DashboardShell from '@/components/dashboard/command-center/DashboardShell'
import CommandHeader from '@/components/dashboard/command-center/CommandHeader'
import KpiStrip from '@/components/dashboard/command-center/KpiStrip'
import AlertRail from '@/components/dashboard/command-center/AlertRail'
import type { ExceptionItem } from '@/components/dashboard/command-center/AlertRail'
import QuickActionsPanel from '@/components/dashboard/command-center/QuickActionsPanel'
import WorkspaceTabs from '@/components/dashboard/command-center/WorkspaceTabs'

interface LocationData {
    location: {
        id: string
        name: string
        address: string | null
    }
    today: {
        sales: number
        transactions: number
        cash: number
        card: number
        avgTicket: number
    }
    mtd: {
        sales: number
        transactions: number
    }
    inventory: {
        totalProducts: number
        lowStock: number
    }
    staff: {
        count: number
    }
}

interface DashboardData {
    locations: LocationData[]
    summary: {
        totalLocations: number
        todaySales: number
        todayTransactions: number
        mtdSales: number
        lowStockTotal: number
        topLocation: string | null
    }
}

// ─── Location Cards Grid Component ─────────────────────
function LocationPerformanceGrid({ locations, topLocation }: { locations: LocationData[], topLocation: string | null }) {
    if (locations.length === 0) {
        return (
            <div className="text-center py-16 text-stone-400">
                <Store className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No locations found</p>
                <p className="text-sm">Add locations to see performance data</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Top Performer Badge */}
            {topLocation && (
                <div className="bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-4">
                    <span className="text-3xl">🏆</span>
                    <div>
                        <p className="text-sm text-stone-400">Today&apos;s Top Performer</p>
                        <p className="text-xl font-bold text-yellow-400">{topLocation}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map((loc) => (
                    <div
                        key={loc.location.id}
                        className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 hover:border-indigo-500/50 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">{loc.location.name}</h3>
                                <p className="text-sm text-stone-500">{loc.location.address || 'No address'}</p>
                            </div>
                            <div className="flex items-center gap-1 text-stone-400">
                                <Users className="h-4 w-4" />
                                <span className="text-sm">{loc.staff.count}</span>
                            </div>
                        </div>

                        {/* Today's Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white/[0.03] rounded-xl p-3">
                                <p className="text-xs text-stone-500 mb-1 font-semibold uppercase tracking-wider">Today Sales</p>
                                <p className="text-xl font-bold text-emerald-400">{formatCurrency(loc.today.sales)}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3">
                                <p className="text-xs text-stone-500 mb-1 font-semibold uppercase tracking-wider">Transactions</p>
                                <p className="text-xl font-bold text-white">{loc.today.transactions}</p>
                            </div>
                        </div>

                        {/* Payment Split */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-emerald-500/10 rounded-lg p-2 text-center border border-emerald-500/10">
                                <p className="text-xs text-emerald-400 font-medium">Cash</p>
                                <p className="font-bold text-emerald-400">{formatCurrency(loc.today.cash)}</p>
                            </div>
                            <div className="flex-1 bg-blue-500/10 rounded-lg p-2 text-center border border-blue-500/10">
                                <p className="text-xs text-blue-400 font-medium">Card</p>
                                <p className="font-bold text-blue-400">{formatCurrency(loc.today.card)}</p>
                            </div>
                        </div>

                        {/* Bottom Stats */}
                        <div className="flex justify-between text-sm border-t border-white/[0.05] pt-3">
                            <div>
                                <span className="text-stone-500 font-medium tracking-wide">AVG TICKET:</span>
                                <span className="ml-2 font-bold text-stone-200">{formatCurrency(loc.today.avgTicket)}</span>
                            </div>
                            <div>
                                <span className="text-stone-500 font-medium tracking-wide">MTD:</span>
                                <span className="ml-2 font-bold text-amber-400">{formatCurrency(loc.mtd.sales)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Inventory Hub Component ─────────────────────────────
function InventoryHub({ locations }: { locations: LocationData[] }) {
    if (locations.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                    <Package className="h-5 w-5 text-orange-400" />
                    Store Inventory Status
                </h2>
                <div className="flex gap-3">
                    <Link href="/dashboard/owner/transfers" className="text-xs font-semibold px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] rounded-md transition-colors border border-white/[0.06] flex items-center gap-2">
                        <Package className="h-3 w-3 text-stone-400" /> Stock Transfers
                    </Link>
                    <Link href="/dashboard/multi-store/inventory" className="text-xs font-semibold px-3 py-1.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-md transition-colors border border-orange-500/20 flex items-center gap-2">
                        Overview <ChevronRight className="h-3 w-3" />
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.map((loc) => (
                    <div
                        key={`inv-${loc.location.id}`}
                        className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:border-orange-500/30 transition-colors flex flex-col"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-stone-200">{loc.location.name}</h3>
                            {loc.inventory.lowStock > 0 && (
                                <span className="bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-red-500/20">
                                    {loc.inventory.lowStock} Low Stock
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between text-sm mb-4 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.02]">
                            <span className="text-stone-400 font-medium">Total Products</span>
                            <span className="font-bold text-white text-lg">{loc.inventory.totalProducts}</span>
                        </div>
                        <div className="mt-auto pt-2 grid grid-cols-2 gap-2">
                            <Link
                                href={`/dashboard/inventory/retail?locationId=${loc.location.id}`}
                                className="bg-white/[0.05] hover:bg-white/[0.1] text-stone-300 text-center py-2 rounded-lg text-xs font-bold transition-colors"
                            >
                                Manage Store
                            </Link>
                            {loc.inventory.lowStock > 0 ? (
                                <Link
                                    href={`/dashboard/inventory/alerts?locationId=${loc.location.id}`}
                                    className="bg-red-500/15 hover:bg-red-500/25 text-red-400 text-center py-2 rounded-lg text-xs font-bold transition-colors border border-red-500/20"
                                >
                                    Resolve Alert
                                </Link>
                            ) : (
                                <div className="bg-emerald-500/10 text-emerald-500/50 text-center py-2 rounded-lg text-xs font-bold border border-emerald-500/10 cursor-not-allowed">
                                    Stock OK
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function MultiStoreDashboard() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/dashboard/multi-store')
            if (!res.ok) throw new Error('Failed to fetch')
            const json = await res.json()
            setData(json)
        } catch (e) {
            setError('Failed to load dashboard data')
            console.error(e)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
        // Refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
            </div>
        )
    }

    // Build the Alert Rail items from low stock exceptions
    const alertRailItems: ExceptionItem[] = data?.locations
        .filter(loc => loc.inventory.lowStock > 0)
        .map(loc => ({
            id: `low-stock-${loc.location.id}`,
            title: `${loc.inventory.lowStock} items low in stock`,
            description: `Store: ${loc.location.name}`,
            severity: 'medium',
            timeAgo: 'Just now', // Standard operational truth would use real time delta here
            icon: AlertTriangle,
            actionLabel: 'Resolve'
        })) || []

    return (
        <DashboardShell
            header={
                <CommandHeader
                    title="Owner Command Center"
                    subtitle={`${data?.summary?.totalLocations || 0} locations · Cross-store performance`}
                    icon={Store}
                    roleBadge="Multi-Store Owner"
                    roleBadgeColor="bg-blue-500/15 text-blue-400 border-blue-500/20"
                    onRefresh={fetchData}
                    refreshing={loading}
                />
            }
            kpiStrip={
                <KpiStrip
                    columns={5}
                    kpis={[
                        {
                            title: 'Locations',
                            value: data?.summary?.totalLocations || 0,
                            subtitle: 'Active stores',
                            icon: Store,
                            variant: 'default',
                        },
                        {
                            title: 'Today Sales',
                            value: data?.summary ? formatCurrency(data.summary.todaySales) : '$0',
                            subtitle: 'Gross cross-store',
                            icon: DollarSign,
                            variant: 'success',
                        },
                        {
                            title: 'Today Txns',
                            value: data?.summary?.todayTransactions || 0,
                            subtitle: 'Total volume',
                            icon: ShoppingCart,
                            variant: 'default',
                        },
                        {
                            title: 'MTD Sales',
                            value: data?.summary ? formatCurrency(data.summary.mtdSales) : '$0',
                            subtitle: 'Month tracking',
                            icon: TrendingUp,
                            variant: 'accent',
                        },
                        {
                            title: 'Low Stock',
                            value: data?.summary?.lowStockTotal || 0,
                            subtitle: 'Across network',
                            icon: AlertTriangle,
                            variant: (data?.summary?.lowStockTotal || 0) > 0 ? 'warning' : 'default',
                        },
                    ]}
                />
            }
            alertRail={
                <AlertRail
                    exceptions={alertRailItems}
                    emptyTitle="All Clear"
                    emptySubtitle="No exceptions or low stock alerts at this time."
                />
            }
            quickActions={
                <QuickActionsPanel
                    title="Owner Intervention Queue"
                    actions={[
                        { label: 'Store Pricing', sublabel: 'Manage rules', icon: DollarSign, href: '/dashboard/multi-store/pricing', color: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
                        { label: 'Stock Transfers', sublabel: 'Move items', icon: Package, href: '/dashboard/owner/transfers', color: 'bg-purple-500/15', iconColor: 'text-purple-400' },
                        { label: 'Overrides', sublabel: 'Pending voids', icon: Zap, href: '/dashboard/owner/approvals', color: 'bg-amber-500/15', iconColor: 'text-amber-400' },
                    ]}
                />
            }
            workspace={
                <WorkspaceTabs
                    tabs={[
                        {
                            id: 'performance',
                            label: 'Store Performance',
                            icon: TrendingUp,
                            content: <LocationPerformanceGrid locations={data?.locations || []} topLocation={data?.summary?.topLocation || null} />,
                        },
                        {
                            id: 'inventory',
                            label: 'Inventory Status',
                            icon: Package,
                            content: <InventoryHub locations={data?.locations || []} />,
                        },
                    ]}
                />
            }
        />
    )
}

