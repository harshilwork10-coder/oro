'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    Building2, DollarSign, Users, MapPin, Shield, TrendingUp,
    AlertCircle, BarChart3, Settings, ChevronRight, Copy,
    PieChart, Crown, Rocket, ArrowUpDown, Clock, AlertTriangle,
    CheckCircle, UserPlus, Zap, Target, Flag
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

import DashboardShell from './command-center/DashboardShell'
import CommandHeader from './command-center/CommandHeader'
import KpiStrip from './command-center/KpiStrip'
import AlertRail from './command-center/AlertRail'
import type { ExceptionItem } from './command-center/AlertRail'
import WorkspaceTabs from './command-center/WorkspaceTabs'
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
// Action Center (replaces QuickActionsPanel)
// ═══════════════════════════════════════════════════════

interface ActionItem {
    category: 'rollout' | 'performance' | 'readiness' | 'escalation'
    label: string
    count: number
    severity: 'critical' | 'warning' | 'info'
    actionLabel: string
    href?: string
    onClick?: () => void
}

function ActionCenter({ items, fetchedAt }: { items: ActionItem[]; fetchedAt?: string }) {
    const categoryConfig = {
        rollout: { icon: Rocket, label: 'Rollout', color: 'text-blue-400' },
        performance: { icon: TrendingUp, label: 'Performance', color: 'text-amber-400' },
        readiness: { icon: Target, label: 'Readiness', color: 'text-violet-400' },
        escalation: { icon: AlertTriangle, label: 'Escalations', color: 'text-red-400' },
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
                            {items.filter(i => i.count > 0).length} pending
                        </span>
                    )}
                </div>
                <DataTruthLabel source={hasItems ? 'live' : 'live'} fetchedAt={fetchedAt} />
            </div>
            <div className="flex-1 overflow-y-auto max-h-[360px] scrollbar-hide">
                {!hasItems ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                            <CheckCircle className="h-7 w-7 text-emerald-500" />
                        </div>
                        <p className="font-semibold text-stone-300 text-sm">Network healthy</p>
                        <p className="text-xs text-stone-500 mt-1">No pending actions or interventions required</p>
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
// Rollout Summary (P0-lite above-fold widget)
// ═══════════════════════════════════════════════════════

function RolloutSummary({ stats }: { stats: DashboardStats | null }) {
    const pending = stats?.locationBreakdown?.pending || 0
    const stationReqs = stats?.pendingItems?.stationRequests || 0
    const total = stats?.totalLocations || 0
    const active = stats?.locationBreakdown?.active || 0

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-blue-400" />
                    <h3 className="font-bold text-white text-sm">Rollout Pipeline</h3>
                </div>
                <DataTruthLabel source="live" fetchedAt={stats?.fetchedAt} />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="text-2xl font-black text-white">{active}<span className="text-stone-500 text-lg font-medium">/{total}</span></p>
                    <p className="text-[11px] text-stone-500 mt-1">Locations Live</p>
                </div>
                <div className="text-center">
                    <p className={`text-2xl font-black ${pending > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{pending}</p>
                    <p className="text-[11px] text-stone-500 mt-1">Pending Go-Live</p>
                </div>
                <div className="text-center">
                    <p className={`text-2xl font-black ${stationReqs > 0 ? 'text-blue-400' : 'text-stone-500'}`}>{stationReqs}</p>
                    <p className="text-[11px] text-stone-500 mt-1">Station Requests</p>
                </div>
            </div>
            {(pending > 0 || stationReqs > 0) && (
                <div className="mt-4 h-2 rounded-full bg-stone-800 overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${total > 0 ? (active / total * 100) : 0}%` }} />
                    <div className="h-full bg-amber-500/60 rounded-r-full transition-all" style={{ width: `${total > 0 ? (pending / total * 100) : 0}%` }} />
                </div>
            )}
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Franchisee Leaderboard
// ═══════════════════════════════════════════════════════

type SortField = 'name' | 'locationCount' | 'monthlyRevenue' | 'transactionCount' | 'employeeCount'

