'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
    Building2, DollarSign, Users, MapPin, Shield, TrendingUp,
    AlertCircle, BarChart3, ChevronRight, Copy,
    PieChart, Crown, Rocket, ArrowUpDown, Clock, AlertTriangle,
    CheckCircle, UserPlus, Zap, Target, Flag, Activity, Layers,
    ChevronDown, ChevronUp, ExternalLink, X, Store,
    BookOpen, Megaphone, Award, ShieldCheck, Package,
    Eye, Gauge, ArrowDown, ArrowUp, TrendingDown, Percent
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import DrawerPanel from './command-center/DrawerPanel'

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

interface FranchiseeData {
    id: string
    name: string
    locationCount: number
    monthlyRevenue: number
    priorRevenue: number
    transactionCount: number
    employeeCount: number
    status: 'active' | 'warning' | 'pending'
}

interface DashboardStats {
    name: string
    brandCode?: string
    totalFranchisees: number
    totalLocations: number
    totalEmployees: number
    totalTransactions: number
    monthlyRevenue: number
    priorPeriodRevenue: number
    franchisees: FranchiseeData[]
    locationBreakdown: { active: number; pending: number; offline: number }
    pendingItems: { stationRequests: number; pendingLocations: number; underperformingFranchisees: number }
    fetchedAt: string
}

// ═══════════════════════════════════════════════════════
// Data Truth Label
// ═══════════════════════════════════════════════════════

