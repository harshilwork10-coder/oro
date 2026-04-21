'use client'

import { useState } from 'react'
import {
    DollarSign, Users, ArrowUpDown, ChevronRight, AlertTriangle,
    TrendingUp, TrendingDown, Package, Clock,
} from 'lucide-react'

export interface LocationRow {
    id: string
    name: string
    address?: string
    status: 'active' | 'warning' | 'idle' | 'offline'
    todaySales: number
    yesterdaySales: number
    transactions: number
    appointments?: number
    avgTicket: number
    mtdSales: number
    activeStaff: number
    onClock: number
    cash: number
    card: number
    lowStock: number
}

interface OwnerLocationGridProps {
    locations: LocationRow[]
    onSelectLocation?: (id: string) => void
    showAppointments?: boolean
}

type SortField = 'name' | 'todaySales' | 'transactions' | 'activeStaff' | 'mtdSales' | 'avgTicket'
type SortDir = 'asc' | 'desc'

const statusConfig = {
    active: {
        dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]',
        label: 'Open',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    warning: {
        dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]',
        label: 'Alert',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
    },
    idle: {
        dot: 'bg-stone-500',
        label: 'Idle',
        color: 'text-stone-400',
        bg: 'bg-stone-500/10 border-stone-500/20',
    },
    offline: {
        dot: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]',
        label: 'Offline',
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/20',
    },
}

function fmt(n: number, decimals: boolean = false): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals ? 2 : 0,
        maximumFractionDigits: decimals ? 2 : 0,
    }).format(n)
}

function pctChange(today: number, yesterday: number): { value: number; label: string } | null {
    if (yesterday <= 0) return null
    const pct = ((today - yesterday) / yesterday) * 100
    return { value: pct, label: 'vs yday' }
}

