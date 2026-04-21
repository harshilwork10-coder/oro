'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    DollarSign, TrendingUp, Users, Scissors, Armchair, BarChart3,
    AlertTriangle, Zap, ChevronRight, CheckCircle, Clock, ShoppingBag,
    Target, Heart, UserCheck, Repeat, AlertCircle, Package, ArrowUpDown,
    Calendar, PieChart, Star,
} from 'lucide-react'

import DashboardShell from './command-center/DashboardShell'
import CommandHeader from './command-center/CommandHeader'
import KpiStrip from './command-center/KpiStrip'
import AlertRail from './command-center/AlertRail'
import type { ExceptionItem } from './command-center/AlertRail'
import WorkspaceTabs from './command-center/WorkspaceTabs'
import DrawerPanel from './command-center/DrawerPanel'
import DataTruthLabel from './command-center/DataTruthLabel'
import type { DataTruthMeta } from './command-center/DataTruthLabel'

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

interface SummaryData {
    revenue: number; priorRevenue: number; revDelta: number
    totalTransactions: number; avgTicket: number
    totalLocations: number; totalStylists: number; totalChairs: number
}
interface UtilizationData {
    chairUtilization: number; bookedHours: number; totalChairHours: number
    completedAppointments: number; noShows: number; noShowRate: number
}
interface RetentionData {
    totalUniqueClients: number; repeatClients: number; repeatPct: number
    rebookingRate: number; futureBookings: number
}
interface ServiceMixData {
    serviceRevenue: number; productRevenue: number
    servicePct: number; productPct: number
    topServices: { name: string; revenue: number; count: number }[]
}
interface MarginData {
    productCost: number; productMarginRevenue: number; productMarginPct: number
}
interface RetailData {
    lowStockCount: number; productRevenue: number
    lowStockItems: { id: string; name: string; stock: number; reorderPoint: number | null; price: number }[]
}
interface StylistRow {
    id: string; name: string; revenue: number; services: number; avgTicket: number
}
interface LocationBreakdown {
    id: string; name: string; revenue: number; appointments: number
    chairs: number; chairUtilization: number; transactions: number
}
interface DashboardData {
    summary: SummaryData; utilization: UtilizationData; retention: RetentionData
    serviceMix: ServiceMixData; margins: MarginData; retail: RetailData
    stylistProductivity: StylistRow[]; locationBreakdown: LocationBreakdown[]
    activeExceptions: number; fetchedAt: string
}

// ═══════════════════════════════════════════════════════
// Format helpers
// ═══════════════════════════════════════════════════════