function DataTruthLabel({ source, fetchedAt }: { source: 'live' | 'derived' | 'unavailable'; fetchedAt?: string }) {
    const config = {
        live: { dot: 'bg-emerald-500', label: 'Live', color: 'text-emerald-400' },
        derived: { dot: 'bg-amber-500', label: 'Derived', color: 'text-amber-400' },
        unavailable: { dot: 'bg-stone-600', label: 'Unavailable', color: 'text-stone-500' },
    }
    const c = config[source]
    const timeStr = fetchedAt ? new Date(fetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null

    return (
        <div className="flex items-center gap-1.5 text-[10px]">
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            <span className={`font-medium uppercase tracking-wide ${c.color}`}>{c.label}</span>
            {timeStr && <span className="text-stone-600">· {timeStr}</span>}
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Section Wrapper
// ═══════════════════════════════════════════════════════

function Section({ id, title, icon: Icon, children, badge, className = '' }: {
    id: string
    title: string
    icon: any
    children: React.ReactNode
    badge?: number
    className?: string
}) {
    return (
        <section id={id} className={`scroll-mt-28 ${className}`}>
            <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[var(--theme-accent)]" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
                {badge !== undefined && badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">
                        {badge}
                    </span>
                )}
            </div>
            {children}
        </section>
    )
}

// ═══════════════════════════════════════════════════════
// KPI Card (full-width version, 8 across)
// ═══════════════════════════════════════════════════════

interface KpiItem {
    title: string
    value: string | number
    subtitle: string
    icon: any
    variant: 'default' | 'success' | 'warning' | 'danger' | 'accent'
    trend?: { value: number; label: string }
    pulse?: boolean
    onClick?: () => void
}

const kpiVariants = {
    default: { border: 'border-white/[0.06]', iconBg: 'bg-white/[0.06]', iconColor: 'text-stone-400' },
    success: { border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
    warning: { border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
    danger: { border: 'border-red-500/20', iconBg: 'bg-red-500/10', iconColor: 'text-red-400' },
    accent: { border: 'border-[var(--theme-accent)]/20', iconBg: 'bg-[var(--theme-accent-muted)]', iconColor: 'text-[var(--theme-accent)]' },
}

function KpiStrip({ kpis, fetchedAt }: { kpis: KpiItem[]; fetchedAt?: string }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            {kpis.map((kpi, i) => {
                const v = kpiVariants[kpi.variant]
                return (
                    <div
                        key={i}
                        onClick={kpi.onClick}
                        className={`
                            relative overflow-hidden rounded-xl border p-4
                            bg-stone-900/50 backdrop-blur-md
                            transition-all duration-200 hover:scale-[1.02]
                            group ${kpi.onClick ? 'cursor-pointer' : ''}
                            ${v.border}
                        `}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${v.iconBg}`}>
                                {kpi.pulse && <span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse top-2 right-2" />}
                                <kpi.icon className={`h-4 w-4 ${v.iconColor}`} />
                            </div>
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">{kpi.title}</p>
                        <p className="text-xl font-black text-white tracking-tight leading-none">{kpi.value}</p>
                        <p className="text-[10px] text-stone-500 mt-1.5 leading-snug">{kpi.subtitle}</p>
                        {kpi.trend && (
                            <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${kpi.trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {kpi.trend.value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                <span>{kpi.trend.value >= 0 ? '+' : ''}{kpi.trend.value.toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Alert Item
// ═══════════════════════════════════════════════════════

interface AlertItem {
    id: string
    severity: 'CRITICAL' | 'WARNING' | 'INFO'
    title: string
    description: string
    locationName: string
    createdAt: string
    actionLabel?: string
    onAction?: () => void
}

// ═══════════════════════════════════════════════════════
// Action Center
// ═══════════════════════════════════════════════════════

interface ActionItem {
    category: 'rollout' | 'performance' | 'readiness' | 'escalation'
    label: string
    count: number
    severity: 'critical' | 'warning' | 'info'
    actionLabel: string
    onClick?: () => void
}

function ActionCenter({ items, fetchedAt }: { items: ActionItem[]; fetchedAt?: string }) {
    const categoryConfig = {
        rollout: { icon: Rocket, label: 'Rollout', color: 'text-blue-400', bg: 'bg-blue-500/10' },
        performance: { icon: TrendingUp, label: 'Performance', color: 'text-amber-400', bg: 'bg-amber-500/10' },
        readiness: { icon: Target, label: 'Readiness', color: 'text-violet-400', bg: 'bg-violet-500/10' },
        escalation: { icon: AlertTriangle, label: 'Escalations', color: 'text-red-400', bg: 'bg-red-500/10' },
    }

    const sevColors = {
        critical: 'bg-red-500/15 border-red-500/20 text-red-400',
        warning: 'bg-amber-500/15 border-amber-500/20 text-amber-400',
        info: 'bg-blue-500/15 border-blue-500/20 text-blue-400',
    }

    const grouped = items.reduce<Record<string, ActionItem[]>>((acc, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
    }, {})

    const hasItems = items.filter(i => i.count > 0).length > 0

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Zap className="h-4 w-4 text-[var(--theme-accent)]" />
                    <h3 className="font-bold text-white text-sm">Action Center</h3>
                    {hasItems && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">
                            {items.filter(i => i.count > 0).length} pending
                        </span>
                    )}
                </div>
                <DataTruthLabel source="live" fetchedAt={fetchedAt} />
            </div>
            <div className="overflow-y-auto max-h-[420px] scrollbar-hide">
                {!hasItems ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="font-semibold text-stone-300 text-sm">Network healthy</p>
                        <p className="text-xs text-stone-500 mt-1">No pending actions</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {Object.entries(grouped).map(([cat, catItems]) => {
                            const activeItems = catItems.filter(i => i.count > 0)
                            if (activeItems.length === 0) return null
                            const cfg = categoryConfig[cat as keyof typeof categoryConfig]
                            return (
                                <div key={cat}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <cfg.icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                                        <span className={`text-[11px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {activeItems.map((item, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors cursor-pointer group"
                                                onClick={item.onClick}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${sevColors[item.severity]}`}>
                                                        {item.count}
                                                    </span>
                                                    <span className="text-sm text-stone-300 font-medium">{item.label}</span>
                                                </div>
                                                <span className="text-[11px] font-semibold text-[var(--theme-accent)] group-hover:underline flex items-center gap-0.5">
                                                    {item.actionLabel} <ChevronRight className="h-3 w-3" />
                                                </span>
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
// Alert Rail (full-width version)
// ═══════════════════════════════════════════════════════

function AlertRail({ alerts, fetchedAt }: { alerts: AlertItem[]; fetchedAt?: string }) {
    const sevConfig = {
        CRITICAL: { dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]', hoverBg: 'hover:bg-red-500/[0.08]' },
        WARNING: { dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]', hoverBg: 'hover:bg-amber-500/[0.08]' },
        INFO: { dot: 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]', hoverBg: 'hover:bg-blue-500/[0.08]' },
    }

    const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length
    const warningCount = alerts.filter(a => a.severity === 'WARNING').length

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden h-full">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Alerts & Exceptions</h3>
                    {alerts.length > 0 && (
                        <div className="flex gap-1.5 ml-1">
                            {criticalCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/20">
                                    {criticalCount} critical
                                </span>
                            )}
                            {warningCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">
                                    {warningCount} warning
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <DataTruthLabel source="live" fetchedAt={fetchedAt} />
            </div>
            <div className="overflow-y-auto max-h-[420px] scrollbar-hide">
                {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                        </div>
                        <p className="font-semibold text-stone-300 text-sm">Network operating normally</p>
                        <p className="text-xs text-stone-500 mt-1">No anomalies detected</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {alerts.map(alert => {
                            const sev = sevConfig[alert.severity]
                            return (
                                <div key={alert.id} className={`flex items-start gap-3.5 px-5 py-3.5 transition-colors cursor-pointer ${sev.hoverBg}`}>
                                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white text-sm leading-snug">{alert.title}</p>
                                        <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{alert.description}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[11px] font-medium text-stone-500 bg-stone-800/80 px-2 py-0.5 rounded">{alert.locationName}</span>
                                        </div>
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
// Performance Tabs (inline, no routing)
// ═══════════════════════════════════════════════════════

type PerfTab = 'leaderboard' | 'at-risk' | 'financials' | 'regional'
type SortField = 'name' | 'locationCount' | 'monthlyRevenue' | 'transactionCount' | 'employeeCount'

function PerformanceSection({ stats, onSelectFranchisee }: {
    stats: DashboardStats | null
    onSelectFranchisee: (id: string) => void
}) {
    const [activeTab, setActiveTab] = useState<PerfTab>('leaderboard')
    const [sortField, setSortField] = useState<SortField>('monthlyRevenue')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    const franchisees = stats?.franchisees || []
    const totalRevenue = stats?.monthlyRevenue || 0
    const priorRevenue = stats?.priorPeriodRevenue || 0
    const delta = priorRevenue > 0 ? ((totalRevenue - priorRevenue) / priorRevenue * 100) : 0

    const toggleSort = (field: SortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('desc') }
    }

    const sorted = [...franchisees].sort((a, b) => {
        const av = a[sortField] ?? 0
        const bv = b[sortField] ?? 0
        if (typeof av === 'string' && typeof bv === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

    const atRisk = franchisees.filter(f =>
        f.status === 'warning' || (f.monthlyRevenue === 0 && f.locationCount > 0) ||
        (f.priorRevenue > 0 && f.monthlyRevenue < f.priorRevenue * 0.75)
    )

    const tabs: { id: PerfTab; label: string; icon: any; badge?: number }[] = [
        { id: 'leaderboard', label: 'Franchisee Leaderboard', icon: TrendingUp },
        { id: 'at-risk', label: 'At-Risk Locations', icon: AlertCircle, badge: atRisk.length },
        { id: 'financials', label: 'Network Financials', icon: PieChart },
        { id: 'regional', label: 'Regional Compare', icon: BarChart3 },
    ]

    const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
        <th
            className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500 cursor-pointer hover:text-stone-300 transition-colors select-none"
            onClick={() => toggleSort(field)}
        >
            <span className="flex items-center gap-1">
                {children}
                {sortField === field && <ArrowUpDown className="h-3 w-3 text-[var(--theme-accent)]" />}
            </span>
        </th>
    )

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
                {tabs.map(tab => {
                    const isActive = tab.id === activeTab
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                                isActive ? 'text-[var(--theme-accent)]' : 'text-stone-500 hover:text-stone-300'
                            }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isActive ? 'bg-[var(--theme-accent-muted)] text-[var(--theme-accent)]' : 'bg-stone-800 text-stone-400'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                            {isActive && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--theme-accent)]" />}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="p-5">
                {activeTab === 'leaderboard' && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <DataTruthLabel source="live" fetchedAt={stats?.fetchedAt} />
                            <span className="text-[11px] text-stone-500">{franchisees.length} franchisees · Last 30 days</span>
                        </div>
                        {franchisees.length === 0 ? (
                            <div className="text-center py-12 text-stone-500">
                                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="font-medium text-stone-400">No franchisees yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/[0.06]">
                                            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">#</th>
                                            <SortHeader field="name">Franchisee</SortHeader>
                                            <SortHeader field="locationCount">Locations</SortHeader>
                                            <SortHeader field="monthlyRevenue">Revenue (30d)</SortHeader>
                                            <SortHeader field="transactionCount">Txns</SortHeader>
                                            <SortHeader field="employeeCount">Staff</SortHeader>
                                            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Δ vs Prior</th>
                                            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sorted.map((f, i) => {
                                            const fDelta = f.priorRevenue > 0
                                                ? ((f.monthlyRevenue - f.priorRevenue) / f.priorRevenue * 100)
                                                : f.monthlyRevenue > 0 ? 100 : 0
                                            return (
                                                <tr
                                                    key={f.id}
                                                    className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                                    onClick={() => onSelectFranchisee(f.id)}
                                                >
                                                    <td className="px-4 py-3 text-stone-500 font-mono text-xs">{i + 1}</td>
                                                    <td className="px-4 py-3 font-semibold text-white">{f.name}</td>
                                                    <td className="px-4 py-3 text-stone-300">{f.locationCount}</td>
                                                    <td className="px-4 py-3 font-bold text-emerald-400">{formatCurrency(f.monthlyRevenue)}</td>
                                                    <td className="px-4 py-3 text-stone-300 font-medium">{f.transactionCount}</td>
                                                    <td className="px-4 py-3 text-stone-300 font-medium">{f.employeeCount}</td>
                                                    <td className="px-4 py-3">
                                                        {f.priorRevenue > 0 || f.monthlyRevenue > 0 ? (
                                                            <span className={`text-xs font-bold flex items-center gap-0.5 ${fDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                {fDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                                {fDelta >= 0 ? '+' : ''}{fDelta.toFixed(1)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-stone-600">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                                                            f.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                                                            f.status === 'warning' ? 'bg-amber-500/15 text-amber-400' :
                                                            'bg-stone-700 text-stone-400'
                                                        }`}>
                                                            {f.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)]" />
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'at-risk' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <DataTruthLabel source="derived" fetchedAt={stats?.fetchedAt} />
                            <span className="text-[11px] text-stone-500">{atRisk.length} at-risk · Revenue decline &gt;25% or $0 with active locations</span>
                        </div>
                        {atRisk.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-50" />
                                <p className="font-medium text-stone-400">No at-risk franchisees</p>
                                <p className="text-xs text-stone-500 mt-1">All franchisees are performing within expected range</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {atRisk.map(f => {
                                    const fDelta = f.priorRevenue > 0 ? ((f.monthlyRevenue - f.priorRevenue) / f.priorRevenue * 100) : -100
                                    return (
                                        <div
                                            key={f.id}
                                            onClick={() => onSelectFranchisee(f.id)}
                                            className="flex items-center justify-between p-4 rounded-xl bg-red-500/[0.04] border border-red-500/15 hover:bg-red-500/[0.08] transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                                                <div>
                                                    <p className="font-semibold text-white text-sm">{f.name}</p>
                                                    <p className="text-xs text-stone-400">{f.locationCount} locations · {f.employeeCount} staff</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-red-400">{formatCurrency(f.monthlyRevenue)}</p>
                                                    <p className="text-[10px] text-stone-500">
                                                        Prior: {formatCurrency(f.priorRevenue)} · {fDelta.toFixed(0)}%
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-red-400" />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'financials' && (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <DataTruthLabel source="live" fetchedAt={stats?.fetchedAt} />
                            <span className="text-[11px] text-stone-500">Last 30 days vs prior 30 days</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Network Revenue</p>
                                <p className="text-2xl font-black text-emerald-400">{formatCurrency(totalRevenue)}</p>
                                {delta !== 0 && (
                                    <p className={`text-[11px] mt-1 font-semibold flex items-center gap-0.5 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% vs prior
                                    </p>
                                )}
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg / Location</p>
                                <p className="text-2xl font-black text-white">
                                    {formatCurrency((stats?.totalLocations || 0) > 0 ? totalRevenue / stats!.totalLocations : 0)}
                                </p>
                                <p className="text-[11px] text-stone-500 mt-0.5">{stats?.totalLocations || 0} locations</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg / Franchisee</p>
                                <p className="text-2xl font-black text-white">
                                    {formatCurrency((stats?.totalFranchisees || 0) > 0 ? totalRevenue / stats!.totalFranchisees : 0)}
                                </p>
                                <p className="text-[11px] text-stone-500 mt-0.5">{stats?.totalFranchisees || 0} franchisees</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Transactions</p>
                                <p className="text-2xl font-black text-white">{stats?.totalTransactions || 0}</p>
                                <p className="text-[11px] text-stone-500 mt-0.5">{stats?.totalEmployees || 0} employees</p>
                            </div>
                        </div>

                        {/* Revenue bars per franchisee */}
                        {franchisees.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-stone-300 mb-3">Revenue by Franchisee</h4>
                                <div className="space-y-2">
                                    {[...franchisees].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).map(f => {
                                        const pct = totalRevenue > 0 ? (f.monthlyRevenue / totalRevenue * 100) : 0
                                        return (
                                            <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
                                                onClick={() => onSelectFranchisee(f.id)}>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-sm font-semibold text-white truncate">{f.name}</p>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                            f.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                                                            f.status === 'warning' ? 'bg-amber-500/15 text-amber-400' :
                                                            'bg-stone-700 text-stone-400'
                                                        }`}>{f.locationCount} loc</span>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                                        <div className="h-full rounded-full bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-light)] transition-all"
                                                            style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(f.monthlyRevenue)}</p>
                                                    <p className="text-[10px] text-stone-500">{pct.toFixed(0)}%</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'regional' && (
                    <div className="text-center py-12">
                        <BarChart3 className="h-10 w-10 mx-auto mb-3 text-stone-600" />
                        <p className="font-semibold text-stone-300">Regional Compare — Coming in P2</p>
                        <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                            Geographic clustering comparison. Requires location address/region data to be populated across franchisees.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Rollout Section
// ═══════════════════════════════════════════════════════

function RolloutSection({ stats }: { stats: DashboardStats | null }) {
    const pending = stats?.locationBreakdown?.pending || 0
    const stationReqs = stats?.pendingItems?.stationRequests || 0
    const total = stats?.totalLocations || 0
    const active = stats?.locationBreakdown?.active || 0
    const offline = stats?.locationBreakdown?.offline || 0
    const livePct = total > 0 ? (active / total * 100) : 0

    return (
        <div className="space-y-5">
            {/* Overview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-stone-900/50 backdrop-blur-md border border-emerald-500/20 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <MapPin className="h-4 w-4 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Live</span>
                    </div>
                    <p className="text-3xl font-black text-white">{active}<span className="text-stone-500 text-lg font-medium">/{total}</span></p>
                    <p className="text-[11px] text-stone-500 mt-1">Locations operational</p>
                </div>
                <div className={`bg-stone-900/50 backdrop-blur-md border ${pending > 0 ? 'border-amber-500/20' : 'border-white/[0.06]'} rounded-xl p-5`}>
                    <div className="flex items-center justify-between mb-2">
                        <Clock className="h-4 w-4 text-amber-400" />
                        <span className="text-[10px] font-bold text-amber-400 uppercase">Pending</span>
                    </div>
                    <p className={`text-3xl font-black ${pending > 0 ? 'text-amber-400' : 'text-stone-500'}`}>{pending}</p>
                    <p className="text-[11px] text-stone-500 mt-1">Awaiting go-live</p>
                </div>
                <div className={`bg-stone-900/50 backdrop-blur-md border ${stationReqs > 0 ? 'border-blue-500/20' : 'border-white/[0.06]'} rounded-xl p-5`}>
                    <div className="flex items-center justify-between mb-2">
                        <Store className="h-4 w-4 text-blue-400" />
                        <span className="text-[10px] font-bold text-blue-400 uppercase">Stations</span>
                    </div>
                    <p className={`text-3xl font-black ${stationReqs > 0 ? 'text-blue-400' : 'text-stone-500'}`}>{stationReqs}</p>
                    <p className="text-[11px] text-stone-500 mt-1">Device requests</p>
                </div>
                <div className={`bg-stone-900/50 backdrop-blur-md border ${offline > 0 ? 'border-red-500/20' : 'border-white/[0.06]'} rounded-xl p-5`}>
                    <div className="flex items-center justify-between mb-2">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <span className="text-[10px] font-bold text-red-400 uppercase">Offline</span>
                    </div>
                    <p className={`text-3xl font-black ${offline > 0 ? 'text-red-400' : 'text-stone-500'}`}>{offline}</p>
                    <p className="text-[11px] text-stone-500 mt-1">Suspended / deactivated</p>
                </div>
            </div>

            {/* Progress bar */}
            {total > 0 && (
                <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-white">Network Rollout Progress</p>
                        <span className="text-sm font-bold text-[var(--theme-accent)]">{livePct.toFixed(0)}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-stone-800 overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${livePct}%` }} />
                        {pending > 0 && (
                            <div className="h-full bg-amber-500/60 transition-all" style={{ width: `${total > 0 ? (pending / total * 100) : 0}%` }} />
                        )}
                        {offline > 0 && (
                            <div className="h-full bg-red-500/40 transition-all" style={{ width: `${total > 0 ? (offline / total * 100) : 0}%` }} />
                        )}
                    </div>
                    <div className="flex items-center gap-6 mt-3 text-[11px] text-stone-500">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active ({active})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Pending ({pending})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Offline ({offline})</span>
                    </div>
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Brand Operations Section
// ═══════════════════════════════════════════════════════

function BrandOperationsSection({ stats }: { stats: DashboardStats | null }) {
    const items = [
        {
            icon: Package, title: 'Catalog Consistency', status: 'gated',
            desc: 'Brand catalog sync across franchisees. Requires catalog admin data.',
        },
        {
            icon: BookOpen, title: 'Training Completion', status: 'gated',
            desc: 'Employee training and certification tracking. Requires LMS integration.',
        },
        {
            icon: Megaphone, title: 'Campaign Adoption', status: 'gated',
            desc: 'How quickly franchise locations adopt new promotions. Requires campaign service.',
        },
        {
            icon: DollarSign, title: 'Royalties Summary', status: 'gated',
            desc: 'Royalty fee calculation and collection status. Requires billing engine.',
        },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map(item => (
                <div
                    key={item.title}
                    className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-xl p-5 opacity-70"
                >
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                            <item.icon className="h-4 w-4 text-stone-500" />
                        </div>
                        <h4 className="text-sm font-bold text-stone-300">{item.title}</h4>
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed mb-3">{item.desc}</p>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-stone-500 border border-white/[0.04]">
                        <Shield className="h-3 w-3" />
                        Gated — data not yet available
                    </span>
                </div>
            ))}
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Alert Generation
// ═══════════════════════════════════════════════════════

function generateAlerts(stats: DashboardStats | null): AlertItem[] {
    if (!stats) return []
    const alerts: AlertItem[] = []
    const now = new Date().toISOString()

    stats.franchisees
        .filter(f => f.monthlyRevenue === 0 && f.locationCount > 0 && f.status !== 'pending')
        .forEach(f => {
            alerts.push({
                id: `zero-rev-${f.id}`, severity: 'CRITICAL',
                title: `${f.name} — Zero revenue (30d)`,
                description: `${f.locationCount} location(s) active but $0 revenue. Requires immediate investigation.`,
                locationName: `${f.locationCount} locations`, createdAt: now,
            })
        })

    stats.franchisees
        .filter(f => f.priorRevenue > 0 && f.monthlyRevenue < f.priorRevenue * 0.75)
        .forEach(f => {
            const decline = ((f.priorRevenue - f.monthlyRevenue) / f.priorRevenue * 100).toFixed(0)
            alerts.push({
                id: `decline-${f.id}`, severity: 'WARNING',
                title: `${f.name} — Revenue down ${decline}%`,
                description: `Revenue dropped from ${formatCurrency(f.priorRevenue)} to ${formatCurrency(f.monthlyRevenue)} period-over-period.`,
                locationName: `${f.locationCount} locations`, createdAt: now,
            })
        })

    if (stats.locationBreakdown.pending > 0) {
        alerts.push({
            id: 'pending-locations', severity: 'INFO',
            title: `${stats.locationBreakdown.pending} location(s) pending go-live`,
            description: 'Locations are registered but not yet operational.',
            locationName: 'Network', createdAt: now,
        })
    }

    return alerts
}

// ═══════════════════════════════════════════════════════
// SECTION ANCHOR BAR
// ═══════════════════════════════════════════════════════

function SectionAnchorBar({ activeSection }: { activeSection: string }) {
    const sections = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'performance', label: 'Performance', icon: TrendingUp },
        { id: 'rollout', label: 'Rollout', icon: Rocket },
        { id: 'operations', label: 'Operations', icon: Layers },
        { id: 'financials', label: 'Financials', icon: DollarSign },
    ]

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <div className="sticky top-14 z-30 bg-[var(--background)]/95 backdrop-blur-lg border-b border-white/[0.04]">
            <div className="max-w-[1800px] mx-auto px-6">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
                    {sections.map(s => {
                        const isActive = activeSection === s.id
                        return (
                            <button
                                key={s.id}
                                onClick={() => scrollTo(s.id)}
                                className={`
                                    relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium
                                    rounded-lg transition-all whitespace-nowrap
                                    ${isActive
                                        ? 'bg-[var(--theme-accent-muted)] text-[var(--theme-accent)]'
                                        : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.04]'}
                                `}
                            >
                                <s.icon className="h-3.5 w-3.5" />
                                {s.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}


// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function FranchisorCommandCenter() {
    const { data: session } = useSession()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [drawerFranchisee, setDrawerFranchisee] = useState<string | null>(null)
    const [activeSection, setActiveSection] = useState('overview')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/brand/dashboard')
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (e) {
            console.error('Franchisor dashboard error:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        const iv = setInterval(fetchData, 60000)
        return () => clearInterval(iv)
    }, [fetchData])

    // Intersection observer for section anchoring
    useEffect(() => {
        const sections = ['overview', 'performance', 'rollout', 'operations', 'financials']
        const observers = sections.map(id => {
            const el = document.getElementById(id)
            if (!el) return null
            const obs = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) setActiveSection(id)
                },
                { rootMargin: '-20% 0px -70% 0px' }
            )
            obs.observe(el)
            return obs
        })
        return () => observers.forEach(o => o?.disconnect())
    }, [stats])

    // ─── Derived data ──────────
    const alerts = generateAlerts(stats)
    const revDelta = stats?.priorPeriodRevenue && stats.priorPeriodRevenue > 0
        ? ((stats.monthlyRevenue - stats.priorPeriodRevenue) / stats.priorPeriodRevenue * 100)
        : 0

    const totalPendingActions = (stats?.pendingItems?.stationRequests || 0)
        + (stats?.pendingItems?.pendingLocations || 0)
        + (stats?.pendingItems?.underperformingFranchisees || 0)

    const actionItems: ActionItem[] = [
        { category: 'rollout', label: 'Pending go-live locations', count: stats?.pendingItems?.pendingLocations || 0, severity: 'warning', actionLabel: 'View' },
        { category: 'rollout', label: 'Station requests pending', count: stats?.pendingItems?.stationRequests || 0, severity: 'info', actionLabel: 'Review' },
        { category: 'performance', label: 'Underperforming franchisees', count: stats?.pendingItems?.underperformingFranchisees || 0, severity: 'critical', actionLabel: 'Investigate' },
        { category: 'readiness', label: 'Locations with no staff', count: stats?.locationBreakdown?.pending || 0, severity: 'warning', actionLabel: 'Assign' },
    ]

    const kpis: KpiItem[] = [
        {
            title: 'Network Revenue', value: stats?.monthlyRevenue ? formatCurrency(stats.monthlyRevenue) : '$0',
            subtitle: 'Last 30 days', icon: DollarSign, variant: 'success', pulse: true,
            trend: revDelta !== 0 ? { value: revDelta, label: 'vs prior' } : undefined,
        },
        {
            title: 'Same-Store Δ', value: revDelta !== 0 ? `${revDelta >= 0 ? '+' : ''}${revDelta.toFixed(1)}%` : '—',
            subtitle: 'Period-over-period', icon: Percent, variant: revDelta > 0 ? 'success' : revDelta < 0 ? 'danger' : 'default',
        },
        {
            title: 'Active Locations', value: `${stats?.locationBreakdown?.active || 0}`,
            subtitle: `${stats?.totalLocations || 0} total`, icon: MapPin,
            variant: (stats?.locationBreakdown?.pending || 0) > 0 ? 'warning' : 'accent',
        },
        {
            title: 'Active Franchisees', value: stats?.totalFranchisees || 0,
            subtitle: `${stats?.franchisees?.filter(f => f.status === 'active').length || 0} active`,
            icon: Users, variant: 'accent',
        },
        {
            title: 'Critical Issues', value: alerts.filter(a => a.severity === 'CRITICAL').length,
            subtitle: alerts.filter(a => a.severity === 'WARNING').length > 0
                ? `${alerts.filter(a => a.severity === 'WARNING').length} warnings` : 'All clear',
            icon: AlertCircle,
            variant: alerts.filter(a => a.severity === 'CRITICAL').length > 0 ? 'danger'
                : alerts.filter(a => a.severity === 'WARNING').length > 0 ? 'warning' : 'success',
        },
        {
            title: 'Pending Actions', value: totalPendingActions,
            subtitle: totalPendingActions > 0 ? 'Requires attention' : 'Nothing pending',
            icon: Flag, variant: totalPendingActions > 0 ? 'warning' : 'success',
        },
        {
            title: 'Go-Live Pending', value: stats?.locationBreakdown?.pending || 0,
            subtitle: 'Locations awaiting activation', icon: Rocket,
            variant: (stats?.locationBreakdown?.pending || 0) > 0 ? 'warning' : 'success',
        },
        {
            title: 'Rollout Blockers', value: (stats?.locationBreakdown?.offline || 0),
            subtitle: 'Suspended or deactivated', icon: AlertTriangle,
            variant: (stats?.locationBreakdown?.offline || 0) > 0 ? 'danger' : 'success',
        },
    ]

    const selectedFranchisee = stats?.franchisees.find(f => f.id === drawerFranchisee)

    // ─── Loading ──────────
    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--theme-accent)' }} />
                    <p className="text-sm text-stone-500">Loading network data…</p>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Section Anchor Bar */}
            <SectionAnchorBar activeSection={activeSection} />

            <div className="min-h-screen relative overflow-hidden">
                {/* Ambient glows */}
                <div className="absolute top-[-8%] right-[-4%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
                     style={{ backgroundColor: 'var(--theme-accent-muted)' }} />
                <div className="absolute bottom-[-8%] left-[-4%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none opacity-50"
                     style={{ backgroundColor: 'var(--theme-accent-muted)' }} />

                <div className="relative z-10 px-6 py-6 space-y-8 max-w-[1800px] mx-auto">

                    {/* ═══ OVERVIEW SECTION ═══ */}
                    <section id="overview" className="scroll-mt-28 space-y-6">
                        {/* Command Header - full width */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                                    <Crown className="h-5 w-5 text-violet-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-2xl font-black text-white tracking-tight">{stats?.name || 'Brand HQ'}</h1>
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border bg-violet-500/15 text-violet-400 border-violet-500/20">
                                            Franchisor HQ
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-sm text-stone-500">
                                            {stats?.totalFranchisees || 0} franchisees · {stats?.totalLocations || 0} locations
                                        </p>
                                        <span className="text-xs text-stone-600">•</span>
                                        <DataTruthLabel source="live" fetchedAt={stats?.fetchedAt} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {stats?.brandCode && (
                                    <span
                                        className="px-2.5 py-1 rounded-md bg-violet-500/15 border border-violet-500/20 text-violet-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-violet-500/25 transition-colors"
                                        onClick={() => navigator.clipboard.writeText(stats.brandCode!)}
                                        title="Click to copy brand code"
                                    >
                                        {stats.brandCode}
                                        <Copy className="h-3 w-3 opacity-50" />
                                    </span>
                                )}
                                <button
                                    onClick={fetchData}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 rounded-xl border border-white/[0.06] transition-all text-sm font-medium"
                                >
                                    <Activity className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {/* Full-width 8-KPI strip */}
                        <KpiStrip kpis={kpis} fetchedAt={stats?.fetchedAt} />

                        {/* Action + Alerts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            <div className="lg:col-span-2">
                                <ActionCenter items={actionItems} fetchedAt={stats?.fetchedAt} />
                            </div>
                            <div className="lg:col-span-3">
                                <AlertRail alerts={alerts} fetchedAt={stats?.fetchedAt} />
                            </div>
                        </div>
                    </section>

                    {/* ═══ PERFORMANCE SECTION ═══ */}
                    <Section id="performance" title="Performance" icon={TrendingUp}
                        badge={stats?.franchisees?.filter(f => f.status === 'warning').length}>
                        <PerformanceSection stats={stats} onSelectFranchisee={setDrawerFranchisee} />
                    </Section>

                    {/* ═══ ROLLOUT SECTION ═══ */}
                    <Section id="rollout" title="Rollout Pipeline" icon={Rocket}
                        badge={(stats?.locationBreakdown?.pending || 0) + (stats?.pendingItems?.stationRequests || 0)}>
                        <RolloutSection stats={stats} />
                    </Section>

                    {/* ═══ OPERATIONS SECTION ═══ */}
                    <Section id="operations" title="Brand Operations" icon={Layers}>
                        <BrandOperationsSection stats={stats} />
                    </Section>

                    {/* ═══ FINANCIALS SECTION (anchor target — scrolls to Performance > financials tab) ═══ */}
                    <section id="financials" className="scroll-mt-28">
                        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <DollarSign className="h-4 w-4 text-emerald-400" />
                                    <h3 className="font-bold text-white text-sm">Financial Summary</h3>
                                </div>
                                <DataTruthLabel source="live" fetchedAt={stats?.fetchedAt} />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Current Period</p>
                                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Prior Period</p>
                                    <p className="text-2xl font-black text-stone-400">{formatCurrency(stats?.priorPeriodRevenue || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Total Transactions</p>
                                    <p className="text-2xl font-black text-white">{stats?.totalTransactions || 0}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Total Employees</p>
                                    <p className="text-2xl font-black text-white">{stats?.totalEmployees || 0}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Bottom spacer */}
                    <div className="h-8" />
                </div>
            </div>

            {/* ═══ Franchisee Detail Drawer ═══ */}
            <DrawerPanel
                open={!!drawerFranchisee}
                onClose={() => setDrawerFranchisee(null)}
                title={selectedFranchisee?.name || 'Franchisee'}
                subtitle="30-day performance overview"
                width="xl"
            >
                {selectedFranchisee && (() => {
                    const f = selectedFranchisee
                    const fDelta = f.priorRevenue > 0
                        ? ((f.monthlyRevenue - f.priorRevenue) / f.priorRevenue * 100) : 0

                    return (
                        <div className="space-y-5">
                            {/* Status banner */}
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                                f.status === 'active' ? 'bg-emerald-500/[0.06] border-emerald-500/20' :
                                f.status === 'warning' ? 'bg-amber-500/[0.06] border-amber-500/20' :
                                'bg-stone-800 border-white/[0.06]'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                    f.status === 'active' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' :
                                    f.status === 'warning' ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]' :
                                    'bg-stone-500'
                                }`} />
                                <span className={`text-sm font-semibold uppercase ${
                                    f.status === 'active' ? 'text-emerald-400' :
                                    f.status === 'warning' ? 'text-amber-400' : 'text-stone-400'
                                }`}>{f.status}</span>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Revenue</p>
                                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(f.monthlyRevenue)}</p>
                                    {fDelta !== 0 && (
                                        <p className={`text-[11px] mt-1 font-semibold ${fDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {fDelta >= 0 ? '+' : ''}{fDelta.toFixed(1)}% vs prior
                                        </p>
                                    )}
                                </div>
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Locations</p>
                                    <p className="text-2xl font-black text-white">{f.locationCount}</p>
                                </div>
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Transactions</p>
                                    <p className="text-2xl font-black text-white">{f.transactionCount}</p>
                                </div>
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Employees</p>
                                    <p className="text-2xl font-black text-white">{f.employeeCount}</p>
                                </div>
                            </div>

                            {/* Period comparison */}
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">Period Comparison</p>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-stone-500">Current (30d)</p>
                                        <p className="text-lg font-bold text-white">{formatCurrency(f.monthlyRevenue)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-stone-500">Prior (30d)</p>
                                        <p className="text-lg font-bold text-stone-400">{formatCurrency(f.priorRevenue)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })()}
            </DrawerPanel>
        </>
    )
}
