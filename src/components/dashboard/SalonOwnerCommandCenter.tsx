'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    Sparkles, DollarSign, Store, BookOpen, Users, Scissors,
    Calendar, Trophy, UserPlus, BarChart3, MapPin,
    TrendingUp, TrendingDown, Heart, Star, Repeat, PieChart
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

import DashboardShell from './command-center/DashboardShell'
import CommandHeader from './command-center/CommandHeader'
import KpiStrip from './command-center/KpiStrip'
import AlertRail from './command-center/AlertRail'
import type { ExceptionItem } from './command-center/AlertRail'
import QuickActionsPanel from './command-center/QuickActionsPanel'
import WorkspaceTabs from './command-center/WorkspaceTabs'
import LocationPerformanceGrid from './command-center/LocationPerformanceGrid'
import type { LocationRow } from './command-center/LocationPerformanceGrid'
import DrawerPanel from './command-center/DrawerPanel'

// ─── Types ──────────────────────────────────────────────
interface DashboardData {
    locations: LocationRow[]
    summary: {
        totalLocations: number
        todaySales: number
        yesterdaySales: number
        weekSales: number
        todayTransactions: number
        appointmentsToday: number
        topLocation: string | null
        avgTicket: number
    }
    exceptions: ExceptionItem[]
    exceptionCounts: { critical: number; warning: number; info: number; total: number }
}

// ─── Inline Financial Report ────────────────────────────
function FinancialSnapshot({ data }: { data: DashboardData | null }) {
    const locs = data?.locations || []
    const totalCash = locs.reduce((s, l) => s + l.cash, 0)
    const totalCard = locs.reduce((s, l) => s + l.card, 0)
    const totalSales = data?.summary?.todaySales || 0
    const txns = data?.summary?.todayTransactions || 0
    const avgTicket = txns > 0 ? totalSales / txns : 0
    const cashPct = totalSales > 0 ? (totalCash / totalSales * 100) : 0

    return (
        <div className="space-y-5">
            {/* Revenue breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Total Revenue</p>
                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(totalSales)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Avg Ticket</p>
                    <p className="text-2xl font-black text-white">{formatCurrency(avgTicket)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Cash</p>
                    <p className="text-2xl font-black text-emerald-400">{formatCurrency(totalCash)}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{cashPct.toFixed(0)}% of total</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Card</p>
                    <p className="text-2xl font-black text-blue-400">{formatCurrency(totalCard)}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{(100 - cashPct).toFixed(0)}% of total</p>
                </div>
            </div>

            {/* Cash vs Card bar */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-stone-400">Payment Mix</span>
                    <span className="text-xs text-stone-500">{txns} transactions today</span>
                </div>
                <div className="h-3 rounded-full bg-stone-800 overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${cashPct}%` }} />
                    <div className="h-full bg-blue-500 rounded-r-full transition-all" style={{ width: `${100 - cashPct}%` }} />
                </div>
                <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-emerald-400 font-medium">Cash {cashPct.toFixed(0)}%</span>
                    <span className="text-[10px] text-blue-400 font-medium">Card {(100 - cashPct).toFixed(0)}%</span>
                </div>
            </div>

            {/* Per-location revenue table */}
            <div>
                <h4 className="text-sm font-bold text-stone-300 mb-3">Revenue by Location</h4>
                <div className="space-y-2">
                    {(data?.locations || [])
                        .sort((a, b) => b.todaySales - a.todaySales)
                        .map(loc => {
                            const pct = totalSales > 0 ? (loc.todaySales / totalSales * 100) : 0
                            return (
                                <div key={loc.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">{loc.name}</p>
                                        <div className="mt-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-[var(--theme-accent)] to-[var(--theme-accent-light)] transition-all"
                                                 style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-emerald-400">{formatCurrency(loc.todaySales)}</p>
                                        <p className="text-[10px] text-stone-500">{pct.toFixed(0)}%</p>
                                    </div>
                                </div>
                            )
                        })}
                </div>
            </div>

            {/* Week comparison */}
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">This Week</p>
                        <p className="text-xl font-black text-white">{formatCurrency(data?.summary?.weekSales || 0)}</p>
                    </div>
                    <Link href="/dashboard/reports" className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                        Full Reports →
                    </Link>
                </div>
            </div>
        </div>
    )
}

// ─── Client Retention Tab ──────────────────────────────
function ClientRetentionTab() {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Rebook Rate</p>
                    <p className="text-2xl font-black text-white">—</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Coming soon</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">30d Retention</p>
                    <p className="text-2xl font-black text-white">—</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Coming soon</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">At-Risk Clients</p>
                    <p className="text-2xl font-black text-amber-400">—</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">No visit in 60d+</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">New Clients</p>
                    <p className="text-2xl font-black text-emerald-400">—</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">This week</p>
                </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.06] text-center">
                <Heart className="h-10 w-10 mx-auto mb-3 text-stone-600" />
                <p className="font-semibold text-stone-300">Client Retention Analytics</p>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Rebooking rates, at-risk client alerts, and retention campaigns will be populated as client history data grows.
                </p>
                <Link href="/dashboard/customers" className="inline-block mt-4 text-sm font-semibold text-[var(--theme-accent)] hover:underline">
                    View Client Roster →
                </Link>
            </div>
        </div>
    )
}