function fmt(n: number): string {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtDec(n: number): string {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function pct(n: number): string {
    return `${n.toFixed(1)}%`
}

// ═══════════════════════════════════════════════════════
// Action Center — salon-specific
// ═══════════════════════════════════════════════════════

function SalonActionCenter({ data }: { data: DashboardData | null }) {
    if (!data) return null

    interface ActionItem {
        category: 'revenue' | 'retention' | 'operations' | 'inventory'
        label: string; count: number; severity: 'critical' | 'warning' | 'info'
        actionLabel: string; href?: string
    }

    const items: ActionItem[] = [
        { category: 'revenue', label: 'Chair utilization below 60%', count: data.utilization.chairUtilization < 60 ? 1 : 0, severity: 'warning', actionLabel: 'Fill slots', href: '/owner/appointments' },
        { category: 'revenue', label: 'Stylists with <$500 revenue', count: data.stylistProductivity.filter(s => s.revenue < 500).length, severity: 'warning', actionLabel: 'Review', href: '/owner/employees' },
        { category: 'retention', label: 'Repeat rate below 40%', count: data.retention.repeatPct < 40 ? 1 : 0, severity: 'critical', actionLabel: 'Retention plan', href: '/owner/reports' },
        { category: 'retention', label: 'Rebooking rate below 30%', count: data.retention.rebookingRate < 30 ? 1 : 0, severity: 'warning', actionLabel: 'Set reminders', href: '/owner/settings' },
        { category: 'operations', label: 'No-shows this period', count: data.utilization.noShows, severity: data.utilization.noShowRate > 10 ? 'critical' : 'info', actionLabel: 'View', href: '/owner/appointments' },
        { category: 'operations', label: 'Active exceptions', count: data.activeExceptions, severity: 'warning', actionLabel: 'Review', href: '/owner/store-health' },
        { category: 'inventory', label: 'Low-stock products', count: data.retail.lowStockCount, severity: data.retail.lowStockCount > 5 ? 'critical' : 'warning', actionLabel: 'Reorder', href: '/owner/inventory' },
    ]

    const categoryConfig = {
        revenue: { icon: TrendingUp, label: 'Revenue & Growth', color: 'text-emerald-400' },
        retention: { icon: Heart, label: 'Retention', color: 'text-rose-400' },
        operations: { icon: AlertCircle, label: 'Operations', color: 'text-amber-400' },
        inventory: { icon: Package, label: 'Inventory', color: 'text-blue-400' },
    }

    const sevColors = {
        critical: 'bg-red-500/10 border-red-500/20 text-red-400',
        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    }

    const grouped = items.reduce<Record<string, ActionItem[]>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
    }, {})

    const hasItems = items.filter(i => i.count > 0).length > 0

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Zap className="h-4 w-4 text-[var(--theme-accent)]" />
                    <h3 className="font-bold text-white text-sm">Action Center</h3>
                    {hasItems && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">
                            {items.filter(i => i.count > 0).length} items
                        </span>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] scrollbar-hide">
                {!hasItems ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                            <CheckCircle className="h-7 w-7 text-emerald-500" />
                        </div>
                        <p className="font-semibold text-stone-300 text-sm">Salon running smoothly</p>
                        <p className="text-xs text-stone-500 mt-1">No blockers, utilization healthy, retention on track</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {Object.entries(grouped).map(([cat, catItems]) => {
                            const active = catItems.filter(i => i.count > 0)
                            if (active.length === 0) return null
                            const cfg = categoryConfig[cat as keyof typeof categoryConfig]
                            return (
                                <div key={cat}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {active.map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${sevColors[item.severity]}`}>
                                                        {item.count}
                                                    </span>
                                                    <span className="text-sm text-stone-300 font-medium">{item.label}</span>
                                                </div>
                                                {item.href ? (
                                                    <Link href={item.href} className="text-[11px] font-semibold text-[var(--theme-accent)] hover:underline flex items-center gap-0.5">
                                                        {item.actionLabel} <ChevronRight className="h-3 w-3" />
                                                    </Link>
                                                ) : (
                                                    <span className="text-[11px] font-semibold text-[var(--theme-accent)] group-hover:underline flex items-center gap-0.5">
                                                        {item.actionLabel} <ChevronRight className="h-3 w-3" />
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Performance Snapshot Widget (above tabs)
// ═══════════════════════════════════════════════════════

function PerformanceSnapshot({ data }: { data: DashboardData }) {
    const s = data.summary
    const u = data.utilization
    const r = data.retention
    const m = data.margins

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-[var(--theme-accent)]" />
                    <h3 className="font-bold text-white text-sm">Performance Snapshot</h3>
                </div>
                <span className="text-[11px] text-stone-500">Last 30 days vs prior 30 days</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                    <p className={`text-2xl font-black ${s.revDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {s.revDelta >= 0 ? '+' : ''}{pct(s.revDelta)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">Revenue Δ</p>
                </div>
                <div className="text-center">
                    <p className={`text-2xl font-black ${u.chairUtilization >= 60 ? 'text-emerald-400' : u.chairUtilization >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                        {pct(u.chairUtilization)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">Chair Utilization</p>
                </div>
                <div className="text-center">
                    <p className={`text-2xl font-black ${r.repeatPct >= 40 ? 'text-emerald-400' : r.repeatPct >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                        {pct(r.repeatPct)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">Repeat Customers</p>
                </div>
                <div className="text-center">
                    <p className={`text-2xl font-black ${r.rebookingRate >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {pct(r.rebookingRate)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">Rebooking Rate</p>
                </div>
                <div className="text-center">
                    <p className={`text-2xl font-black ${m.productMarginPct >= 40 ? 'text-emerald-400' : m.productMarginPct >= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                        {pct(m.productMarginPct)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">Product Margin</p>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Stylist Productivity Tab
// ═══════════════════════════════════════════════════════

function StylistProductivityTab({ stylists, onSelect }: { stylists: StylistRow[]; onSelect: (id: string) => void }) {
    const [sortField, setSortField] = useState<'revenue' | 'services' | 'avgTicket'>('revenue')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('desc') }
    }

    const sorted = [...stylists].sort((a, b) =>
        sortDir === 'asc' ? (a[sortField] as number) - (b[sortField] as number) : (b[sortField] as number) - (a[sortField] as number),
    )

    if (stylists.length === 0) {
        return (
            <div className="text-center py-12 text-stone-500">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-stone-400">No stylist data yet</p>
                <p className="text-xs mt-1">Service revenue will be attributed to stylists once transactions are recorded</p>
            </div>
        )
    }

    const SortHeader = ({ field, children }: { field: typeof sortField; children: React.ReactNode }) => (
        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500 cursor-pointer hover:text-stone-300 transition-colors select-none"
            onClick={() => toggleSort(field)}>
            <span className="flex items-center gap-1">
                {children}
                {sortField === field && <ArrowUpDown className="h-3 w-3 text-[var(--theme-accent)]" />}
            </span>
        </th>
    )

    const topRevenue = sorted[0]?.revenue || 1

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/[0.06]">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">#</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Stylist</th>
                        <SortHeader field="revenue">Revenue</SortHeader>
                        <SortHeader field="services">Services</SortHeader>
                        <SortHeader field="avgTicket">Avg Ticket</SortHeader>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Performance</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((s, i) => (
                        <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                            onClick={() => onSelect(s.id)}>
                            <td className="px-4 py-3 text-stone-500 font-mono text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-semibold text-white">
                                <div className="flex items-center gap-2">
                                    {i === 0 && <Star className="h-3.5 w-3.5 text-amber-400" />}
                                    {s.name}
                                </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-400">{fmt(s.revenue)}</td>
                            <td className="px-4 py-3 text-stone-300 font-medium">{s.services}</td>
                            <td className="px-4 py-3 text-stone-300 font-medium">{fmtDec(s.avgTicket)}</td>
                            <td className="px-4 py-3">
                                <div className="w-24 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-light)] transition-all"
                                        style={{ width: `${(s.revenue / topRevenue) * 100}%` }} />
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)]" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Service Mix Tab
// ═══════════════════════════════════════════════════════

function ServiceMixTab({ mix }: { mix: ServiceMixData }) {
    const totalRevenue = mix.serviceRevenue + mix.productRevenue

    return (
        <div className="space-y-5">
            {/* Service vs Product split */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <Scissors className="h-4 w-4 text-violet-400" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Service Revenue</p>
                    </div>
                    <p className="text-2xl font-black text-violet-400">{fmt(mix.serviceRevenue)}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{pct(mix.servicePct)} of total</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <ShoppingBag className="h-4 w-4 text-blue-400" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Retail Revenue</p>
                    </div>
                    <p className="text-2xl font-black text-blue-400">{fmt(mix.productRevenue)}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{pct(mix.productPct)} of total</p>
                </div>
            </div>

            {/* Revenue bar */}
            {totalRevenue > 0 && (
                <div className="h-3 rounded-full bg-stone-800 overflow-hidden flex">
                    <div className="h-full bg-violet-500 rounded-l-full transition-all" style={{ width: `${mix.servicePct}%` }} />
                    <div className="h-full bg-blue-500 rounded-r-full transition-all" style={{ width: `${mix.productPct}%` }} />
                </div>
            )}

            {/* Top services */}
            {mix.topServices.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-stone-300 mb-3">Top Services by Revenue</h4>
                    <div className="space-y-2">
                        {mix.topServices.map((s, i) => {
                            const barPct = mix.serviceRevenue > 0 ? (s.revenue / mix.serviceRevenue * 100) : 0
                            return (
                                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                    <span className="text-xs font-mono text-stone-500 w-6">{i + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400">
                                                {s.count}×
                                            </span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all"
                                                style={{ width: `${barPct}%` }} />
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-emerald-400">{fmt(s.revenue)}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Retention & Rebooking Tab
// ═══════════════════════════════════════════════════════

function RetentionTab({ retention, utilization }: { retention: RetentionData; utilization: UtilizationData }) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="h-4 w-4 text-rose-400" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Unique Clients</p>
                    </div>
                    <p className="text-2xl font-black text-white">{retention.totalUniqueClients}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <Repeat className="h-4 w-4 text-emerald-400" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Repeat Clients</p>
                    </div>
                    <p className="text-2xl font-black text-emerald-400">{retention.repeatClients}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{pct(retention.repeatPct)} of total</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Rebooking Rate</p>
                    </div>
                    <p className={`text-2xl font-black ${retention.rebookingRate >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {pct(retention.rebookingRate)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{retention.futureBookings} future booked</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">No-Show Rate</p>
                    </div>
                    <p className={`text-2xl font-black ${utilization.noShowRate > 10 ? 'text-red-400' : utilization.noShowRate > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {pct(utilization.noShowRate)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{utilization.noShows} no-shows</p>
                </div>
            </div>

            {/* Retention health bar */}
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-3">Retention Health</p>
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-stone-400">Repeat Rate</span>
                            <span className={retention.repeatPct >= 40 ? 'text-emerald-400' : 'text-amber-400'}>{pct(retention.repeatPct)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${retention.repeatPct >= 40 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(retention.repeatPct, 100)}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-stone-400">Rebooking</span>
                            <span className={retention.rebookingRate >= 30 ? 'text-emerald-400' : 'text-amber-400'}>{pct(retention.rebookingRate)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${retention.rebookingRate >= 30 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${Math.min(retention.rebookingRate, 100)}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Retail & Inventory Tab
// ═══════════════════════════════════════════════════════

function RetailTab({ retail, margins }: { retail: RetailData; margins: MarginData }) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Retail Revenue</p>
                    <p className="text-2xl font-black text-blue-400">{fmt(retail.productRevenue)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Product Margin</p>
                    <p className={`text-2xl font-black ${margins.productMarginPct >= 40 ? 'text-emerald-400' : margins.productMarginPct >= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                        {pct(margins.productMarginPct)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{fmt(margins.productMarginRevenue - margins.productCost)} profit</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Low Stock</p>
                    <p className={`text-2xl font-black ${retail.lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {retail.lowStockCount}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">items below reorder</p>
                </div>
            </div>

            {retail.lowStockItems.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-stone-300 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        Revenue Blockers — Low Stock
                    </h4>
                    <div className="space-y-1.5">
                        {retail.lowStockItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                        item.stock === 0 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                    }`}>
                                        {item.stock} left
                                    </span>
                                    <span className="text-sm text-stone-300 font-medium">{item.name}</span>
                                </div>
                                <span className="text-xs text-stone-500">{fmtDec(item.price)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3">
                        <Link href="/owner/inventory" className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                            Manage Inventory →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Location Performance Tab
// ═══════════════════════════════════════════════════════

function LocationPerformanceTab({ locations }: { locations: LocationBreakdown[] }) {
    if (locations.length === 0) {
        return (
            <div className="text-center py-12 text-stone-500">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-stone-400">No location data</p>
            </div>
        )
    }

    const topRev = Math.max(...locations.map(l => l.revenue), 1)

    return (
        <div className="space-y-3">
            {locations.sort((a, b) => b.revenue - a.revenue).map((loc, i) => (
                <div key={loc.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-colors">
                    <span className="text-xs font-mono text-stone-500 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-white truncate">{loc.name}</p>
                            <p className="text-sm font-bold text-emerald-400">{fmt(loc.revenue)}</p>
                        </div>
                        <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden mb-1.5">
                            <div className="h-full rounded-full bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-light)] transition-all"
                                style={{ width: `${(loc.revenue / topRev) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-stone-500">
                            <span>{loc.appointments} appts</span>
                            <span>{loc.chairs} chairs</span>
                            <span className={loc.chairUtilization >= 60 ? 'text-emerald-400' : loc.chairUtilization >= 40 ? 'text-amber-400' : 'text-red-400'}>
                                {pct(loc.chairUtilization)} utilization
                            </span>
                            <span>{loc.transactions} txns</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Alert generation
// ═══════════════════════════════════════════════════════

function generateAlerts(data: DashboardData | null): ExceptionItem[] {
    if (!data) return []
    const alerts: ExceptionItem[] = []
    const now = new Date().toISOString()

    if (data.utilization.chairUtilization < 40) {
        alerts.push({ id: 'low-util', type: 'UTILIZATION', severity: 'CRITICAL', title: `Chair utilization critically low: ${pct(data.utilization.chairUtilization)}`,
            description: `Only ${data.utilization.bookedHours.toFixed(0)}h of ${data.utilization.totalChairHours}h available chair-hours booked. Revenue is being left on the table.`,
            locationName: 'All locations', createdAt: now })
    } else if (data.utilization.chairUtilization < 60) {
        alerts.push({ id: 'med-util', type: 'UTILIZATION', severity: 'WARNING', title: `Chair utilization below target: ${pct(data.utilization.chairUtilization)}`,
            description: 'Consider promotions or extended hours to fill open slots.',
            locationName: 'All locations', createdAt: now })
    }

    if (data.retention.repeatPct < 30) {
        alerts.push({ id: 'low-repeat', type: 'RETENTION', severity: 'CRITICAL', title: `Repeat rate critically low: ${pct(data.retention.repeatPct)}`,
            description: `Only ${data.retention.repeatClients} of ${data.retention.totalUniqueClients} clients returned. Investigate service quality and follow-up.`,
            locationName: 'Client base', createdAt: now })
    }

    if (data.utilization.noShowRate > 10) {
        alerts.push({ id: 'noshow', type: 'NO_SHOW', severity: 'WARNING', title: `High no-show rate: ${pct(data.utilization.noShowRate)}`,
            description: `${data.utilization.noShows} no-shows in 30 days. Consider deposit requirements or confirmation reminders.`,
            locationName: 'All locations', createdAt: now })
    }

    if (data.retail.lowStockCount > 0) {
        alerts.push({ id: 'lowstock', type: 'INVENTORY', severity: 'WARNING', title: `${data.retail.lowStockCount} product(s) at or below reorder point`,
            description: 'Low stock items may block retail sales. Review and reorder.',
            locationName: 'Inventory', createdAt: now })
    }

    if (data.summary.revDelta < -15) {
        alerts.push({ id: 'rev-decline', type: 'REVENUE', severity: 'CRITICAL', title: `Revenue down ${Math.abs(data.summary.revDelta).toFixed(0)}% vs prior period`,
            description: `Revenue dropped from ${fmt(data.summary.priorRevenue)} to ${fmt(data.summary.revenue)}. Investigate root cause.`,
            locationName: 'All locations', createdAt: now })
    }

    if (data.margins.productMarginPct < 20 && data.margins.productMarginRevenue > 0) {
        alerts.push({ id: 'low-margin', type: 'MARGIN', severity: 'WARNING', title: `Product margin below 20%: ${pct(data.margins.productMarginPct)}`,
            description: 'Review product pricing vs cost to improve profitability.',
            locationName: 'Retail', createdAt: now })
    }

    return alerts
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function IndependentOwnerDashboard() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [drawerStylist, setDrawerStylist] = useState<string | null>(null)

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/dashboard/independent-owner')
            if (res.ok) {
                const json = await res.json()
                setData(json)
            }
        } catch (e) {
            console.error('Independent owner dashboard error:', e)
        }
        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => {
        fetchData()
        const iv = setInterval(() => fetchData(true), 60000)
        return () => clearInterval(iv)
    }, [fetchData])

    const alerts = generateAlerts(data)
    const selectedStylist = data?.stylistProductivity.find(s => s.id === drawerStylist)

    const meta: DataTruthMeta | null = data?.fetchedAt ? {
        queriedAt: data.fetchedAt,
        freshness: 'live',
        source: 'primary_db',
        businessDayCutoff: 'real-time',
        note: 'Last 30 days vs prior 30 days',
    } : null

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--theme-accent)' }} />
            </div>
        )
    }

    const s = data?.summary
    const u = data?.utilization

    return (
        <>
            <DashboardShell
                header={
                    <CommandHeader
                        title="Salon Command Center"
                        subtitle={`${s?.totalLocations || 0} locations · ${s?.totalStylists || 0} stylists · ${s?.totalChairs || 0} chairs`}
                        icon={Scissors}
                        roleBadge="Independent Owner"
                        roleBadgeColor="bg-rose-500/15 text-rose-400 border-rose-500/20"
                        onRefresh={() => fetchData(true)}
                        refreshing={refreshing}
                    >
                        <DataTruthLabel meta={meta} />
                    </CommandHeader>
                }
                kpiStrip={
                    <KpiStrip
                        columns={6}
                        kpis={[
                            {
                                title: 'Revenue (30d)',
                                value: s?.revenue ? fmt(s.revenue) : '$0',
                                subtitle: s?.revDelta ? `${s.revDelta >= 0 ? '+' : ''}${s.revDelta.toFixed(1)}% vs prior` : 'No prior data',
                                icon: DollarSign,
                                variant: (s?.revDelta ?? 0) >= 0 ? 'success' : 'danger',
                                pulse: true,
                                trend: s?.revDelta ? { value: s.revDelta, label: 'vs prior 30d' } : undefined,
                            },
                            {
                                title: 'Chair Utilization',
                                value: u ? pct(u.chairUtilization) : '—',
                                subtitle: `${u?.completedAppointments || 0} completed appts`,
                                icon: Armchair,
                                variant: (u?.chairUtilization ?? 0) >= 60 ? 'success' : (u?.chairUtilization ?? 0) >= 40 ? 'warning' : 'danger',
                            },
                            {
                                title: 'Avg Ticket',
                                value: s?.avgTicket ? fmtDec(s.avgTicket) : '—',
                                subtitle: `${s?.totalTransactions || 0} transactions`,
                                icon: TrendingUp,
                                variant: 'accent',
                            },
                            {
                                title: 'Repeat Rate',
                                value: data?.retention ? pct(data.retention.repeatPct) : '—',
                                subtitle: `${data?.retention.repeatClients || 0} returning clients`,
                                icon: Heart,
                                variant: (data?.retention.repeatPct ?? 0) >= 40 ? 'success' : (data?.retention.repeatPct ?? 0) >= 25 ? 'warning' : 'danger',
                            },
                            {
                                title: 'Rebooking',
                                value: data?.retention ? pct(data.retention.rebookingRate) : '—',
                                subtitle: `${data?.retention.futureBookings || 0} future booked`,
                                icon: Repeat,
                                variant: (data?.retention.rebookingRate ?? 0) >= 30 ? 'success' : 'warning',
                            },
                            {
                                title: 'Product Margin',
                                value: data?.margins ? pct(data.margins.productMarginPct) : '—',
                                subtitle: data?.retail.lowStockCount ? `${data.retail.lowStockCount} low stock` : 'Stock OK',
                                icon: ShoppingBag,
                                variant: (data?.margins.productMarginPct ?? 0) >= 40 ? 'success' : (data?.margins.productMarginPct ?? 0) >= 20 ? 'warning' : 'danger',
                            },
                        ]}
                    />
                }
                alertRail={
                    <AlertRail
                        exceptions={alerts}
                        emptyTitle="Salon operating smoothly"
                        emptySubtitle="No utilization, retention, inventory, or revenue anomalies detected"
                    />
                }
                quickActions={
                    <SalonActionCenter data={data} />
                }
                workspace={
                    <>
                        {data && <PerformanceSnapshot data={data} />}

                        <WorkspaceTabs
                            tabs={[
                                {
                                    id: 'stylists',
                                    label: 'Stylist Productivity',
                                    icon: Users,
                                    content: (
                                        <StylistProductivityTab
                                            stylists={data?.stylistProductivity || []}
                                            onSelect={setDrawerStylist}
                                        />
                                    ),
                                },
                                {
                                    id: 'services',
                                    label: 'Service Mix',
                                    icon: PieChart,
                                    content: <ServiceMixTab mix={data?.serviceMix || { serviceRevenue: 0, productRevenue: 0, servicePct: 0, productPct: 0, topServices: [] }} />,
                                },
                                {
                                    id: 'retention',
                                    label: 'Retention & Rebooking',
                                    icon: Heart,
                                    content: (
                                        <RetentionTab
                                            retention={data?.retention || { totalUniqueClients: 0, repeatClients: 0, repeatPct: 0, rebookingRate: 0, futureBookings: 0 }}
                                            utilization={data?.utilization || { chairUtilization: 0, bookedHours: 0, totalChairHours: 0, completedAppointments: 0, noShows: 0, noShowRate: 0 }}
                                        />
                                    ),
                                },
                                {
                                    id: 'retail',
                                    label: 'Retail & Inventory',
                                    icon: ShoppingBag,
                                    badge: (data?.retail.lowStockCount || 0) > 0 ? data?.retail.lowStockCount : undefined,
                                    content: (
                                        <RetailTab
                                            retail={data?.retail || { lowStockCount: 0, productRevenue: 0, lowStockItems: [] }}
                                            margins={data?.margins || { productCost: 0, productMarginRevenue: 0, productMarginPct: 0 }}
                                        />
                                    ),
                                },
                                {
                                    id: 'locations',
                                    label: 'Location Performance',
                                    icon: BarChart3,
                                    content: <LocationPerformanceTab locations={data?.locationBreakdown || []} />,
                                },
                            ]}
                        />
                    </>
                }
            />

            {/* ═══ Stylist Detail Drawer ═══ */}
            <DrawerPanel
                open={!!drawerStylist}
                onClose={() => setDrawerStylist(null)}
                title={selectedStylist?.name || 'Stylist'}
                subtitle="30-day performance"
            >
                {selectedStylist && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Revenue</p>
                                <p className="text-2xl font-black text-emerald-400">{fmt(selectedStylist.revenue)}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Services</p>
                                <p className="text-2xl font-black text-white">{selectedStylist.services}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg Ticket</p>
                                <p className="text-2xl font-black text-white">{fmtDec(selectedStylist.avgTicket)}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Rank</p>
                                <p className="text-2xl font-black text-violet-400">
                                    #{(data?.stylistProductivity.findIndex(s => s.id === selectedStylist.id) ?? 0) + 1}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Link href="/owner/employees" className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors group">
                                <span className="text-sm font-medium text-stone-300">View Full Profile</span>
                                <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)]" />
                            </Link>
                            <Link href="/owner/reports" className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors group">
                                <span className="text-sm font-medium text-stone-300">Commission Reports</span>
                                <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)]" />
                            </Link>
                        </div>
                    </div>
                )}
            </DrawerPanel>
        </>
    )
}
