'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    FileText, AlertTriangle, Package, Truck, Wifi, WifiOff, TrendingDown,
    Ticket, DollarSign, Clock, ChevronRight, User, Building2,
    Monitor, Activity, Cpu, ShieldAlert, MapPin,
    Zap, CheckCircle, Server, AlertCircle, Users,
} from 'lucide-react'

import DashboardShell from '@/components/dashboard/command-center/DashboardShell'
import CommandHeader from '@/components/dashboard/command-center/CommandHeader'
import KpiStrip from '@/components/dashboard/command-center/KpiStrip'
import AlertRail from '@/components/dashboard/command-center/AlertRail'
import type { ExceptionItem } from '@/components/dashboard/command-center/AlertRail'
import WorkspaceTabs from '@/components/dashboard/command-center/WorkspaceTabs'
import DataTruthLabel from '@/components/dashboard/command-center/DataTruthLabel'
import type { DataTruthMeta } from '@/components/dashboard/command-center/DataTruthLabel'

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

interface OnboardingItem {
    id: string; type: string; client: string; status: string; age: string; agent: string | null
}
interface TicketItem {
    id: string; priority: string; client: string; location: string; category: string; status: string; sla: string
}
interface ProvisioningItem {
    id: string; locationName: string; locationStatus: string; franchisor: string; status: string; devices: number; age: string
}
interface DashboardStats {
    onboardingPending: number; docsMissing: number; hardwareToAssign: number
    shipmentsToSend: number; offlineDevices: number; totalTerminals: number
    highDeclineLocations: number; openTickets: number; slaAtRisk: number; p1Tickets: number
    billingPastDue: number; totalFranchisors: number; totalLocations: number
    activeLocations: number; suspendedLocations: number; activeIncidents: number
    provisioningPending: number; unassignedOnboarding: number
}
interface NetworkHealth {
    devicesOnline: number; devicesTotal: number; uptimePercent: string
    activeIncidents: number; locationsAtRisk: number
}

