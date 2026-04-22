'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { formatCurrency } from '@/lib/utils'
import {
    DollarSign, TrendingUp, Users, MapPin, AlertTriangle, ShoppingCart,
    BarChart3, Calendar, Clock, HeartPulse, Package, CreditCard,
    Scissors, ChevronRight, ArrowUpDown, Target, Activity, Star,
} from 'lucide-react'

import {
    OwnerPageShell, OwnerTopBar, OwnerKpiStrip, OwnerActionCenter,
    OwnerExceptionRail, OwnerDrawer, OwnerLoading,
    SectionAnchorBar, useActiveSection,
    Card, SectionHead, MetricCard, HealthBadge, Delta, StatusBadge,
    SmartTableToolbar, SortTH, useSortable, TabBar, DataFresh,
    type OwnerKpiDef, type ActionItem, type ExceptionItem, type AnchorSection,
} from '@/components/dashboard/owner-os/OwnerPrimitives'

// ── Helpers ─────────────────────────────────────────────────────
function fmt(n: number) { return formatCurrency(n) }
function fmtK(n: number) { return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}` }

// ═══════════════════════════════════════════════════════════════
// MULTI-LOCATION FRANCHISEE OWNER — ONE-PAGE OPERATING SYSTEM
// ═══════════════════════════════════════════════════════════════

interface LocationData {
    location: { id: string; name: string; address?: string }
    today: { sales: number; transactions: number; cash: number; card: number; avgTicket: number; appointments: number }
    yesterday: { sales: number; transactions: number }
    mtd: { sales: number; transactions: number }
    inventory: { lowStock: number }
    staff: { total: number; onClock: number; count: number }
    appointments: { today: number; noShowPct: number }
    retention: { repeatPct: number; uniqueClients: number }
    health: number
    topIssue: string
    recommendedAction: string
    status: string
    growth: number
    exceptions: number
}

interface DashboardPayload {
    locations: LocationData[]
    summary: {
        totalLocations: number; todaySales: number; todayTransactions: number
        yesterdaySales: number; mtdSales: number; totalStaff: number; totalOnClock: number
        totalAppointments: number; lowStockTotal: number; topLocation: string | null
        avgHealth: number; healthBreakdown: { green: number; yellow: number; red: number }
    }
    attentionItems: ActionItem[]
    exceptions: ExceptionItem[]
    _meta: { queriedAt: string; lastUpdatedAt: string; businessDate: string; freshness: string; dataTruth: string }
}

const SECTIONS: AnchorSection[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'operations', label: 'Operations', icon: BarChart3 },
    { id: 'reporting', label: 'Reporting', icon: TrendingUp },
]

const TABLE_PRESETS = [
    { id: 'all', label: 'All Stores' },
    { id: 'needs-attention', label: 'Needs Attention' },
    { id: 'top-performers', label: 'Top Performers' },
    { id: 'idle', label: 'Idle / Offline' },
]

export default function MultiLocationOwnerOS() {
    const { data: session } = useSession()
    const [data, setData] = useState<DashboardPayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [drawerLocId, setDrawerLocId] = useState<string | null>(null)
    const [tablePreset, setTablePreset] = useState('all')
    const [tableSearch, setTableSearch] = useState('')
    const [reportTab, setReportTab] = useState('locations')

    const activeSection = useActiveSection(['overview', 'locations', 'operations', 'reporting'])

    // ── Data fetch ──────────────────────────────────────────────────
    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/dashboard/multi-store')
            if (res.ok) {
                const payload = await res.json()
                setData(payload)
            }
        } catch (e) { console.error('[OWNER_OS] Fetch error:', e) }
        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Computed ─────────────────────────────────────────────────────
    const s = data?.summary
    const locs = data?.locations || []
    const meta = data?._meta

    const salesDelta = s && s.yesterdaySales > 0
        ? ((s.todaySales - s.yesterdaySales) / s.yesterdaySales * 100) : 0
    const avgTicket = s && s.todayTransactions > 0 ? s.todaySales / s.todayTransactions : 0

    // ── Table filtering + sorting ───────────────────────────────────
    const filteredLocs = useMemo(() => {
        let out = locs
        if (tablePreset === 'needs-attention') out = out.filter(l => l.health < 60 || l.topIssue)
        else if (tablePreset === 'top-performers') out = out.filter(l => l.health >= 80)
        else if (tablePreset === 'idle') out = out.filter(l => l.status === 'idle' || l.status === 'offline')
        if (tableSearch) {
            const q = tableSearch.toLowerCase()
            out = out.filter(l => l.location.name.toLowerCase().includes(q))
        }
        return out
    }, [locs, tablePreset, tableSearch])

    const { sorted, field, dir, toggle } = useSortable(filteredLocs, 'today' as any, 'desc')
    const sortedLocs = useMemo(() => {
        // Custom sort because nested fields
        const f = field as string
        return [...filteredLocs].sort((a, b) => {
            let av: number, bv: number
            switch (f) {
                case 'sales': av = a.today.sales; bv = b.today.sales; break
                case 'health': av = a.health; bv = b.health; break
                case 'transactions': av = a.today.transactions; bv = b.today.transactions; break
                case 'avgTicket': av = a.today.avgTicket; bv = b.today.avgTicket; break
                case 'staff': av = a.staff.total; bv = b.staff.total; break
                case 'growth': av = a.growth; bv = b.growth; break
                case 'repeatPct': av = a.retention.repeatPct; bv = b.retention.repeatPct; break
                case 'lowStock': av = a.inventory.lowStock; bv = b.inventory.lowStock; break
                default: av = a.today.sales; bv = b.today.sales
            }
            return dir === 'asc' ? av - bv : bv - av
        })
    }, [filteredLocs, field, dir])

    const drawerLoc = drawerLocId ? locs.find(l => l.location.id === drawerLocId) : null

    // ── Loading ─────────────────────────────────────────────────────
    if (loading) return <OwnerLoading label="Loading store data…" />

    // ═════════════════════════════════════════════════════════════════
    // RENDER — 7-ROW ONE-PAGE OPERATING SYSTEM
    // ═════════════════════════════════════════════════════════════════

    return (
        <>
            <OwnerPageShell>
                {/* ─── ROW 0: TOP BAR ─── */}
                <OwnerTopBar
                    title="Owner Command Center"
                    subtitle={`${s?.totalLocations || 0} locations · ${meta?.businessDate || 'Today'}`}
                    badge="Multi-Store"
                    badgeColor="bg-violet-500/15 text-violet-400 border-violet-500/20"
                    icon={MapPin}
                    fetchedAt={meta?.lastUpdatedAt}
                    onRefresh={() => fetchData(true)}
                    refreshing={refreshing}
                />

                {/* ─── SECTION ANCHOR BAR ─── */}
                <SectionAnchorBar sections={SECTIONS} active={activeSection} />

                {/* ─── ROW 1: KPI STRIP ─── */}
                <section id="overview">
                    <OwnerKpiStrip
                        fetchedAt={meta?.lastUpdatedAt}
                        kpis={[
                            {
                                title: "Today's Revenue", value: fmt(s?.todaySales || 0),
                                delta: salesDelta, sub: `Yesterday: ${fmt(s?.yesterdaySales || 0)}`,
                                variant: 'success', icon: DollarSign, pulse: true,
                            },
                            {
                                title: 'MTD Revenue', value: fmtK(s?.mtdSales || 0),
                                sub: `${s?.todayTransactions || 0} transactions today`,
                                variant: 'accent', icon: TrendingUp,
                            },
                            {
                                title: 'Appointments', value: String(s?.totalAppointments || 0),
                                sub: `Avg ticket ${fmt(avgTicket)}`, variant: 'muted', icon: Calendar,
                            },
                            {
                                title: 'Staff Active', value: `${s?.totalOnClock || 0} / ${s?.totalStaff || 0}`,
                                sub: s?.totalOnClock === 0 ? 'No staff clocked in' : 'On floor now',
                                variant: (s?.totalOnClock || 0) === 0 ? 'warning' : 'muted', icon: Users,
                            },
                            {
                                title: 'Store Health', value: String(s?.avgHealth || 0),
                                sub: `${s?.healthBreakdown?.green || 0} ✓  ${s?.healthBreakdown?.yellow || 0} ⚠  ${s?.healthBreakdown?.red || 0} ✗`,
                                variant: (s?.avgHealth || 0) >= 70 ? 'success' : (s?.avgHealth || 0) >= 50 ? 'warning' : 'danger',
                                icon: HeartPulse,
                            },
                            {
                                title: 'Open Issues', value: String((data?.attentionItems?.length || 0) + (data?.exceptions?.length || 0)),
                                sub: data?.attentionItems?.some(a => a.severity === 'critical') ? 'Critical items pending' : 'All stores operating',
                                variant: (data?.attentionItems?.length || 0) > 0 ? 'danger' : 'success', icon: AlertTriangle,
                                pulse: (data?.attentionItems?.length || 0) > 0,
                            },
                        ]}
                    />
                </section>

                {/* ─── ROW 2: ACTION CENTER + EXCEPTION RAIL ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ minHeight: 340 }}>
                    <div className="lg:col-span-3">
                        <OwnerActionCenter
                            items={data?.attentionItems || []}
                            title="Needs Attention Today"
                            fetchedAt={meta?.lastUpdatedAt}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <OwnerExceptionRail
                            items={data?.exceptions || []}
                            title="Active Exceptions"
                            fetchedAt={meta?.lastUpdatedAt}
                            emptyTitle="No exceptions"
                            emptySubtitle="All stores operating normally"
                        />
                    </div>
                </div>

                {/* ─── ROW 3: LOCATION PERFORMANCE TABLE ─── */}
                <section id="locations">
                    <Card>
                        <SectionHead title="Store Performance" icon={MapPin} badge={filteredLocs.length}
                            right={<DataFresh at={meta?.lastUpdatedAt} />}
                        />
                        <SmartTableToolbar
                            presets={TABLE_PRESETS}
                            activePreset={tablePreset}
                            onPreset={setTablePreset}
                            searchValue={tableSearch}
                            onSearch={setTableSearch}
                        />
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/[0.04]">
                                        <SortTH field="name" current={field as string} onClick={() => toggle('location' as any)}>Location</SortTH>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                                        <SortTH field="sales" current={field as string} onClick={() => toggle('sales' as any)}>Revenue</SortTH>
                                        <SortTH field="growth" current={field as string} onClick={() => toggle('growth' as any)}>vs Yday</SortTH>
                                        <SortTH field="transactions" current={field as string} onClick={() => toggle('transactions' as any)}>Txns</SortTH>
                                        <SortTH field="avgTicket" current={field as string} onClick={() => toggle('avgTicket' as any)}>Avg Ticket</SortTH>
                                        <SortTH field="staff" current={field as string} onClick={() => toggle('staff' as any)}>Staff</SortTH>
                                        <SortTH field="lowStock" current={field as string} onClick={() => toggle('lowStock' as any)}>Low Stock</SortTH>
                                        <SortTH field="repeatPct" current={field as string} onClick={() => toggle('repeatPct' as any)}>Repeat %</SortTH>
                                        <SortTH field="health" current={field as string} onClick={() => toggle('health' as any)}>Health</SortTH>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Issue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLocs.length === 0 ? (
                                        <tr><td colSpan={11} className="text-center py-12 text-stone-500">No locations match filter</td></tr>
                                    ) : (
                                        sortedLocs.map(loc => (
                                            <tr key={loc.location.id}
                                                className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                                                onClick={() => setDrawerLocId(loc.location.id)}>
                                                <td className="px-3 py-3">
                                                    <p className="text-sm font-semibold text-white">{loc.location.name}</p>
                                                    {loc.location.address && <p className="text-[10px] text-stone-600 mt-0.5 truncate max-w-[180px]">{loc.location.address}</p>}
                                                </td>
                                                <td className="px-3 py-3"><StatusBadge status={loc.status} /></td>
                                                <td className="px-3 py-3 text-sm font-bold text-emerald-400">{fmt(loc.today.sales)}</td>
                                                <td className="px-3 py-3"><Delta value={loc.growth} /></td>
                                                <td className="px-3 py-3 text-sm text-stone-300">{loc.today.transactions}</td>
                                                <td className="px-3 py-3 text-sm text-stone-300">{fmt(loc.today.avgTicket)}</td>
                                                <td className="px-3 py-3">
                                                    <span className="text-sm text-white font-medium">{loc.staff.onClock}</span>
                                                    <span className="text-[10px] text-stone-600"> / {loc.staff.total}</span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    {loc.inventory.lowStock > 0
                                                        ? <span className="text-xs font-bold text-amber-400">{loc.inventory.lowStock}</span>
                                                        : <span className="text-xs text-stone-600">—</span>}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-stone-300">{loc.retention.repeatPct.toFixed(0)}%</td>
                                                <td className="px-3 py-3"><HealthBadge score={loc.health} size="sm" /></td>
                                                <td className="px-3 py-3">
                                                    {loc.topIssue
                                                        ? <p className="text-[10px] text-amber-400 max-w-[160px] truncate">{loc.topIssue}</p>
                                                        : <span className="text-[10px] text-stone-600">—</span>}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </section>

                {/* ─── ROW 4: TEAM + CUSTOMER SPLIT ─── */}
                <section id="operations">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Team Performance */}
                        <Card className="p-5">
                            <SectionHead title="Team Performance" icon={Users} />
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <MetricCard label="Total Staff" value={s?.totalStaff || 0} />
                                <MetricCard label="On Clock" value={s?.totalOnClock || 0} color={s?.totalOnClock ? 'text-emerald-400' : 'text-amber-400'} />
                                <MetricCard label="Rev / Staff" value={s?.totalOnClock ? fmt(s.todaySales / s.totalOnClock) : '—'} color="text-violet-400" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Revenue per Staff by Location</p>
                                {locs.slice().sort((a, b) => {
                                    const aRPS = a.staff.onClock > 0 ? a.today.sales / a.staff.onClock : 0
                                    const bRPS = b.staff.onClock > 0 ? b.today.sales / b.staff.onClock : 0
                                    return bRPS - aRPS
                                }).slice(0, 6).map(loc => {
                                    const rps = loc.staff.onClock > 0 ? loc.today.sales / loc.staff.onClock : 0
                                    const maxRps = locs.reduce((m, l) => Math.max(m, l.staff.onClock > 0 ? l.today.sales / l.staff.onClock : 0), 1)
                                    return (
                                        <div key={loc.location.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                            <span className="text-xs font-semibold text-white min-w-[120px] truncate">{loc.location.name}</span>
                                            <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                                <div className="h-full rounded-full bg-violet-500/60 transition-all" style={{ width: `${(rps / maxRps) * 100}%` }} />
                                            </div>
                                            <span className="text-xs font-bold text-violet-400 min-w-[60px] text-right">{fmt(rps)}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>

                        {/* Customer Intelligence */}
                        <Card className="p-5">
                            <SectionHead title="Customer Intelligence" icon={HeartPulse} />
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <MetricCard label="Unique Clients" value={locs.reduce((s, l) => s + l.retention.uniqueClients, 0)} />
                                <MetricCard label="Avg Repeat %" value={`${locs.length > 0 ? (locs.reduce((s, l) => s + l.retention.repeatPct, 0) / locs.length).toFixed(0) : 0}%`} color="text-emerald-400" />
                                <MetricCard label="Avg No-Show" value={`${locs.length > 0 ? (locs.reduce((s, l) => s + l.appointments.noShowPct, 0) / locs.length).toFixed(1) : 0}%`}
                                    color={locs.some(l => l.appointments.noShowPct > 15) ? 'text-red-400' : 'text-stone-300'} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Repeat Rate by Location</p>
                                {locs.slice().sort((a, b) => b.retention.repeatPct - a.retention.repeatPct).slice(0, 6).map(loc => (
                                    <div key={loc.location.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                        <span className="text-xs font-semibold text-white min-w-[120px] truncate">{loc.location.name}</span>
                                        <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                            <div className="h-full rounded-full bg-emerald-500/60 transition-all" style={{ width: `${loc.retention.repeatPct}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400 min-w-[40px] text-right">{loc.retention.repeatPct.toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </section>

                {/* ─── ROW 5: FINANCIALS + INVENTORY + PAYMENTS ─── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Financial Snapshot */}
                    <Card className="p-5">
                        <SectionHead title="Financial Snapshot" icon={CreditCard} />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                                <span className="text-xs text-stone-400">Today</span>
                                <span className="text-sm font-bold text-emerald-400">{fmt(s?.todaySales || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                                <span className="text-xs text-stone-400">Yesterday</span>
                                <span className="text-sm font-bold text-white">{fmt(s?.yesterdaySales || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                                <span className="text-xs text-stone-400">MTD</span>
                                <span className="text-sm font-bold text-white">{fmtK(s?.mtdSales || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                                <span className="text-xs text-stone-400">Avg Ticket</span>
                                <span className="text-sm font-bold text-white">{fmt(avgTicket)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-xs text-stone-400">vs Yesterday</span>
                                <Delta value={salesDelta} />
                            </div>
                        </div>
                    </Card>

                    {/* Inventory Blockers */}
                    <Card className="p-5">
                        <SectionHead title="Inventory Blockers" icon={Package} badge={s?.lowStockTotal || 0} />
                        {(s?.lowStockTotal || 0) === 0 ? (
                            <div className="text-center py-8">
                                <Package className="h-8 w-8 mx-auto text-stone-700 mb-2" />
                                <p className="text-sm text-stone-400">Inventory healthy</p>
                                <p className="text-[10px] text-stone-600 mt-0.5">No critical low-stock items</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {locs.filter(l => l.inventory.lowStock > 0).sort((a, b) => b.inventory.lowStock - a.inventory.lowStock).slice(0, 5).map(loc => (
                                    <div key={loc.location.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
                                        <span className="text-xs font-semibold text-white">{loc.location.name}</span>
                                        <span className="text-xs font-bold text-amber-400">{loc.inventory.lowStock} items</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Payment Split */}
                    <Card className="p-5">
                        <SectionHead title="Payment Breakdown" icon={CreditCard} />
                        {(() => {
                            const totalCash = locs.reduce((s, l) => s + l.today.cash, 0)
                            const totalCard = locs.reduce((s, l) => s + l.today.card, 0)
                            const total = totalCash + totalCard
                            const cashPct = total > 0 ? (totalCash / total * 100) : 0
                            return (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <MetricCard label="Cash" value={fmt(totalCash)} color="text-emerald-400" sub={`${cashPct.toFixed(0)}%`} />
                                        <MetricCard label="Card" value={fmt(totalCard)} color="text-blue-400" sub={`${(100 - cashPct).toFixed(0)}%`} />
                                    </div>
                                    <div>
                                        <div className="h-2.5 rounded-full bg-stone-800 overflow-hidden flex">
                                            <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${cashPct}%` }} />
                                            <div className="h-full bg-blue-500 rounded-r-full transition-all" style={{ width: `${100 - cashPct}%` }} />
                                        </div>
                                        <div className="flex justify-between mt-1.5">
                                            <span className="text-[9px] font-medium text-emerald-400">Cash</span>
                                            <span className="text-[9px] font-medium text-blue-400">Card</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                                        <span className="text-xs text-stone-400">Total Transactions</span>
                                        <span className="text-sm font-bold text-white">{s?.todayTransactions || 0}</span>
                                    </div>
                                </div>
                            )
                        })()}
                    </Card>
                </div>

                {/* ─── ROW 6: DEEP REPORTING CENTER ─── */}
                <section id="reporting">
                    <Card>
                        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <SectionHead title="Reporting Center" icon={BarChart3} />
                            </div>
                            <TabBar tabs={[
                                { id: 'locations', label: 'Locations', count: locs.length },
                                { id: 'sales', label: 'Sales' },
                                { id: 'staff', label: 'Staff' },
                                { id: 'customers', label: 'Customers' },
                            ]} active={reportTab} onChange={setReportTab} />
                        </div>
                        <div className="p-5 min-h-[300px]">
                            {reportTab === 'locations' && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {locs.map(loc => (
                                        <div key={loc.location.id} onClick={() => setDrawerLocId(loc.location.id)}
                                            className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-white truncate">{loc.location.name}</p>
                                                <HealthBadge score={loc.health} size="sm" />
                                            </div>
                                            <p className="text-lg font-black text-emerald-400">{fmt(loc.today.sales)}</p>
                                            <Delta value={loc.growth} />
                                            <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-500">
                                                <span>{loc.today.transactions} txns</span>
                                                <span>{loc.staff.onClock}/{loc.staff.total} staff</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {reportTab === 'sales' && (
                                <div className="space-y-3">
                                    {locs.sort((a, b) => b.today.sales - a.today.sales).map((loc, i) => {
                                        const maxSales = locs.reduce((m, l) => Math.max(m, l.today.sales), 1)
                                        return (
                                            <div key={loc.location.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                                <span className="text-sm font-bold text-stone-600 w-6">{i + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">{loc.location.name}</p>
                                                    <div className="mt-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${(loc.today.sales / maxSales) * 100}%` }} />
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-400">{fmt(loc.today.sales)}</p>
                                                    <Delta value={loc.growth} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            {reportTab === 'staff' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/[0.04]">
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Location</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Total</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">On Clock</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Coverage</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Rev / Staff</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {locs.map(loc => (
                                                <tr key={loc.location.id} className="border-b border-white/[0.03]">
                                                    <td className="px-3 py-2.5 text-sm font-semibold text-white">{loc.location.name}</td>
                                                    <td className="px-3 py-2.5 text-sm text-stone-300">{loc.staff.total}</td>
                                                    <td className="px-3 py-2.5 text-sm text-stone-300">{loc.staff.onClock}</td>
                                                    <td className="px-3 py-2.5">
                                                        <span className={`text-sm font-bold ${loc.staff.total > 0 && loc.staff.onClock > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            {loc.staff.total > 0 ? `${Math.round(loc.staff.onClock / loc.staff.total * 100)}%` : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-sm font-bold text-violet-400">
                                                        {loc.staff.onClock > 0 ? fmt(loc.today.sales / loc.staff.onClock) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {reportTab === 'customers' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/[0.04]">
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Location</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Unique (30d)</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Repeat %</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">No-Show %</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Appts Today</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {locs.map(loc => (
                                                <tr key={loc.location.id} className="border-b border-white/[0.03]">
                                                    <td className="px-3 py-2.5 text-sm font-semibold text-white">{loc.location.name}</td>
                                                    <td className="px-3 py-2.5 text-sm text-stone-300">{loc.retention.uniqueClients}</td>
                                                    <td className="px-3 py-2.5 text-sm font-bold text-emerald-400">{loc.retention.repeatPct.toFixed(0)}%</td>
                                                    <td className="px-3 py-2.5">
                                                        <span className={`text-sm font-bold ${loc.appointments.noShowPct > 15 ? 'text-red-400' : 'text-stone-300'}`}>
                                                            {loc.appointments.noShowPct.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-sm text-stone-300">{loc.appointments.today}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </Card>
                </section>

                {/* ─── TREND FOOTER ─── */}
                <div className="flex items-center justify-between px-5 py-3 bg-stone-900/30 backdrop-blur-md border border-white/[0.04] rounded-xl">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{s?.totalLocations || 0} locations</span>
                        </div>
                        {s?.topLocation && (
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                                <Star className="h-3.5 w-3.5 text-emerald-500" />
                                <span>Top: <strong className="text-stone-300">{s.topLocation}</strong></span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span>Health: <strong className="text-stone-300">{s?.avgHealth || 0}</strong></span>
                        </div>
                    </div>
                    <DataFresh at={meta?.lastUpdatedAt} />
                </div>
            </OwnerPageShell>

            {/* ═══ LOCATION DRILLDOWN DRAWER ═══ */}
            <OwnerDrawer
                open={!!drawerLocId}
                onClose={() => setDrawerLocId(null)}
                title={drawerLoc?.location.name || 'Store Details'}
                subtitle={drawerLoc?.location.address || 'Performance overview'}
                width="xl"
            >
                {drawerLoc && (
                    <div className="space-y-6">
                        {/* Health + Status */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <HealthBadge score={drawerLoc.health} size="lg" />
                                <StatusBadge status={drawerLoc.status} />
                            </div>
                            <Delta value={drawerLoc.growth} />
                        </div>

                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <MetricCard label="Today Revenue" value={fmt(drawerLoc.today.sales)} color="text-emerald-400" />
                            <MetricCard label="Yesterday" value={fmt(drawerLoc.yesterday.sales)} />
                            <MetricCard label="MTD" value={fmtK(drawerLoc.mtd.sales)} />
                            <MetricCard label="Transactions" value={drawerLoc.today.transactions} />
                            <MetricCard label="Avg Ticket" value={fmt(drawerLoc.today.avgTicket)} color="text-violet-400" />
                            <MetricCard label="Appointments" value={drawerLoc.today.appointments} />
                        </div>

                        {/* Staff */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Staffing</p>
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard label="On Clock" value={drawerLoc.staff.onClock} color={drawerLoc.staff.onClock > 0 ? 'text-emerald-400' : 'text-amber-400'} />
                                <MetricCard label="Total Staff" value={drawerLoc.staff.total} />
                            </div>
                        </div>

                        {/* Customer Retention */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Customer Retention (30d)</p>
                            <div className="grid grid-cols-3 gap-3">
                                <MetricCard label="Unique" value={drawerLoc.retention.uniqueClients} />
                                <MetricCard label="Repeat %" value={`${drawerLoc.retention.repeatPct.toFixed(0)}%`} color="text-emerald-400" />
                                <MetricCard label="No-Show %" value={`${drawerLoc.appointments.noShowPct.toFixed(1)}%`}
                                    color={drawerLoc.appointments.noShowPct > 15 ? 'text-red-400' : 'text-stone-300'} />
                            </div>
                        </div>

                        {/* Inventory */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Inventory</p>
                            <MetricCard label="Low Stock Items" value={drawerLoc.inventory.lowStock}
                                color={drawerLoc.inventory.lowStock > 0 ? 'text-amber-400' : 'text-emerald-400'}
                                sub={drawerLoc.inventory.lowStock > 0 ? 'Items below reorder point' : 'All items stocked'} />
                        </div>

                        {/* Payment Split */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Payment Split</p>
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard label="Cash" value={fmt(drawerLoc.today.cash)} color="text-emerald-400" />
                                <MetricCard label="Card" value={fmt(drawerLoc.today.card)} color="text-blue-400" />
                            </div>
                        </div>

                        {/* Issue + Recommended Action */}
                        {drawerLoc.topIssue && (
                            <div className="p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/15">
                                <p className="text-xs font-bold text-amber-400 mb-1">Top Issue</p>
                                <p className="text-sm text-white">{drawerLoc.topIssue}</p>
                                {drawerLoc.recommendedAction && (
                                    <p className="text-[11px] text-violet-400 mt-2">→ {drawerLoc.recommendedAction}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </OwnerDrawer>
        </>
    )
}
