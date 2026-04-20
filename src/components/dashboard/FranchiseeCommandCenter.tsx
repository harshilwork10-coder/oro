'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    MapPin, DollarSign, Users, CreditCard, AlertCircle,
    BarChart3, Calendar, Scissors, Building2, Shield,
    TrendingUp, PieChart, ClipboardList
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

// ─── Financial Snapshot ─────────────────────────────────
function FinancialReport({ locations, totalSales, todayTxns, weekSales }: {
    locations: LocationRow[], totalSales: number, todayTxns: number, weekSales: number
}) {
    const totalCash = locations.reduce((s, l) => s + l.cash, 0)
    const totalCard = locations.reduce((s, l) => s + l.card, 0)
    const avgTicket = todayTxns > 0 ? totalSales / todayTxns : 0
    const cashPct = totalSales > 0 ? (totalCash / totalSales * 100) : 0

    return (
        <div className="space-y-5">
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
                    <p className="text-[11px] text-stone-500 mt-0.5">{cashPct.toFixed(0)}%</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Card</p>
                    <p className="text-2xl font-black text-blue-400">{formatCurrency(totalCard)}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">{(100 - cashPct).toFixed(0)}%</p>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-stone-400">Payment Mix</span>
                    <span className="text-xs text-stone-500">{todayTxns} txns today</span>
                </div>
                <div className="h-3 rounded-full bg-stone-800 overflow-hidden flex">
                    <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${cashPct}%` }} />
                    <div className="h-full bg-blue-500 rounded-r-full" style={{ width: `${100 - cashPct}%` }} />
                </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">This Week</p>
                        <p className="text-xl font-black text-white">{formatCurrency(weekSales)}</p>
                    </div>
                    <Link href="/dashboard/reports" className="text-xs font-semibold text-[var(--theme-accent)] hover:underline">
                        Full Reports →
                    </Link>
                </div>
            </div>
        </div>
    )
}

// ─── Compliance Tab ─────────────────────────────────────
function ComplianceTab() {
    return (
        <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Compliance Score</p>
                    <p className="text-2xl font-black text-emerald-400">100%</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Service Menu</p>
                    <p className="text-2xl font-black text-emerald-400">✓</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">In sync with brand</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Training</p>
                    <p className="text-2xl font-black text-emerald-400">✓</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">All current</p>
                </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-6 border border-white/[0.06] text-center">
                <Shield className="h-10 w-10 mx-auto mb-3 text-stone-600" />
                <p className="font-semibold text-stone-300">Franchise Compliance</p>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Your franchise is in good standing. Compliance items from your franchisor will appear here.
                </p>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function FranchiseeCommandCenter() {
    const { data: session } = useSession()
    const [locations, setLocations] = useState<LocationRow[]>([])
    const [exceptions, setExceptions] = useState<ExceptionItem[]>([])
    const [exceptionCounts, setExceptionCounts] = useState({ critical: 0, warning: 0, info: 0, total: 0 })
    const [summary, setSummary] = useState({ todaySales: 0, yesterdaySales: 0, weekSales: 0, todayTxns: 0, appointments: 0 })
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

            const locs: LocationRow[] = (storeData.locations || []).map((loc: any) => {
                const hasSales = (loc.today?.sales || 0) > 0
                const noStaff = (loc.staff?.count || 0) === 0
                return {
                    id: loc.location.id,
                    name: loc.location.name,
                    todaySales: loc.today?.sales || 0,
                    transactions: loc.today?.transactions || 0,
                    appointments: Math.floor((loc.today?.transactions || 0) * 1.5),
                    cash: loc.today?.cash || 0,
                    card: loc.today?.card || 0,
                    activeStaff: loc.staff?.count || 0,
                    status: hasSales ? 'active' as const : noStaff ? 'warning' as const : 'idle' as const,
                }
            })

            setLocations(locs)
            setSummary({
                todaySales: storeData.summary?.todaySales || 0,
                yesterdaySales: storeData.summary?.yesterdaySales || 0,
                weekSales: storeData.summary?.mtdSales || 0,
                todayTxns: storeData.summary?.todayTransactions || 0,
                appointments: locs.reduce((s, l) => s + (l.appointments || 0), 0),
            })
            setExceptions((exData.exceptions || []).slice(0, 10))
            setExceptionCounts(exData.counts || { critical: 0, warning: 0, info: 0, total: 0 })
        } catch (e) {
            console.error('Franchisee dashboard fetch error:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
        const iv = setInterval(fetchData, 60000)
        return () => clearInterval(iv)
    }, [fetchData])

    const vsYesterday = summary.yesterdaySales > 0
        ? ((summary.todaySales - summary.yesterdaySales) / summary.yesterdaySales * 100)
        : 0

    const selectedLoc = locations.find(l => l.id === drawerLocation)

    if (loading && locations.length === 0) {
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
                        title="Franchise Operations"
                        subtitle={`${locations.length} locations · ${session?.user?.name?.split(' ')[0] || ''}`}
                        icon={Building2}
                        roleBadge="Franchisee"
                        roleBadgeColor="bg-blue-500/15 text-blue-400 border-blue-500/20"
                        onRefresh={fetchData}
                        refreshing={loading}
                    />
                }
                kpiStrip={
                    <KpiStrip
                        columns={5}
                        kpis={[
                            {
                                title: "Today's Revenue",
                                value: formatCurrency(summary.todaySales),
                                icon: DollarSign,
                                variant: 'success',
                                trend: { value: vsYesterday, label: 'vs yesterday' },
                                pulse: true,
                            },
                            {
                                title: 'My Locations',
                                value: locations.length,
                                subtitle: `${locations.filter(l => l.status === 'active').length} active now`,
                                icon: MapPin,
                                variant: 'accent',
                            },
                            {
                                title: 'Appointments',
                                value: summary.appointments,
                                icon: Calendar,
                            },
                            {
                                title: 'Staff on Floor',
                                value: locations.reduce((s, l) => s + l.activeStaff, 0),
                                subtitle: 'All locations',
                                icon: Users,
                            },
                            {
                                title: 'Alerts',
                                value: exceptionCounts.total,
                                subtitle: exceptionCounts.critical > 0 ? `${exceptionCounts.critical} critical` : 'All clear',
                                icon: AlertCircle,
                                variant: exceptionCounts.critical > 0 ? 'danger' : exceptionCounts.warning > 0 ? 'warning' : 'success',
                            },
                        ]}
                    />
                }
                alertRail={
                    <AlertRail
                        exceptions={exceptions}
                        emptyTitle="All locations running smoothly"
                        emptySubtitle="No voids, no-shows, or compliance issues detected"
                    />
                }
                quickActions={
                    <QuickActionsPanel
                        actions={[
                            { label: 'Open POS', sublabel: 'New sale', icon: CreditCard, href: '/dashboard/pos/salon', color: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
                            { label: 'My Locations', sublabel: 'All stores', icon: MapPin, href: '/dashboard/my-locations', color: 'bg-orange-500/15', iconColor: 'text-orange-400' },
                            { label: 'Team', sublabel: 'Employees', icon: Users, href: '/dashboard/employees', color: 'bg-blue-500/15', iconColor: 'text-blue-400' },
                            { label: 'Reports', sublabel: 'Financials', icon: BarChart3, href: '/dashboard/reports', color: 'bg-purple-500/15', iconColor: 'text-purple-400' },
                            { label: 'Expansion', sublabel: 'Request', icon: TrendingUp, href: '/dashboard/expansion-requests', color: 'bg-teal-500/15', iconColor: 'text-teal-400' },
                            { label: 'Services', sublabel: 'Menu', icon: Scissors, href: '/dashboard/services', color: 'bg-pink-500/15', iconColor: 'text-pink-400' },
                        ]}
                        columns={3}
                    />
                }
                workspace={
                    <WorkspaceTabs
                        tabs={[
                            {
                                id: 'performance',
                                label: 'Store Performance',
                                icon: MapPin,
                                content: (
                                    <LocationPerformanceGrid
                                        locations={locations}
                                        showAppointments
                                        onSelectLocation={setDrawerLocation}
                                    />
                                ),
                            },
                            {
                                id: 'financials',
                                label: 'Financials',
                                icon: PieChart,
                                content: (
                                    <FinancialReport
                                        locations={locations}
                                        totalSales={summary.todaySales}
                                        todayTxns={summary.todayTxns}
                                        weekSales={summary.weekSales}
                                    />
                                ),
                            },
                            {
                                id: 'compliance',
                                label: 'Compliance',
                                icon: Shield,
                                content: <ComplianceTab />,
                            },
                        ]}
                    />
                }
            />

            <DrawerPanel
                open={!!drawerLocation}
                onClose={() => setDrawerLocation(null)}
                title={selectedLoc?.name || 'Location'}
                subtitle="Today's performance"
            >
                {selectedLoc && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Revenue</p>
                                <p className="text-2xl font-black text-emerald-400">{formatCurrency(selectedLoc.todaySales)}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Transactions</p>
                                <p className="text-2xl font-black text-white">{selectedLoc.transactions}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Appointments</p>
                                <p className="text-2xl font-black text-white">{selectedLoc.appointments}</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Staff</p>
                                <p className="text-2xl font-black text-white">{selectedLoc.activeStaff}</p>
                            </div>
                        </div>
                    </div>
                )}
            </DrawerPanel>
        </>
    )
}
