'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    FileText, AlertTriangle, Package, Truck, Wifi, WifiOff, TrendingDown,
    Ticket, DollarSign, Clock, RefreshCw, ChevronRight, User, Building2,
    Monitor, Activity, ShieldCheck, Cpu, PieChart
} from 'lucide-react'

import DashboardShell from '@/components/dashboard/command-center/DashboardShell'
import CommandHeader from '@/components/dashboard/command-center/CommandHeader'
import KpiStrip from '@/components/dashboard/command-center/KpiStrip'
import AlertRail from '@/components/dashboard/command-center/AlertRail'
import type { ExceptionItem } from '@/components/dashboard/command-center/AlertRail'
import QuickActionsPanel from '@/components/dashboard/command-center/QuickActionsPanel'
import WorkspaceTabs from '@/components/dashboard/command-center/WorkspaceTabs'

// ─── Queue Types ────────────────────────────────────────
interface OnboardingItem {
    id: string
    type: string
    client: string
    status: string
    age: string
    agent: string | null
}

interface TicketItem {
    id: string
    priority: string
    client: string
    location: string
    category: string
    status: string
    sla: string
}

// ─── Status Badge ───────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        submitted: 'bg-blue-500/15 text-blue-400',
        'in-review': 'bg-purple-500/15 text-purple-400',
        'waiting-docs': 'bg-amber-500/15 text-amber-400',
        approved: 'bg-emerald-500/15 text-emerald-400',
        open: 'bg-blue-500/15 text-blue-400',
        urgent: 'bg-red-500/15 text-red-400',
    }
    return (
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize ${colors[status] || 'bg-stone-700 text-stone-300'}`}>
            {status.replace('-', ' ')}
        </span>
    )
}

function PriorityBadge({ priority }: { priority: string }) {
    const colors: Record<string, string> = {
        P1: 'bg-red-500 text-white',
        P2: 'bg-orange-500 text-white',
        P3: 'bg-amber-500 text-white',
        P4: 'bg-blue-500 text-white',
    }
    return <span className={`px-2 py-0.5 rounded text-[11px] font-black ${colors[priority] || 'bg-stone-600 text-stone-200'}`}>{priority}</span>
}

// ─── Onboarding Pipeline Tab ────────────────────────────
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
                    </tr>
                </thead>
                <tbody>
                    {queue.map(req => (
                        <tr key={req.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer">
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
                                    <span className="flex items-center gap-1 text-stone-300">
                                        <User size={12} />{req.agent}
                                    </span>
                                ) : (
                                    <span className="text-red-400 text-xs font-bold">Unassigned</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ─── Support Queue Tab ──────────────────────────────────
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
                            <td className="px-4 py-3 text-amber-400 font-mono text-xs font-bold">{t.sla}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ─── Device Health Tab ──────────────────────────────────
function DeviceHealthTab({ offlineCount }: { offlineCount: number }) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Offline Devices</p>
                    <p className={`text-2xl font-black ${offlineCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{offlineCount}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Firmware</p>
                    <p className="text-2xl font-black text-emerald-400">✓</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">All current</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Last Scan</p>
                    <p className="text-lg font-bold text-white">Just now</p>
                </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.06] text-center">
                <Monitor className="h-10 w-10 mx-auto mb-3 text-stone-600" />
                <p className="font-semibold text-stone-300">Device Monitoring</p>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                    Terminal heartbeat tracking, printer status, and scanner readiness across all merchant locations.
                </p>
                <Link href="/provider/devices" className="inline-block mt-4 text-sm font-semibold text-[var(--theme-accent)] hover:underline">
                    Device Console →
                </Link>
            </div>
        </div>
    )
}