// ═══════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        submitted: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
        'in-review': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
        'waiting-docs': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
        shipped: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
        open: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
        pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
        IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    }
    return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize border ${colors[status] || 'bg-stone-700 text-stone-300 border-stone-600'}`}>
            {status.replace(/[-_]/g, ' ')}
        </span>
    )
}

function PriorityBadge({ priority }: { priority: string }) {
    const colors: Record<string, string> = {
        P0: 'bg-red-600 text-white shadow-[0_0_8px_rgba(220,38,38,0.4)]',
        P1: 'bg-red-500 text-white',
        P2: 'bg-orange-500 text-white',
        P3: 'bg-amber-500 text-white',
        P4: 'bg-blue-500 text-white',
    }
    return <span className={`px-2 py-0.5 rounded text-[11px] font-black ${colors[priority] || 'bg-stone-600 text-stone-200'}`}>{priority}</span>
}

// ── Provider Action Center ──────────────────────────────
function ProviderActionCenter({ stats }: { stats: DashboardStats }) {
    interface ActionItem {
        category: 'critical' | 'support' | 'onboarding' | 'provisioning'
        label: string
        count: number
        severity: 'critical' | 'warning' | 'info'
        actionLabel: string
        href: string
    }

    const items: ActionItem[] = [
        { category: 'critical', label: 'P1 Tickets', count: stats.p1Tickets, severity: 'critical', actionLabel: 'Triage', href: '/provider/tickets?severity=P1' },
        { category: 'critical', label: 'SLA Breached Tickets', count: stats.slaAtRisk, severity: 'critical', actionLabel: 'Resolve', href: '/provider/tickets?sla=breached' },
        { category: 'critical', label: 'Offline Devices', count: stats.offlineDevices, severity: 'critical', actionLabel: 'Investigate', href: '/provider/devices?filter=offline' },
        { category: 'critical', label: 'Active Incidents', count: stats.activeIncidents, severity: 'critical', actionLabel: 'Manage', href: '/provider/monitoring' },
        { category: 'support', label: 'Open Tickets', count: stats.openTickets, severity: 'warning', actionLabel: 'View Queue', href: '/provider/tickets' },
        { category: 'support', label: 'Suspended Locations', count: stats.suspendedLocations, severity: 'warning', actionLabel: 'Review', href: '/provider/provisioning?status=SUSPENDED' },
        { category: 'onboarding', label: 'Unassigned Requests', count: stats.unassignedOnboarding, severity: 'warning', actionLabel: 'Assign', href: '/provider/onboarding' },
        { category: 'onboarding', label: 'Waiting for Docs', count: stats.docsMissing, severity: 'info', actionLabel: 'Follow Up', href: '/provider/onboarding?status=waiting-docs' },
        { category: 'provisioning', label: 'Provisioning Tasks', count: stats.provisioningPending, severity: 'info', actionLabel: 'Process', href: '/provider/provisioning' },
        { category: 'provisioning', label: 'Hardware to Ship', count: stats.hardwareToAssign + stats.shipmentsToSend, severity: 'info', actionLabel: 'Ship', href: '/provider/onboarding?status=approved' },
    ]

    const categoryConfig = {
        critical: { icon: AlertCircle, label: 'Critical — Act Now', color: 'text-red-400' },
        support: { icon: Ticket, label: 'Support', color: 'text-amber-400' },
        onboarding: { icon: FileText, label: 'Onboarding', color: 'text-blue-400' },
        provisioning: { icon: Server, label: 'Provisioning & Hardware', color: 'text-violet-400' },
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
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/20">
                            {items.filter(i => i.count > 0).length} active
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
                        <p className="font-semibold text-stone-300 text-sm">All systems clear</p>
                        <p className="text-xs text-stone-500 mt-1">No pending actions or interventions required</p>
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
                                            <Link key={i} href={item.href}>
                                                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors cursor-pointer group">
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
                                            </Link>
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

// ── Network Health Widget ───────────────────────────────
function NetworkHealthWidget({ health, stats }: { health: NetworkHealth; stats: DashboardStats }) {
    const uptimePct = parseFloat(health.uptimePercent)
    const uptimeColor = uptimePct >= 99.5 ? 'text-emerald-400' : uptimePct >= 95 ? 'text-amber-400' : 'text-red-400'

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">System Health</h3>
                </div>
                {health.activeIncidents > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/20">
                        {health.activeIncidents} incident{health.activeIncidents !== 1 ? 's' : ''}
                    </span>
                ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        Operational
                    </span>
                )}
            </div>
            <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                    <p className={`text-2xl font-black ${uptimeColor}`}>{health.uptimePercent}%</p>
                    <p className="text-[11px] text-stone-500 mt-1">Device Uptime</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black text-white">
                        {health.devicesOnline}<span className="text-stone-500 text-lg font-medium">/{health.devicesTotal}</span>
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">Terminals Online</p>
                </div>
                <div className="text-center">
                    <p className={`text-2xl font-black ${stats.suspendedLocations > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {stats.activeLocations}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">Active Locations</p>
                </div>
                <div className="text-center">
                    <p className="text-2xl font-black text-white">{stats.totalFranchisors}</p>
                    <p className="text-[11px] text-stone-500 mt-1">Clients (Brands)</p>
                </div>
            </div>
            {(stats.offlineDevices > 0 || stats.suspendedLocations > 0) && (
                <div className="mt-4 h-2 rounded-full bg-stone-800 overflow-hidden flex">
                    <div
                        className="h-full bg-emerald-500 rounded-l-full transition-all"
                        style={{ width: `${health.devicesTotal > 0 ? (health.devicesOnline / health.devicesTotal) * 100 : 100}%` }}
                    />
                    <div
                        className="h-full bg-red-500/60 rounded-r-full transition-all"
                        style={{ width: `${health.devicesTotal > 0 ? (stats.offlineDevices / health.devicesTotal) * 100 : 0}%` }}
                    />
                </div>
            )}
        </div>
    )
}