export default function OwnerLocationGrid({
    locations,
    onSelectLocation,
    showAppointments = false,
}: OwnerLocationGridProps) {
    const [sortField, setSortField] = useState<SortField>('todaySales')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortField(field)
            setSortDir('desc')
        }
    }

    const sorted = [...locations].sort((a, b) => {
        const av = a[sortField] ?? 0
        const bv = b[sortField] ?? 0
        if (typeof av === 'string' && typeof bv === 'string') {
            return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        }
        return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

    // Totals
    const totals = locations.reduce(
        (acc, loc) => ({
            todaySales: acc.todaySales + loc.todaySales,
            yesterdaySales: acc.yesterdaySales + loc.yesterdaySales,
            transactions: acc.transactions + loc.transactions,
            avgTicket: 0, // computed after
            mtdSales: acc.mtdSales + loc.mtdSales,
            activeStaff: acc.activeStaff + loc.activeStaff,
            onClock: acc.onClock + loc.onClock,
            cash: acc.cash + loc.cash,
            card: acc.card + loc.card,
            lowStock: acc.lowStock + loc.lowStock,
        }),
        {
            todaySales: 0, yesterdaySales: 0, transactions: 0, avgTicket: 0,
            mtdSales: 0, activeStaff: 0, onClock: 0, cash: 0, card: 0, lowStock: 0,
        },
    )
    totals.avgTicket = totals.transactions > 0 ? totals.todaySales / totals.transactions : 0

    const SortHeader = ({ field, children, align }: { field: SortField; children: React.ReactNode; align?: string }) => (
        <th
            className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-500 cursor-pointer hover:text-stone-300 transition-colors select-none ${
                align === 'right' ? 'text-right' : 'text-left'
            }`}
            onClick={() => toggleSort(field)}
        >
            <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                {children}
                {sortField === field && <ArrowUpDown className="h-3 w-3 text-[var(--theme-accent)]" />}
            </span>
        </th>
    )

    if (locations.length === 0) {
        return (
            <div className="text-center py-12 text-stone-500">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-stone-400">No locations found</p>
                <p className="text-xs mt-1">Location performance will appear here once stores are active</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/[0.06]">
                        <SortHeader field="name">Location</SortHeader>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Status
                        </th>
                        <SortHeader field="todaySales" align="right">Today</SortHeader>
                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Δ Y'day
                        </th>
                        <SortHeader field="avgTicket" align="right">Avg Ticket</SortHeader>
                        <SortHeader field="mtdSales" align="right">MTD</SortHeader>
                        <SortHeader field="transactions" align="right">Txns</SortHeader>
                        <SortHeader field="activeStaff" align="right">Staff</SortHeader>
                        <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-stone-500">
                            Alerts
                        </th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((loc) => {
                        const sc = statusConfig[loc.status]
                        const delta = pctChange(loc.todaySales, loc.yesterdaySales)

                        return (
                            <tr
                                key={loc.id}
                                className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                onClick={() => onSelectLocation?.(loc.id)}
                            >
                                {/* Location name */}
                                <td className="px-4 py-3">
                                    <span className="font-semibold text-white">{loc.name}</span>
                                    {loc.address && (
                                        <span className="block text-[11px] text-stone-600 mt-0.5 truncate max-w-[200px]">
                                            {loc.address}
                                        </span>
                                    )}
                                </td>

                                {/* Status badge */}
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase border ${sc.bg} ${sc.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                        {sc.label}
                                    </span>
                                </td>

                                {/* Today's Sales */}
                                <td className="px-4 py-3 text-right">
                                    <span className="font-bold text-emerald-400">{fmt(loc.todaySales)}</span>
                                </td>

                                {/* Delta vs Yesterday */}
                                <td className="px-4 py-3 text-right">
                                    {delta ? (
                                        <span
                                            className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
                                                delta.value >= 0 ? 'text-emerald-400' : 'text-red-400'
                                            }`}
                                        >
                                            {delta.value >= 0 ? (
                                                <TrendingUp className="h-3 w-3" />
                                            ) : (
                                                <TrendingDown className="h-3 w-3" />
                                            )}
                                            {delta.value >= 0 ? '+' : ''}
                                            {delta.value.toFixed(1)}%
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-stone-600">—</span>
                                    )}
                                </td>

                                {/* Avg Ticket */}
                                <td className="px-4 py-3 text-right text-stone-300 font-medium">
                                    {fmt(loc.avgTicket, true)}
                                </td>

                                {/* MTD Sales */}
                                <td className="px-4 py-3 text-right text-stone-300 font-medium">
                                    {fmt(loc.mtdSales)}
                                </td>

                                {/* Transactions */}
                                <td className="px-4 py-3 text-right text-stone-300 font-medium">
                                    {loc.transactions}
                                </td>

                                {/* Staff (on clock / total) */}
                                <td className="px-4 py-3 text-right">
                                    <span className="inline-flex items-center gap-1 text-stone-300">
                                        <Clock className="h-3 w-3 text-stone-500" />
                                        <span className="font-medium">{loc.onClock}</span>
                                        <span className="text-stone-600">/</span>
                                        <span className="text-stone-500">{loc.activeStaff}</span>
                                    </span>
                                </td>

                                {/* Alerts (low stock badge) */}
                                <td className="px-4 py-3 text-center">
                                    {loc.lowStock > 0 ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400"
                                            title={`${loc.lowStock} low stock items`}
                                        >
                                            <Package className="h-3 w-3" />
                                            {loc.lowStock}
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-stone-700">—</span>
                                    )}
                                </td>

                                {/* Chevron */}
                                <td className="px-4 py-3">
                                    <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)] transition-colors" />
                                </td>
                            </tr>
                        )
                    })}

                    {/* Totals row */}
                    <tr className="bg-white/[0.02] border-t border-white/[0.08]">
                        <td className="px-4 py-3 font-bold text-stone-300">
                            All Locations ({locations.length})
                        </td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 text-right font-black text-emerald-400">{fmt(totals.todaySales)}</td>
                        <td className="px-4 py-3 text-right">
                            {(() => {
                                const d = pctChange(totals.todaySales, totals.yesterdaySales)
                                if (!d) return <span className="text-stone-600">—</span>
                                return (
                                    <span className={`text-[11px] font-bold ${d.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {d.value >= 0 ? '+' : ''}{d.value.toFixed(1)}%
                                    </span>
                                )
                            })()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-stone-200">{fmt(totals.avgTicket, true)}</td>
                        <td className="px-4 py-3 text-right font-bold text-stone-200">{fmt(totals.mtdSales)}</td>
                        <td className="px-4 py-3 text-right font-bold text-stone-200">{totals.transactions}</td>
                        <td className="px-4 py-3 text-right font-bold text-stone-200">
                            {totals.onClock}/{totals.activeStaff}
                        </td>
                        <td className="px-4 py-3 text-center">
                            {totals.lowStock > 0 && (
                                <span className="text-[11px] font-bold text-amber-400">{totals.lowStock}</span>
                            )}
                        </td>
                        <td className="px-4 py-3"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}
