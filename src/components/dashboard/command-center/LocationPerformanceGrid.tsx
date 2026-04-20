'use client'

import { DollarSign, Users, ArrowUpDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export interface LocationRow {
    id: string
    name: string
    status: 'active' | 'warning' | 'idle' | 'offline'
    todaySales: number
    transactions: number
    appointments?: number
    activeStaff: number
    cash: number
    card: number
    avgTicket?: number
}

interface LocationPerformanceGridProps {
    locations: LocationRow[]
    onSelectLocation?: (id: string) => void
    showAppointments?: boolean
    currency?: string
}

type SortField = 'name' | 'todaySales' | 'transactions' | 'activeStaff' | 'appointments'
type SortDir = 'asc' | 'desc'

const statusConfig = {
    active: { dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]', label: 'Active', color: 'text-emerald-400' },
    warning: { dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]', label: 'Warning', color: 'text-amber-400' },
    idle: { dot: 'bg-stone-500', label: 'Idle', color: 'text-stone-400' },
    offline: { dot: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]', label: 'Offline', color: 'text-red-400' },
}

function fmt(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

export default function LocationPerformanceGrid({
    locations,
    onSelectLocation,
    showAppointments = false,
}: LocationPerformanceGridProps) {
    const [sortField, setSortField] = useState<SortField>('todaySales')
    const [sortDir, setSortDir] = useState<SortDir>('desc')

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
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

    // Total row
    const totals = locations.reduce(
        (acc, loc) => ({
            todaySales: acc.todaySales + loc.todaySales,
            transactions: acc.transactions + loc.transactions,
            appointments: acc.appointments + (loc.appointments || 0),
            activeStaff: acc.activeStaff + loc.activeStaff,
            cash: acc.cash + loc.cash,
            card: acc.card + loc.card,
        }),
        { todaySales: 0, transactions: 0, appointments: 0, activeStaff: 0, cash: 0, card: 0 }
    )

    const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <th
            className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500 cursor-pointer hover:text-stone-300 transition-colors select-none"
            onClick={() => toggleSort(field)}
        >
            <span className="flex items-center gap-1">
                {children}
                {sortField === field && (
                    <ArrowUpDown className="h-3 w-3 text-[var(--theme-accent)]" />
                )}
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
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                        <SortHeader field="todaySales">Revenue</SortHeader>
                        <SortHeader field="transactions">Txns</SortHeader>
                        {showAppointments && <SortHeader field="appointments">Appts</SortHeader>}
                        <SortHeader field="activeStaff">Staff</SortHeader>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Cash / Card</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map(loc => {
                        const sc = statusConfig[loc.status]
                        return (
                            <tr
                                key={loc.id}
                                className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                onClick={() => onSelectLocation?.(loc.id)}
                            >
                                <td className="px-4 py-3">
                                    <span className="font-semibold text-white">{loc.name}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                        <span className={`text-xs font-semibold uppercase tracking-wide ${sc.color}`}>
                                            {sc.label}
                                        </span>
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="font-bold text-emerald-400">{fmt(loc.todaySales)}</span>
                                </td>
                                <td className="px-4 py-3 text-stone-300 font-medium">{loc.transactions}</td>
                                {showAppointments && (
                                    <td className="px-4 py-3 text-stone-300 font-medium">{loc.appointments || 0}</td>
                                )}
                                <td className="px-4 py-3">
                                    <span className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5 text-stone-500" />
                                        <span className="text-stone-300 font-medium">{loc.activeStaff}</span>
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-emerald-400 font-medium">{fmt(loc.cash)}</span>
                                        <span className="text-stone-600">/</span>
                                        <span className="text-blue-400 font-medium">{fmt(loc.card)}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)] transition-colors" />
                                </td>
                            </tr>
                        )
                    })}

                    {/* Totals row */}
                    <tr className="bg-white/[0.02] border-t border-white/[0.08]">
                        <td className="px-4 py-3 font-bold text-stone-300">Totals</td>
                        <td className="px-4 py-3"></td>
                        <td className="px-4 py-3 font-black text-emerald-400">{fmt(totals.todaySales)}</td>
                        <td className="px-4 py-3 font-bold text-stone-200">{totals.transactions}</td>
                        {showAppointments && <td className="px-4 py-3 font-bold text-stone-200">{totals.appointments}</td>}
                        <td className="px-4 py-3 font-bold text-stone-200">{totals.activeStaff}</td>
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-xs font-bold">
                                <span className="text-emerald-400">{fmt(totals.cash)}</span>
                                <span className="text-stone-600">/</span>
                                <span className="text-blue-400">{fmt(totals.card)}</span>
                            </div>
                        </td>
                        <td className="px-4 py-3"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}
