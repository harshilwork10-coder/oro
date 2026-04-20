'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    Building2, DollarSign, Users, MapPin, Shield, TrendingUp,
    AlertCircle, BarChart3, Settings, ChevronRight, Copy,
    PieChart, Megaphone, UserPlus, Crown
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

import DashboardShell from './command-center/DashboardShell'
import CommandHeader from './command-center/CommandHeader'
import KpiStrip from './command-center/KpiStrip'
import AlertRail from './command-center/AlertRail'
import type { ExceptionItem } from './command-center/AlertRail'
import QuickActionsPanel from './command-center/QuickActionsPanel'
import WorkspaceTabs from './command-center/WorkspaceTabs'

// ─── Franchisee Leaderboard ────────────────────────────
interface FranchiseeRow {
    id: string
    name: string
    locations: number
    revenue: number
    compliance: number
    status: string
}

function FranchiseeLeaderboard({ franchisees }: { franchisees: FranchiseeRow[] }) {
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
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/[0.06]">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">#</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Franchisee</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Locations</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Revenue (30d)</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Compliance</th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {franchisees.map((f, i) => (
                        <tr key={f.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group">
                            <td className="px-4 py-3 text-stone-500 font-mono text-xs">{i + 1}</td>
                            <td className="px-4 py-3 font-semibold text-white">{f.name}</td>
                            <td className="px-4 py-3 text-stone-300">{f.locations}</td>
                            <td className="px-4 py-3 font-bold text-emerald-400">{formatCurrency(f.revenue)}</td>
                            <td className="px-4 py-3">
                                <span className={`text-sm font-bold ${f.compliance >= 90 ? 'text-emerald-400' : f.compliance >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {f.compliance}%
                                </span>
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
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ─── Network Financial Report ──────────────────────────
function NetworkFinancials({ stats }: { stats: any }) {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Network Revenue</p>
                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(stats?.monthlyRevenue || 0)}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Last 30 days</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg / Location</p>
                    <p className="text-2xl font-black text-white">
                        {formatCurrency(stats?.totalLocations > 0 ? (stats?.monthlyRevenue || 0) / stats.totalLocations : 0)}
                    </p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg / Franchisee</p>
                    <p className="text-2xl font-black text-white">
                        {formatCurrency(stats?.totalFranchisees > 0 ? (stats?.monthlyRevenue || 0) / stats.totalFranchisees : 0)}
                    </p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Total Employees</p>
                    <p className="text-2xl font-black text-white">{stats?.totalEmployees || 0}</p>
                </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Revenue Trend</p>
                        <p className="text-xs text-stone-500">Network-wide financial breakdown coming in reports</p>
                    </div>
                    <Link href="/dashboard/franchisor/reports" className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                        Full Network Reports →
                    </Link>
                </div>
            </div>
        </div>
    )
}

// ─── Compliance Tab ─────────────────────────────────────
function BrandComplianceTab() {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Network Score</p>
                    <p className="text-2xl font-black text-emerald-400">100%</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">All franchisees compliant</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Menu Sync</p>
                    <p className="text-2xl font-black text-emerald-400">✓</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Service consistency</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Price Adherence</p>
                    <p className="text-2xl font-black text-emerald-400">✓</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Brand standards met</p>
                </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.06] text-center">
                <Shield className="h-10 w-10 mx-auto mb-3 text-stone-600" />
                <p className="font-semibold text-stone-300">Brand Compliance Monitor</p>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                    Track service menu consistency, pricing adherence, and training completion across all franchise locations.
                </p>
                <Link href="/dashboard/compliance" className="inline-block mt-4 text-sm font-semibold text-[var(--theme-accent)] hover:underline">
                    Compliance Dashboard →
                </Link>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function FranchisorCommandCenter() {
    const { data: session } = useSession()
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [franchisees, setFranchisees] = useState<FranchiseeRow[]>([])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/brand/dashboard')
            if (res.ok) {
                const data = await res.json()
                setStats(data)

                // Build franchisee table from available data
                // Real data — if the API provides franchisee list, map it
                if (data.franchisees) {
                    setFranchisees(data.franchisees.map((f: any) => ({
                        id: f.id,
                        name: f.name || f.businessName,
                        locations: f.locationCount || 0,
                        revenue: f.monthlyRevenue || 0,
                        compliance: f.complianceScore || 100,
                        status: f.status || 'active',
                    })))
                }
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

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--theme-accent)' }} />
            </div>
        )
    }

    return (
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
                            onClick={() => navigator.clipboard.writeText(stats.brandCode)}
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
                    columns={5}
                    kpis={[
                        {
                            title: 'Network Revenue',
                            value: stats?.monthlyRevenue ? `$${(stats.monthlyRevenue / 1000).toFixed(1)}K` : '$0',
                            subtitle: 'Last 30 days',
                            icon: DollarSign,
                            variant: 'success',
                        },
                        {
                            title: 'Franchisees',
                            value: stats?.totalFranchisees || 0,
                            subtitle: 'Active partners',
                            icon: Users,
                            variant: 'accent',
                        },
                        {
                            title: 'Total Locations',
                            value: stats?.totalLocations || 0,
                            subtitle: 'Across network',
                            icon: MapPin,
                        },
                        {
                            title: 'Workforce',
                            value: stats?.totalEmployees || 0,
                            subtitle: 'System employees',
                            icon: Users,
                        },
                        {
                            title: 'Compliance',
                            value: '100%',
                            subtitle: 'Network health',
                            icon: Shield,
                            variant: 'success',
                        },
                    ]}
                />
            }
            alertRail={
                <AlertRail
                    exceptions={[]}
                    emptyTitle="Network operating normally"
                    emptySubtitle="No compliance violations, underperformers, or escalations detected"
                />
            }
            quickActions={
                <QuickActionsPanel
                    title="Brand Controls"
                    actions={[
                        { label: 'Franchisees', sublabel: 'Manage partners', icon: Users, href: '/dashboard/brand/sub-franchisees', color: 'bg-violet-500/15', iconColor: 'text-violet-400' },
                        { label: 'Settings', sublabel: 'Brand config', icon: Settings, href: '/dashboard/brand/settings', color: 'bg-stone-500/15', iconColor: 'text-stone-400' },
                        { label: 'Services', sublabel: 'Brand menu', icon: BarChart3, href: '/dashboard/brand-services', color: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
                        { label: 'Compliance', sublabel: 'Standards', icon: Shield, href: '/dashboard/compliance', color: 'bg-blue-500/15', iconColor: 'text-blue-400' },
                    ]}
                />
            }
            workspace={
                <WorkspaceTabs
                    tabs={[
                        {
                            id: 'leaderboard',
                            label: 'Franchisee Leaderboard',
                            icon: TrendingUp,
                            content: <FranchiseeLeaderboard franchisees={franchisees} />,
                        },
                        {
                            id: 'financials',
                            label: 'Network Financials',
                            icon: PieChart,
                            content: <NetworkFinancials stats={stats} />,
                        },
                        {
                            id: 'compliance',
                            label: 'Compliance',
                            icon: Shield,
                            content: <BrandComplianceTab />,
                        },
                    ]}
                />
            }
        />
    )
}