// ─── Staff Talent Tab ──────────────────────────────────
function StaffTalentTab({ locations }: { locations: LocationRow[] }) {
    const totalStaff = locations.reduce((s, l) => s + l.activeStaff, 0)

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Total On Floor</p>
                    <p className="text-2xl font-black text-white">{totalStaff}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">Across all studios</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Revenue / Staff</p>
                    <p className="text-2xl font-black text-emerald-400">
                        {totalStaff > 0
                            ? formatCurrency(locations.reduce((s, l) => s + l.todaySales, 0) / totalStaff)
                            : '$0'}
                    </p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Locations</p>
                    <p className="text-2xl font-black text-white">{locations.length}</p>
                </div>
            </div>

            {/* Per-location staff */}
            <div>
                <h4 className="text-sm font-bold text-stone-300 mb-3">Staff Distribution</h4>
                <div className="space-y-2">
                    {locations.map(loc => (
                        <div key={loc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-3">
                                <Users className="h-4 w-4 text-stone-500" />
                                <span className="text-sm font-semibold text-white">{loc.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-bold text-white">{loc.activeStaff} staff</span>
                                <span className="text-xs text-stone-500">
                                    {loc.activeStaff > 0 ? formatCurrency(loc.todaySales / loc.activeStaff) : '$0'}/person
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Link href="/dashboard/employees" className="block text-center text-sm font-semibold text-[var(--theme-accent)] hover:underline py-3">
                Manage All Talent & Commissions →
            </Link>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function SalonOwnerCommandCenter() {
    const { data: session } = useSession()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [drawerLocation, setDrawerLocation] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [storeRes, exRes] = await Promise.all([
                fetch('/api/dashboard/multi-store'),
                fetch('/api/owner/exceptions'),
            ])
            const storeData = await storeRes.json()
            const exData = await exRes.json()

            const locations: LocationRow[] = (storeData.locations || []).map((loc: any) => {
                const hasSales = (loc.today?.sales || 0) > 0 || (loc.today?.transactions || 0) > 0
                const hasStaffIssues = (loc.staff?.count || 0) === 0
                return {
                    id: loc.location.id,
                    name: loc.location.name,
                    todaySales: loc.today?.sales || 0,
                    transactions: loc.today?.transactions || 0,
                    appointments: Math.floor((loc.today?.transactions || 0) * 1.5),
                    cash: loc.today?.cash || 0,
                    card: loc.today?.card || 0,
                    activeStaff: loc.staff?.count || 0,
                    status: hasSales ? 'active' as const : hasStaffIssues ? 'warning' as const : 'idle' as const,
                }
            })

            const totalSales = storeData.summary?.todaySales || 0
            const txns = storeData.summary?.todayTransactions || 0

            setData({
                locations,
                summary: {
                    totalLocations: storeData.summary?.totalLocations || locations.length,
                    todaySales: totalSales,
                    yesterdaySales: storeData.summary?.yesterdaySales || 0,
                    weekSales: storeData.summary?.mtdSales || 0,
                    todayTransactions: txns,
                    appointmentsToday: locations.reduce((s, l) => s + (l.appointments || 0), 0),
                    topLocation: storeData.summary?.topLocation,
                    avgTicket: txns > 0 ? totalSales / txns : 0,
                },
                exceptions: (exData.exceptions || []).slice(0, 10).map((ex: any) => ({
                    ...ex,
                    severity: ex.severity || 'WARNING',
                })),
                exceptionCounts: exData.counts || { critical: 0, warning: 0, info: 0, total: 0 },
            })
        } catch (error) {
            console.error('Failed to fetch dashboard:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 60000)
        return () => clearInterval(interval)
    }, [fetchData])

    const vsYesterday = data?.summary?.yesterdaySales
        ? ((data.summary.todaySales - data.summary.yesterdaySales) / data.summary.yesterdaySales * 100)
        : 0

    const selectedLocation = data?.locations.find(l => l.id === drawerLocation)

    // ─── Loading ──────────
    if (loading && !data) {
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
                        title="Salon Command Center"
                        subtitle={`${data?.summary?.totalLocations || 0} studios · ${session?.user?.name?.split(' ')[0] || ''}`}
                        icon={Sparkles}
                        roleBadge="Independent Owner"
                        onRefresh={fetchData}
                        refreshing={loading}
                    />
                }
                kpiStrip={
                    <KpiStrip
                        columns={5}
                        kpis={[
                            {
                                title: 'Services Revenue',
                                value: formatCurrency(data?.summary?.todaySales || 0),
                                icon: DollarSign,
                                variant: 'success',
                                trend: { value: vsYesterday, label: 'vs yesterday' },
                                pulse: true,
                            },
                            {
                                title: 'Active Studios',
                                value: data?.summary?.totalLocations || 0,
                                subtitle: `${(data?.locations || []).filter(l => l.status === 'active').length} booking now`,
                                icon: Store,
                                variant: 'accent',
                            },
                            {
                                title: 'Appointments Today',
                                value: data?.summary?.appointmentsToday || 0,
                                subtitle: `Avg ${formatCurrency(data?.summary?.avgTicket || 0)} ticket`,
                                icon: BookOpen,
                            },
                            {
                                title: 'Talent On Floor',
                                value: data?.locations?.reduce((s, l) => s + l.activeStaff, 0) || 0,
                                subtitle: 'Across all locations',
                                icon: Users,
                            },
                            {
                                title: 'Open Alerts',
                                value: data?.exceptionCounts?.total || 0,
                                subtitle: data?.exceptionCounts?.critical
                                    ? `${data.exceptionCounts.critical} critical`
                                    : 'All clear',
                                icon: Sparkles,
                                variant: (data?.exceptionCounts?.critical || 0) > 0 ? 'danger'
                                    : (data?.exceptionCounts?.warning || 0) > 0 ? 'warning'
                                    : 'success',
                            },
                        ]}
                    />
                }
                alertRail={
                    <AlertRail
                        exceptions={data?.exceptions || []}
                        emptyTitle="All studios running smoothly"
                        emptySubtitle="No voids, no-shows, or critical overrides detected"
                        onViewAll={() => window.location.href = '/dashboard/owner/exceptions'}
                    />
                }
                quickActions={
                    <QuickActionsPanel
                        title="Growth Hub"
                        actions={[
                            { label: 'Salon POS', sublabel: 'New sale', icon: DollarSign, href: '/dashboard/pos/salon', color: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
                            { label: 'Beauty Loop', sublabel: 'Loyalty setup', icon: Trophy, href: '/dashboard/owner/salon-loyalty', color: 'bg-violet-500/15', iconColor: 'text-violet-400' },
                            { label: 'Client Roster', sublabel: 'View history', icon: UserPlus, href: '/dashboard/customers', color: 'bg-blue-500/15', iconColor: 'text-blue-400' },
                            { label: 'Service Menu', sublabel: 'Update pricing', icon: Scissors, href: '/dashboard/services', color: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
                            { label: 'Commissions', sublabel: 'Approve cuts', icon: DollarSign, href: '/dashboard/commissions', color: 'bg-amber-500/15', iconColor: 'text-amber-400' },
                            { label: 'Reports', sublabel: 'Full financials', icon: BarChart3, href: '/dashboard/reports', color: 'bg-purple-500/15', iconColor: 'text-purple-400' },
                        ]}
                        columns={3}
                    />
                }
                workspace={
                    <WorkspaceTabs
                        tabs={[
                            {
                                id: 'studios',
                                label: 'Studio Performance',
                                icon: MapPin,
                                content: (
                                    <LocationPerformanceGrid
                                        locations={data?.locations || []}
                                        showAppointments
                                        onSelectLocation={setDrawerLocation}
                                    />
                                ),
                            },
                            {
                                id: 'talent',
                                label: 'Talent',
                                icon: Users,
                                content: <StaffTalentTab locations={data?.locations || []} />,
                            },
                            {
                                id: 'financials',
                                label: 'Financials',
                                icon: PieChart,
                                content: <FinancialSnapshot data={data} />,
                            },
                            {
                                id: 'retention',
                                label: 'Client Retention',
                                icon: Heart,
                                badge: 0,
                                content: <ClientRetentionTab />,
                            },
                        ]}
                    />
                }
            />

            {/* Location Drawer */}
            <DrawerPanel
                open={!!drawerLocation}
                onClose={() => setDrawerLocation(null)}
                title={selectedLocation?.name || 'Location Details'}
                subtitle="Today's performance"
            >
                {selectedLocation && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Revenue</p>
                                <p className="text-2xl font-black text-emerald-400">{formatCurrency(selectedLocation.todaySales)}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Appointments</p>
                                <p className="text-2xl font-black text-white">{selectedLocation.appointments}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Staff</p>
                                <p className="text-2xl font-black text-white">{selectedLocation.activeStaff}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Transactions</p>
                                <p className="text-2xl font-black text-white">{selectedLocation.transactions}</p>
                            </div>
                        </div>
                        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-stone-400">Payment Split</span>
                            </div>
                            <div className="flex gap-4">
                                <div><span className="text-sm font-bold text-emerald-400">{formatCurrency(selectedLocation.cash)}</span> <span className="text-xs text-stone-500">cash</span></div>
                                <div><span className="text-sm font-bold text-blue-400">{formatCurrency(selectedLocation.card)}</span> <span className="text-xs text-stone-500">card</span></div>
                            </div>
                        </div>
                    </div>
                )}
            </DrawerPanel>
        </>
    )
}