// ─── Payment Monitoring Tab ─────────────────────────────
function PaymentMonitoringTab({ highDecline }: { highDecline: number }) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">High Decline</p>
                    <p className={`text-2xl font-black ${highDecline > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{highDecline}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Locations flagged</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Settlement</p>
                    <p className="text-2xl font-black text-emerald-400">✓</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">All settled</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Payout Issues</p>
                    <p className="text-2xl font-black text-emerald-400">0</p>
                </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.06] text-center">
                <Activity className="h-10 w-10 mx-auto mb-3 text-stone-600" />
                <p className="font-semibold text-stone-300">Payment Health Monitor</p>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                    Transaction decline rates, settlement delays, and payout anomalies across the merchant network.
                </p>
                <Link href="/provider/monitoring" className="inline-block mt-4 text-sm font-semibold text-[var(--theme-accent)] hover:underline">
                    Payment Console →
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
    const [stats, setStats] = useState({
        onboardingPending: 0,
        docsMissing: 0,
        hardwareToAssign: 0,
        shipmentsToSend: 0,
        offlineDevices: 0,
        highDeclineLocations: 0,
        openTickets: 0,
        slaAtRisk: 0,
        billingPastDue: 0,
    })
    const [onboardingQueue, setOnboardingQueue] = useState<OnboardingItem[]>([])
    const [ticketQueue, setTicketQueue] = useState<TicketItem[]>([])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/provider/dashboard')
            if (res.ok) {
                const data = await res.json()
                setStats(data.stats || stats)
                setOnboardingQueue(data.onboardingQueue || [])
                setTicketQueue(data.ticketQueue || [])
            }
        } catch (e) {
            console.error('Provider dashboard error:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        const iv = setInterval(fetchData, 30000)
        return () => clearInterval(iv)
    }, [fetchData])

    // Build alert items from stats
    const alerts: ExceptionItem[] = []
    if (stats.offlineDevices > 0) {
        alerts.push({
            id: 'offline-devices',
            type: 'DEVICE',
            severity: 'CRITICAL',
            title: `${stats.offlineDevices} device(s) offline`,
            description: 'Terminals not responding — may affect merchant operations',
            locationName: 'Network',
            createdAt: new Date().toISOString(),
            actionLabel: 'View Devices',
        })
    }
    if (stats.slaAtRisk > 0) {
        alerts.push({
            id: 'sla-risk',
            type: 'SUPPORT',
            severity: 'WARNING',
            title: `${stats.slaAtRisk} ticket(s) at SLA risk`,
            description: 'Support tickets approaching resolution deadline',
            locationName: 'Support',
            createdAt: new Date().toISOString(),
            actionLabel: 'View Tickets',
        })
    }
    if (stats.billingPastDue > 0) {
        alerts.push({
            id: 'billing',
            type: 'BILLING',
            severity: 'CRITICAL',
            title: `${stats.billingPastDue} account(s) past due`,
            description: 'Outstanding invoices require attention',
            locationName: 'Billing',
            createdAt: new Date().toISOString(),
        })
    }
    if (stats.highDeclineLocations > 0) {
        alerts.push({
            id: 'declines',
            type: 'PAYMENT',
            severity: 'WARNING',
            title: `${stats.highDeclineLocations} high-decline location(s)`,
            description: 'Elevated transaction decline rates detected',
            locationName: 'Payments',
            createdAt: new Date().toISOString(),
        })
    }

    return (
        <DashboardShell
            header={
                <CommandHeader
                    title="Provider Command Center"
                    subtitle="Platform operations & merchant health"
                    icon={Cpu}
                    roleBadge="Platform Operator"
                    roleBadgeColor="bg-orange-500/15 text-orange-400 border-orange-500/20"
                    onRefresh={fetchData}
                    refreshing={loading}
                />
            }
            kpiStrip={
                <KpiStrip
                    columns={5}
                    kpis={[
                        {
                            title: 'Onboarding Queue',
                            value: stats.onboardingPending,
                            subtitle: `${stats.docsMissing} docs missing`,
                            icon: FileText,
                            variant: stats.onboardingPending > 0 ? 'warning' : 'default',
                            href: '/provider/onboarding',
                        },
                        {
                            title: 'Offline Devices',
                            value: stats.offlineDevices,
                            icon: WifiOff,
                            variant: stats.offlineDevices > 0 ? 'danger' : 'success',
                            href: '/provider/devices?filter=offline',
                        },
                        {
                            title: 'Open Tickets',
                            value: stats.openTickets,
                            subtitle: `${stats.slaAtRisk} SLA at risk`,
                            icon: Ticket,
                            variant: stats.slaAtRisk > 0 ? 'warning' : 'default',
                            href: '/provider/tickets',
                        },
                        {
                            title: 'High Decline',
                            value: stats.highDeclineLocations,
                            icon: TrendingDown,
                            variant: stats.highDeclineLocations > 0 ? 'danger' : 'success',
                        },
                        {
                            title: 'Billing Past Due',
                            value: stats.billingPastDue,
                            icon: DollarSign,
                            variant: stats.billingPastDue > 0 ? 'danger' : 'success',
                            href: '/provider/billing',
                        },
                    ]}
                />
            }
            alertRail={
                <AlertRail
                    exceptions={alerts}
                    emptyTitle="All systems operational"
                    emptySubtitle="No device outages, SLA breaches, or billing issues detected"
                />
            }
            quickActions={
                <QuickActionsPanel
                    title="Operations"
                    actions={[
                        { label: 'Onboarding', sublabel: 'Pipeline', icon: FileText, href: '/provider/onboarding', color: 'bg-blue-500/15', iconColor: 'text-blue-400' },
                        { label: 'Support', sublabel: 'Tickets', icon: Ticket, href: '/provider/tickets', color: 'bg-purple-500/15', iconColor: 'text-purple-400' },
                        { label: 'Devices', sublabel: 'Health', icon: Monitor, href: '/provider/devices', color: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
                        { label: 'Clients', sublabel: 'Accounts', icon: Building2, href: '/provider/clients', color: 'bg-orange-500/15', iconColor: 'text-orange-400' },
                    ]}
                />
            }
            workspace={
                <WorkspaceTabs
                    tabs={[
                        {
                            id: 'onboarding',
                            label: 'Onboarding Pipeline',
                            icon: FileText,
                            badge: stats.onboardingPending,
                            content: <OnboardingPipeline queue={onboardingQueue} />,
                        },
                        {
                            id: 'support',
                            label: 'Support Queue',
                            icon: Ticket,
                            badge: stats.openTickets,
                            content: <SupportQueue tickets={ticketQueue} />,
                        },
                        {
                            id: 'devices',
                            label: 'Device Health',
                            icon: Monitor,
                            badge: stats.offlineDevices > 0 ? stats.offlineDevices : undefined,
                            content: <DeviceHealthTab offlineCount={stats.offlineDevices} />,
                        },
                        {
                            id: 'payments',
                            label: 'Payment Monitoring',
                            icon: Activity,
                            badge: stats.highDeclineLocations > 0 ? stats.highDeclineLocations : undefined,
                            content: <PaymentMonitoringTab highDecline={stats.highDeclineLocations} />,
                        },
                    ]}
                />
            }
        />
    )
}
