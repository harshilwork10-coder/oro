'use client'

import { useState, useEffect } from 'react'
import DrawerPanel from './DrawerPanel'
import {
    DollarSign, ShoppingCart, Users, Clock, AlertCircle,
    TrendingUp, TrendingDown, MapPin, Package,
    CheckCircle, ExternalLink,
} from 'lucide-react'

interface LocationDetailDrawerProps {
    open: boolean
    onClose: () => void
    locationId: string | null
    locationData?: any // from the multi-store response
}

function fmt(n: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n)
}

function MiniKpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</p>
            <p className={`text-xl font-black mt-1 ${color || 'text-white'}`}>{value}</p>
            {sub && <p className="text-[11px] text-stone-500 mt-0.5">{sub}</p>}
        </div>
    )
}

export default function LocationDetailDrawer({
    open,
    onClose,
    locationId,
    locationData,
}: LocationDetailDrawerProps) {
    const [exceptions, setExceptions] = useState<any[]>([])
    const [recentTx, setRecentTx] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch location-specific detail when drawer opens
    useEffect(() => {
        if (!open || !locationId) return

        setLoading(true)

        // Fetch exceptions for this location
        fetch(`/api/owner/exceptions?locationId=${locationId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d?.exceptions) setExceptions(d.exceptions.slice(0, 5))
            })
            .catch(() => {})

        // Fetch recent transactions for this location
        fetch(`/api/transactions?locationId=${locationId}&limit=5&status=COMPLETED`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                const txs = Array.isArray(d) ? d : d?.transactions || []
                setRecentTx(txs.slice(0, 5))
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [open, locationId])

    if (!locationData) return null

    const loc = locationData.location
    const today = locationData.today || {}
    const yesterday = locationData.yesterday || {}
    const mtd = locationData.mtd || {}
    const staff = locationData.staff || {}
    const inventory = locationData.inventory || {}

    const delta = yesterday.sales > 0
        ? ((today.sales - yesterday.sales) / yesterday.sales) * 100
        : null

    return (
        <DrawerPanel
            open={open}
            onClose={onClose}
            title={loc?.name || 'Location Details'}
            subtitle={loc?.address || ''}
            width="xl"
        >
            <div className="space-y-6">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <MiniKpi
                        label="Today's Sales"
                        value={fmt(today.sales || 0)}
                        sub={`${today.transactions || 0} transactions`}
                        color="text-emerald-400"
                    />
                    <MiniKpi
                        label="Yesterday"
                        value={fmt(yesterday.sales || 0)}
                        sub={delta !== null
                            ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% change`
                            : 'No data'
                        }
                    />
                    <MiniKpi
                        label="Avg Ticket"
                        value={fmt(today.avgTicket || 0)}
                    />
                    <MiniKpi
                        label="MTD Revenue"
                        value={fmt(mtd.sales || 0)}
                        sub={`${mtd.transactions || 0} transactions`}
                    />
                </div>

                {/* Payment Split */}
                <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-3">
                        Payment Breakdown
                    </h4>
                    <div className="flex gap-3">
                        <div className="flex-1 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                            <div className="flex items-center gap-1.5 mb-1">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-[11px] font-bold text-emerald-400">Cash</span>
                            </div>
                            <p className="text-lg font-black text-emerald-400">{fmt(today.cash || 0)}</p>
                        </div>
                        <div className="flex-1 p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/15">
                            <div className="flex items-center gap-1.5 mb-1">
                                <ShoppingCart className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-[11px] font-bold text-blue-400">Card</span>
                            </div>
                            <p className="text-lg font-black text-blue-400">{fmt(today.card || 0)}</p>
                        </div>
                    </div>
                </div>

                {/* Staff */}
                <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-3">
                        Staff
                    </h4>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Users className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-lg">{staff.onClock || 0}</p>
                                <p className="text-[11px] text-stone-500">On Clock</p>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-white/[0.08]" />
                        <div>
                            <p className="text-stone-300 font-bold text-lg">{staff.total || 0}</p>
                            <p className="text-[11px] text-stone-500">Total Staff</p>
                        </div>
                        {inventory.lowStock > 0 && (
                            <>
                                <div className="w-px h-8 bg-white/[0.08]" />
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-amber-400" />
                                    <div>
                                        <p className="text-amber-400 font-bold text-lg">{inventory.lowStock}</p>
                                        <p className="text-[11px] text-stone-500">Low Stock</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Exceptions */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Active Exceptions
                        </h4>
                        {exceptions.length > 0 && (
                            <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                {exceptions.length}
                            </span>
                        )}
                    </div>
                    {exceptions.length === 0 ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            <span className="text-sm text-emerald-400 font-medium">All clear — no active exceptions</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {exceptions.map((exc: any) => (
                                <div
                                    key={exc.id}
                                    className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                                >
                                    <div
                                        className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                                            exc.severity === 'CRITICAL'
                                                ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                                                : exc.severity === 'WARNING'
                                                  ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                                                  : 'bg-blue-500'
                                        }`}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white">{exc.title}</p>
                                        {exc.description && (
                                            <p className="text-xs text-stone-500 mt-0.5">{exc.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Transactions */}
                <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-3">
                        Recent Transactions
                    </h4>
                    {recentTx.length === 0 ? (
                        <p className="text-sm text-stone-600 text-center py-4">No transactions today</p>
                    ) : (
                        <div className="space-y-1.5">
                            {recentTx.map((tx: any) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                                >
                                    <div>
                                        <span className="font-mono text-sm text-white">
                                            {tx.client
                                                ? `${tx.client.firstName} ${tx.client.lastName?.charAt(0)}.`
                                                : `#${tx.id?.slice(-4)}`}
                                        </span>
                                        <span className="text-[11px] text-stone-600 ml-2">
                                            {tx.createdAt
                                                ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : ''}
                                        </span>
                                    </div>
                                    <span className="font-bold text-emerald-400 text-sm">
                                        {fmt(Number(tx.total || 0))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Deep-link */}
                <a
                    href={`/owner?locationId=${locationId}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[var(--theme-accent-muted)] text-[var(--theme-accent)] font-bold text-sm hover:bg-[var(--theme-accent)]/20 transition-colors border border-[var(--theme-accent)]/20"
                >
                    <ExternalLink className="h-4 w-4" />
                    Open Full Dashboard
                </a>
            </div>
        </DrawerPanel>
    )
}