// ── Onboarding Pipeline Tab ─────────────────────────────
function OnboardingPipeline({ queue }: { queue: OnboardingItem[] }) {
    if (queue.length === 0) {
        return (
            <div className="text-center py-12 text-stone-500">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-stone-400">No onboarding requests</p>
                <p className="text-xs mt-1">New applications will appear here</p>
            </div>
        )
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/[0.06]">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Request</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Type</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Client</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Age</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Agent</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {queue.map(req => (
                        <tr key={req.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group">
                            <td className="px-4 py-3">
                                <Link href={`/provider/onboarding/${req.id}`} className="font-mono text-[var(--theme-accent)] hover:underline text-xs">
                                    {req.id}
                                </Link>
                            </td>
                            <td className="px-4 py-3 text-stone-300">{req.type}</td>
                            <td className="px-4 py-3 font-semibold text-white">{req.client}</td>
                            <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                            <td className="px-4 py-3 text-stone-400 flex items-center gap-1">
                                <Clock size={12} />{req.age}
                            </td>
                            <td className="px-4 py-3">
                                {req.agent ? (
                                    <span className="flex items-center gap-1 text-stone-300"><User size={12} />{req.agent}</span>
                                ) : (
                                    <span className="text-red-400 text-xs font-bold">Unassigned</span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)] transition-colors" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="border-t border-white/[0.06] px-4 py-3">
                <Link href="/provider/onboarding" className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                    View Full Pipeline →
                </Link>
            </div>
        </div>
    )
}

// ── Support Queue Tab ───────────────────────────────────
function SupportQueue({ tickets }: { tickets: TicketItem[] }) {
    if (tickets.length === 0) {
        return (
            <div className="text-center py-12 text-stone-500">
                <Ticket className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-stone-400">No open tickets</p>
                <p className="text-xs mt-1">Support requests will appear here</p>
            </div>
        )
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/[0.06]">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Priority</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Client</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Location</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Category</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">SLA</th>
                    </tr>
                </thead>
                <tbody>
                    {tickets.map(t => (
                        <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer">
                            <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                            <td className="px-4 py-3 font-semibold text-white">{t.client}</td>
                            <td className="px-4 py-3 text-stone-300">{t.location}</td>
                            <td className="px-4 py-3 text-stone-400">{t.category}</td>
                            <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                            <td className="px-4 py-3">
                                <span className={`font-mono text-xs font-bold ${t.sla === 'BREACHED' ? 'text-red-400' : 'text-amber-400'}`}>
                                    {t.sla}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="border-t border-white/[0.06] px-4 py-3">
                <Link href="/provider/tickets" className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                    Full Ticket Queue →
                </Link>
            </div>
        </div>
    )
}

// ── Provisioning Queue Tab ──────────────────────────────
function ProvisioningQueue({ queue }: { queue: ProvisioningItem[] }) {
    if (queue.length === 0) {
        return (
            <div className="text-center py-12 text-stone-500">
                <Server className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-stone-400">No pending provisioning</p>
                <p className="text-xs mt-1">Location provisioning tasks will appear here</p>
            </div>
        )
    }
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/[0.06]">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Location</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Client</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Devices</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Age</th>
                    </tr>
                </thead>
                <tbody>
                    {queue.map(task => (
                        <tr key={task.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer">
                            <td className="px-4 py-3 font-semibold text-white">{task.locationName}</td>
                            <td className="px-4 py-3 text-stone-300">{task.franchisor}</td>
                            <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                            <td className="px-4 py-3 text-stone-300">{task.devices > 0 ? task.devices : '—'}</td>
                            <td className="px-4 py-3 text-stone-400 flex items-center gap-1">
                                <Clock size={12} />{task.age}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="border-t border-white/[0.06] px-4 py-3">
                <Link href="/provider/provisioning" className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                    Full Provisioning Console →
                </Link>
            </div>
        </div>
    )
}

// ── Device Health Tab ───────────────────────────────────
function DeviceHealthTab({ stats }: { stats: DashboardStats }) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Offline Devices</p>
                    <p className={`text-2xl font-black ${stats.offlineDevices > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{stats.offlineDevices}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">of {stats.totalTerminals} total</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Active Incidents</p>
                    <p className={`text-2xl font-black ${stats.activeIncidents > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{stats.activeIncidents}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Suspended Locations</p>
                    <p className={`text-2xl font-black ${stats.suspendedLocations > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{stats.suspendedLocations}</p>
                </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.06] text-center">
                <Monitor className="h-10 w-10 mx-auto mb-3 text-stone-600" />
                <p className="font-semibold text-stone-300">Device Console & Terminal Monitoring</p>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                    Heartbeat tracking, firmware status, printer health, and scanner readiness across all merchant locations.
                </p>
                <Link href="/provider/devices" className="inline-block mt-4 text-sm font-semibold text-[var(--theme-accent)] hover:underline">
                    Open Device Console →
                </Link>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function ProviderHomePage() {
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [stats, setStats] = useState<DashboardStats>({
        onboardingPending: 0, docsMissing: 0, hardwareToAssign: 0,
        shipmentsToSend: 0, offlineDevices: 0, totalTerminals: 0,
        highDeclineLocations: 0, openTickets: 0, slaAtRisk: 0, p1Tickets: 0,
        billingPastDue: 0, totalFranchisors: 0, totalLocations: 0,
        activeLocations: 0, suspendedLocations: 0, activeIncidents: 0,
        provisioningPending: 0, unassignedOnboarding: 0,
    })
    const [networkHealth, setNetworkHealth] = useState<NetworkHealth>({
        devicesOnline: 0, devicesTotal: 0, uptimePercent: '100.0',
        activeIncidents: 0, locationsAtRisk: 0,
    })
    const [onboardingQueue, setOnboardingQueue] = useState<OnboardingItem[]>([])
    const [ticketQueue, setTicketQueue] = useState<TicketItem[]>([])
    const [provisioningQueue, setProvisioningQueue] = useState<ProvisioningItem[]>([])
    const [fetchedAt, setFetchedAt] = useState<string | null>(null)

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/provider/dashboard')
            if (res.ok) {
                const data = await res.json()
                setStats(data.stats || stats)
                setOnboardingQueue(data.onboardingQueue || [])
                setTicketQueue(data.ticketQueue || [])
                setProvisioningQueue(data.provisioningQueue || [])
                setNetworkHealth(data.networkHealth || networkHealth)
                setFetchedAt(data.fetchedAt || null)
            }
        } catch (e) {
            console.error('Provider dashboard error:', e)
        }
        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => {
        fetchData()
        const iv = setInterval(() => fetchData(true), 30000)
        return () => clearInterval(iv)
    }, [fetchData])

    // ── Build alert rail from real data ──────────────────
    const alerts: ExceptionItem[] = []
    if (stats.activeIncidents > 0) {
        alerts.push({
            id: 'incidents', type: 'INCIDENT', severity: 'CRITICAL',
            title: `${stats.activeIncidents} active incident(s)`,
            description: 'System-wide incidents require investigation',
            locationName: 'Platform', createdAt: new Date().toISOString(),
        })
    }
    if (stats.offlineDevices > 0) {
        alerts.push({
            id: 'offline', type: 'DEVICE', severity: 'CRITICAL',
            title: `${stats.offlineDevices} device(s) offline`,
            description: 'Terminals not responding — merchant operations may be affected',
            locationName: 'Network', createdAt: new Date().toISOString(),
        })
    }
    if (stats.slaAtRisk > 0) {
        alerts.push({
            id: 'sla', type: 'SUPPORT', severity: 'CRITICAL',
            title: `${stats.slaAtRisk} ticket(s) breached SLA`,
            description: 'Support tickets past their resolution deadline',
            locationName: 'Support', createdAt: new Date().toISOString(),
        })
    }
    if (stats.p1Tickets > 0) {
        alerts.push({
            id: 'p1', type: 'SUPPORT', severity: 'CRITICAL',
            title: `${stats.p1Tickets} P1 ticket(s) open`,
            description: 'Highest priority issues need immediate triage',
            locationName: 'Support', createdAt: new Date().toISOString(),
        })
    }
    if (stats.unassignedOnboarding > 0) {
        alerts.push({
            id: 'unassigned', type: 'ONBOARDING', severity: 'WARNING',
            title: `${stats.unassignedOnboarding} unassigned onboarding request(s)`,
            description: 'New client applications without an assigned agent',
            locationName: 'Onboarding', createdAt: new Date().toISOString(),
        })
    }
    if (stats.suspendedLocations > 0) {
        alerts.push({
            id: 'suspended', type: 'LOCATION', severity: 'WARNING',
            title: `${stats.suspendedLocations} suspended location(s)`,
            description: 'Locations deactivated — may need re-provisioning',
            locationName: 'Locations', createdAt: new Date().toISOString(),
        })
    }

    // ── Meta for data truth label ────────────────────────
    const meta: DataTruthMeta | null = fetchedAt ? {
        queriedAt: fetchedAt,
        freshness: 'live',
        source: 'primary_db',
        businessDayCutoff: 'real-time',
        note: 'Auto-refreshes every 30s',
    } : null

    // ── Total critical count ─────────────────────────────
    const criticalCount = stats.offlineDevices + stats.slaAtRisk + stats.p1Tickets + stats.activeIncidents

    return (
        <DashboardShell
            header={
                <CommandHeader
                    title="Provider Command Center"
                    subtitle={`${stats.totalFranchisors} brands · ${stats.totalLocations} locations · ${stats.totalTerminals} terminals`}
                    icon={Cpu}
                    roleBadge="Platform Operator"
                    roleBadgeColor="bg-orange-500/15 text-orange-400 border-orange-500/20"
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
                            title: 'Critical Issues',
                            value: criticalCount,
                            icon: ShieldAlert,
                            variant: criticalCount > 0 ? 'danger' : 'success',
                            pulse: criticalCount > 0,
                            subtitle: criticalCount > 0 ? 'Needs intervention' : 'All clear',
                        },
                        {
                            title: 'Open Tickets',
                            value: stats.openTickets,
                            subtitle: stats.slaAtRisk > 0 ? `${stats.slaAtRisk} SLA breached` : 'All within SLA',
                            icon: Ticket,
                            variant: stats.slaAtRisk > 0 ? 'danger' : stats.openTickets > 0 ? 'warning' : 'default',
                        },
                        {
                            title: 'Devices Offline',
                            value: stats.offlineDevices,
                            subtitle: `${stats.totalTerminals} total terminals`,
                            icon: WifiOff,
                            variant: stats.offlineDevices > 0 ? 'danger' : 'success',
                        },
                        {
                            title: 'Onboarding Queue',
                            value: stats.onboardingPending,
                            subtitle: `${stats.unassignedOnboarding} unassigned`,
                            icon: FileText,
                            variant: stats.unassignedOnboarding > 0 ? 'warning' : 'default',
                        },
                        {
                            title: 'Provisioning',
                            value: stats.provisioningPending,
                            subtitle: `${stats.hardwareToAssign} hw to assign`,
                            icon: Server,
                            variant: stats.provisioningPending > 0 ? 'accent' : 'default',
                        },
                        {
                            title: 'Locations',
                            value: stats.activeLocations,
                            subtitle: stats.suspendedLocations > 0 ? `${stats.suspendedLocations} suspended` : `of ${stats.totalLocations} total`,
                            icon: MapPin,
                            variant: stats.suspendedLocations > 0 ? 'warning' : 'success',
                        },
                    ]}
                />
            }
            alertRail={
                <AlertRail
                    exceptions={alerts}
                    emptyTitle="All systems operational"
                    emptySubtitle="No device outages, SLA breaches, incidents, or onboarding issues detected"
                />
            }
            quickActions={
                <ProviderActionCenter stats={stats} />
            }
            workspace={
                <>
                    {/* System health widget above tabs */}
                    <NetworkHealthWidget health={networkHealth} stats={stats} />

                    <WorkspaceTabs
                        tabs={[
                            {
                                id: 'onboarding',
                                label: 'Onboarding Pipeline',
                                icon: FileText,
                                badge: stats.onboardingPending > 0 ? stats.onboardingPending : undefined,
                                content: <OnboardingPipeline queue={onboardingQueue} />,
                            },
                            {
                                id: 'support',
                                label: 'Support Queue',
                                icon: Ticket,
                                badge: stats.openTickets > 0 ? stats.openTickets : undefined,
                                content: <SupportQueue tickets={ticketQueue} />,
                            },
                            {
                                id: 'provisioning',
                                label: 'Provisioning',
                                icon: Server,
                                badge: stats.provisioningPending > 0 ? stats.provisioningPending : undefined,
                                content: <ProvisioningQueue queue={provisioningQueue} />,
                            },
                            {
                                id: 'devices',
                                label: 'Devices & Health',
                                icon: Monitor,
                                badge: stats.offlineDevices > 0 ? stats.offlineDevices : undefined,
                                content: <DeviceHealthTab stats={stats} />,
                            },
                        ]}
                    />
                </>
            }
            trendFooter={
                <div className="flex items-center justify-between px-5 py-3 bg-stone-900/30 backdrop-blur-md border border-white/[0.04] rounded-xl">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{stats.totalFranchisors} brands</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{stats.activeLocations}/{stats.totalLocations} locations active</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <Users className="h-3.5 w-3.5" />
                            <span>{stats.totalTerminals} terminals</span>
                        </div>
                        {stats.activeIncidents > 0 && (
                            <div className="flex items-center gap-2 text-xs text-red-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>{stats.activeIncidents} active incident{stats.activeIncidents !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                    <DataTruthLabel meta={meta} compact />
                </div>
            }
        />
    )
}