function FranchiseeLeaderboard({ franchisees, onSelect, fetchedAt }: {
    franchisees: FranchiseeData[]
    onSelect: (id: string) => void
    fetchedAt?: string
}) {
    const [sortField, setSortField] = useState<SortField>('monthlyRevenue')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

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

    if (franchisees.length === 0) {
        return (
            <div className="text-center py-12 text-stone-500">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-stone-400">No franchisees yet</p>
                <p className="text-xs mt-1">Franchise partners will appear here once onboarded</p>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <DataTruthLabel source="live" fetchedAt={fetchedAt} />
                <span className="text-[11px] text-stone-500">{franchisees.length} franchisees · Last 30 days</span>
            </div>
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
                            const delta = f.priorRevenue > 0
                                ? ((f.monthlyRevenue - f.priorRevenue) / f.priorRevenue * 100)
                                : f.monthlyRevenue > 0 ? 100 : 0

                            return (
                                <tr
                                    key={f.id}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                    onClick={() => onSelect(f.id)}
                                >
                                    <td className="px-4 py-3 text-stone-500 font-mono text-xs">{i + 1}</td>
                                    <td className="px-4 py-3 font-semibold text-white">{f.name}</td>
                                    <td className="px-4 py-3 text-stone-300">{f.locationCount}</td>
                                    <td className="px-4 py-3 font-bold text-emerald-400">{formatCurrency(f.monthlyRevenue)}</td>
                                    <td className="px-4 py-3 text-stone-300 font-medium">{f.transactionCount}</td>
                                    <td className="px-4 py-3 text-stone-300 font-medium">{f.employeeCount}</td>
                                    <td className="px-4 py-3">
                                        {f.priorRevenue > 0 || f.monthlyRevenue > 0 ? (
                                            <span className={`text-xs font-bold flex items-center gap-0.5 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
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
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Network Financials Tab
// ═══════════════════════════════════════════════════════

function NetworkFinancials({ stats }: { stats: DashboardStats | null }) {
    const franchisees = stats?.franchisees || []
    const totalRevenue = stats?.monthlyRevenue || 0
    const totalLocs = stats?.totalLocations || 0
    const totalFranchisees = stats?.totalFranchisees || 0
    const totalEmployees = stats?.totalEmployees || 0
    const priorRevenue = stats?.priorPeriodRevenue || 0
    const delta = priorRevenue > 0 ? ((totalRevenue - priorRevenue) / priorRevenue * 100) : 0

    return (
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
                            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% vs prior
                        </p>
                    )}
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg / Location</p>
                    <p className="text-2xl font-black text-white">
                        {formatCurrency(totalLocs > 0 ? totalRevenue / totalLocs : 0)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{totalLocs} locations</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg / Franchisee</p>
                    <p className="text-2xl font-black text-white">
                        {formatCurrency(totalFranchisees > 0 ? totalRevenue / totalFranchisees : 0)}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{totalFranchisees} franchisees</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Transactions</p>
                    <p className="text-2xl font-black text-white">{stats?.totalTransactions || 0}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{totalEmployees} employees</p>
                </div>
            </div>

            {/* Per-franchisee revenue bars */}
            {franchisees.length > 0 && (
                <div>
                    <h4 className="text-sm font-bold text-stone-300 mb-3">Revenue by Franchisee</h4>
                    <div className="space-y-2">
                        {[...franchisees]
                            .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
                            .map(f => {
                                const pct = totalRevenue > 0 ? (f.monthlyRevenue / totalRevenue * 100) : 0
                                const fDelta = f.priorRevenue > 0
                                    ? ((f.monthlyRevenue - f.priorRevenue) / f.priorRevenue * 100)
                                    : 0
                                return (
                                    <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
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
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-light)] transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
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

            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Prior Period</p>
                        <p className="text-xl font-black text-white">{formatCurrency(priorRevenue)}</p>
                    </div>
                    <Link href="/dashboard/franchisor/reports" className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                        Full Network Reports →
                    </Link>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Alert Generation (strict anomaly rules)
// ═══════════════════════════════════════════════════════

function generateAlerts(stats: DashboardStats | null): ExceptionItem[] {
    if (!stats) return []
    const alerts: ExceptionItem[] = []
    const now = new Date().toISOString()

    // Rule 1: Franchisee with $0 revenue AND has active locations → CRITICAL
    stats.franchisees
        .filter(f => f.monthlyRevenue === 0 && f.locationCount > 0 && f.status !== 'pending')
        .forEach(f => {
            alerts.push({
                id: `zero-rev-${f.id}`,
                type: 'REVENUE_ZERO',
                severity: 'CRITICAL',
                title: `${f.name} — Zero revenue (30d)`,
                description: `${f.locationCount} location(s) active but $0 revenue in the last 30 days. Requires immediate investigation.`,
                locationName: `${f.locationCount} locations`,
                createdAt: now,
                actionLabel: 'Investigate',
            })
        })

    // Rule 2: Franchisee with >25% revenue decline → WARNING
    stats.franchisees
        .filter(f => f.priorRevenue > 0 && f.monthlyRevenue < f.priorRevenue * 0.75)
        .forEach(f => {
            const decline = ((f.priorRevenue - f.monthlyRevenue) / f.priorRevenue * 100).toFixed(0)
            alerts.push({
                id: `decline-${f.id}`,
                type: 'REVENUE_DECLINE',
                severity: 'WARNING',
                title: `${f.name} — Revenue down ${decline}%`,
                description: `Revenue dropped from ${formatCurrency(f.priorRevenue)} to ${formatCurrency(f.monthlyRevenue)} period-over-period.`,
                locationName: `${f.locationCount} locations`,
                createdAt: now,
                actionLabel: 'Review',
            })
        })

    // Rule 3: Active location with 0 employees → WARNING
    if (stats.locationBreakdown.pending > 0) {
        // Only warn if there are locations that should be active but have nobody
        const zeroStaffActive = stats.franchisees.filter(
            f => f.status === 'active' && f.employeeCount === 0 && f.locationCount > 0
        )
        zeroStaffActive.forEach(f => {
            alerts.push({
                id: `no-staff-${f.id}`,
                type: 'STAFFING',
                severity: 'WARNING',
                title: `${f.name} — No employees assigned`,
                description: `${f.locationCount} location(s) but 0 employees in the system. Locations cannot operate.`,
                locationName: f.name,
                createdAt: now,
                actionLabel: 'Assign staff',
            })
        })
    }

    // Rule 4: Pending go-live locations → INFO
    if (stats.locationBreakdown.pending > 0) {
        alerts.push({
            id: 'pending-locations',
            type: 'ROLLOUT',
            severity: 'INFO',
            title: `${stats.locationBreakdown.pending} location(s) pending go-live`,
            description: 'Locations are registered but not yet operational. Review readiness checklist.',
            locationName: 'Network',
            createdAt: now,
            actionLabel: 'View pipeline',
        })
    }

    return alerts
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function FranchisorCommandCenter() {
    const { data: session } = useSession()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [drawerFranchisee, setDrawerFranchisee] = useState<string | null>(null)

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

    // ─── Derived data ──────────
    const alerts = generateAlerts(stats)
    const revDelta = stats?.priorPeriodRevenue && stats.priorPeriodRevenue > 0
        ? ((stats.monthlyRevenue - stats.priorPeriodRevenue) / stats.priorPeriodRevenue * 100)
        : 0

    const totalPendingActions = (stats?.pendingItems?.stationRequests || 0)
        + (stats?.pendingItems?.pendingLocations || 0)
        + (stats?.pendingItems?.underperformingFranchisees || 0)

    const actionItems: ActionItem[] = [
        // Rollout
        { category: 'rollout', label: 'Pending go-live locations', count: stats?.pendingItems?.pendingLocations || 0, severity: 'warning', actionLabel: 'View', href: '/dashboard/locations' },
        { category: 'rollout', label: 'Station requests pending', count: stats?.pendingItems?.stationRequests || 0, severity: 'info', actionLabel: 'Review', href: '/dashboard/terminals' },
        // Performance
        { category: 'performance', label: 'Underperforming franchisees', count: stats?.pendingItems?.underperformingFranchisees || 0, severity: 'critical', actionLabel: 'Investigate' },
        // Readiness
        { category: 'readiness', label: 'Locations with no staff', count: stats?.locationBreakdown?.pending || 0, severity: 'warning', actionLabel: 'Assign' },
    ]

    const selectedFranchisee = stats?.franchisees.find(f => f.id === drawerFranchisee)

    // ─── Loading ──────────
    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--theme-accent)' }} />
            </div>
        )
    }

    return (
        <>
            <DashboardShell
                header={
                    <CommandHeader
                        title={stats?.name || 'Brand HQ'}
                        subtitle={`${stats?.totalFranchisees || 0} franchisees · ${stats?.totalLocations || 0} locations`}
                        icon={Crown}
                        roleBadge="Franchisor HQ"
                        roleBadgeColor="bg-violet-500/15 text-violet-400 border-violet-500/20"
                        onRefresh={fetchData}
                        refreshing={loading}
                    >
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
                    </CommandHeader>
                }
                kpiStrip={
                    <KpiStrip
                        columns={6}
                        kpis={[
                            {
                                title: 'Network Revenue',
                                value: stats?.monthlyRevenue ? formatCurrency(stats.monthlyRevenue) : '$0',
                                subtitle: 'Last 30 days',
                                icon: DollarSign,
                                variant: 'success',
                                trend: revDelta !== 0 ? { value: revDelta, label: 'vs prior period' } : undefined,
                                pulse: true,
                            },
                            {
                                title: 'Same-Store Δ',
                                value: revDelta !== 0 ? `${revDelta >= 0 ? '+' : ''}${revDelta.toFixed(1)}%` : '—',
                                subtitle: 'Period-over-period',
                                icon: TrendingUp,
                                variant: revDelta > 0 ? 'success' : revDelta < 0 ? 'danger' : 'default',
                            },
                            {
                                title: 'Locations',
                                value: `${stats?.locationBreakdown?.active || 0}`,
                                subtitle: `${stats?.locationBreakdown?.pending || 0} pending go-live`,
                                icon: MapPin,
                                variant: (stats?.locationBreakdown?.pending || 0) > 0 ? 'warning' : 'accent',
                            },
                            {
                                title: 'Franchisees',
                                value: stats?.totalFranchisees || 0,
                                subtitle: `${stats?.franchisees?.filter(f => f.status === 'active').length || 0} active`,
                                icon: Users,
                                variant: 'accent',
                            },
                            {
                                title: 'Critical Issues',
                                value: alerts.filter(a => a.severity === 'CRITICAL').length,
                                subtitle: alerts.filter(a => a.severity === 'WARNING').length > 0
                                    ? `${alerts.filter(a => a.severity === 'WARNING').length} warnings`
                                    : 'All clear',
                                icon: AlertCircle,
                                variant: alerts.filter(a => a.severity === 'CRITICAL').length > 0 ? 'danger'
                                    : alerts.filter(a => a.severity === 'WARNING').length > 0 ? 'warning'
                                    : 'success',
                            },
                            {
                                title: 'Pending Actions',
                                value: totalPendingActions,
                                subtitle: totalPendingActions > 0 ? 'Requires attention' : 'Nothing pending',
                                icon: Flag,
                                variant: totalPendingActions > 0 ? 'warning' : 'success',
                            },
                        ]}
                    />
                }
                alertRail={
                    <AlertRail
                        exceptions={alerts}
                        emptyTitle="Network operating normally"
                        emptySubtitle="No revenue anomalies, staffing gaps, or rollout blockers detected"
                    />
                }
                quickActions={
                    <ActionCenter items={actionItems} fetchedAt={stats?.fetchedAt} />
                }
                workspace={
                    <>
                        {/* P0-lite Rollout Summary above tabs */}
                        <RolloutSummary stats={stats} />

                        <WorkspaceTabs
                            tabs={[
                                {
                                    id: 'leaderboard',
                                    label: 'Franchisee Leaderboard',
                                    icon: TrendingUp,
                                    content: (
                                        <FranchiseeLeaderboard
                                            franchisees={stats?.franchisees || []}
                                            onSelect={setDrawerFranchisee}
                                            fetchedAt={stats?.fetchedAt}
                                        />
                                    ),
                                },
                                {
                                    id: 'financials',
                                    label: 'Network Financials',
                                    icon: PieChart,
                                    content: <NetworkFinancials stats={stats} />,
                                },
                                {
                                    id: 'rollout',
                                    label: 'Rollout Pipeline',
                                    icon: Rocket,
                                    badge: stats?.locationBreakdown?.pending || 0,
                                    content: (
                                        <div className="space-y-5">
                                            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.06] text-center">
                                                <Rocket className="h-10 w-10 mx-auto mb-3 text-stone-600" />
                                                <p className="font-semibold text-stone-300">Rollout Pipeline — Coming in P1</p>
                                                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                                                    Full go-live tracking, station request aging, and readiness checklists. Use the summary above for current rollout status.
                                                </p>
                                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto text-left">
                                                    {['Openings pipeline', 'Go-live progress', 'Station request aging', 'Readiness blockers'].map(item => (
                                                        <div key={item} className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                                            <span className="text-[11px] text-stone-500">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </>
                }
            />

            {/* ═══ Franchisee Detail Drawer ═══ */}
            <DrawerPanel
                open={!!drawerFranchisee}
                onClose={() => setDrawerFranchisee(null)}
                title={selectedFranchisee?.name || 'Franchisee'}
                subtitle="30-day performance overview"
            >
                {selectedFranchisee && (() => {
                    const f = selectedFranchisee
                    const delta = f.priorRevenue > 0
                        ? ((f.monthlyRevenue - f.priorRevenue) / f.priorRevenue * 100)
                        : 0

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
                                    f.status === 'warning' ? 'text-amber-400' :
                                    'text-stone-400'
                                }`}>
                                    {f.status}
                                </span>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Revenue</p>
                                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(f.monthlyRevenue)}</p>
                                    {delta !== 0 && (
                                        <p className={`text-[11px] mt-1 font-semibold ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% vs prior
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

                            {/* Prior period comparison */}
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

                            {/* Quick links */}
                            <div className="space-y-2">
                                <Link
                                    href="/dashboard/brand/sub-franchisees"
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors group"
                                >
                                    <span className="text-sm font-medium text-stone-300">Manage Franchisee</span>
                                    <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)]" />
                                </Link>
                                <Link
                                    href="/dashboard/franchisor/reports"
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors group"
                                >
                                    <span className="text-sm font-medium text-stone-300">Full Financial Reports</span>
                                    <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)]" />
                                </Link>
                            </div>
                        </div>
                    )
                })()}
            </DrawerPanel>
        </>
    )
}
