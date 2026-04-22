'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { formatCurrency } from '@/lib/utils'
import {
    DollarSign, TrendingUp, Users, MapPin, AlertTriangle,
    BarChart3, Scissors, HeartPulse, Package, CreditCard,
    Activity, Star, Repeat, Target, Armchair, ShoppingBag,
    Percent,
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
// MULTI-LOCATION INDEPENDENT SALON OWNER — ONE-PAGE OS
// ═══════════════════════════════════════════════════════════════

interface StylistData {
    id: string; name: string; revenue: number; services: number; avgTicket: number; locationId?: string
}

interface LocationBreakdown {
    id: string; name: string; address: string; revenue: number; appointments: number
    chairs: number; chairUtilization: number; transactions: number
    repeatPct: number; noShowPct: number; retailAttachRate: number
    serviceRevenue: number; productRevenue: number; productMarginPct: number
    health: number; topIssue: string; recommendedAction: string
    stylists: StylistData[]; uniqueClients: number; staffCount: number
}

interface DashboardPayload {
    summary: {
        revenue: number; priorRevenue: number; revDelta: number
        totalTransactions: number; avgTicket: number
        totalLocations: number; totalStylists: number; totalChairs: number
        avgHealth: number; healthBreakdown: { green: number; yellow: number; red: number }
    }
    utilization: {
        chairUtilization: number; bookedHours: number; totalChairHours: number
        completedAppointments: number; noShows: number; noShowRate: number
    }
    retention: {
        totalUniqueClients: number; repeatClients: number; repeatPct: number
        rebookingRate: number; futureBookings: number
    }
    serviceMix: {
        serviceRevenue: number; productRevenue: number
        servicePct: number; productPct: number
        topServices: { name: string; revenue: number; count: number }[]
    }
    margins: { productCost: number; productMarginRevenue: number; productMarginPct: number }
    retail: { lowStockCount: number; lowStockItems: any[]; productRevenue: number; retailAttachRate: number }
    stylistProductivity: StylistData[]
    locationBreakdown: LocationBreakdown[]
    attentionItems: ActionItem[]
    opportunities: { type: string; title: string; description: string }[]
    exceptions: ExceptionItem[]
    activeExceptions: number
    _meta: { fetchedAt: string; lastUpdatedAt: string; businessDate: string; freshness: string; dataTruth: string }
}

const SECTIONS: AnchorSection[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'locations', label: 'Studios', icon: MapPin },
    { id: 'talent', label: 'Talent', icon: Users },
    { id: 'business', label: 'Business', icon: TrendingUp },
    { id: 'reporting', label: 'Reporting', icon: BarChart3 },
]

const TABLE_PRESETS = [
    { id: 'all', label: 'All Studios' },
    { id: 'low-util', label: 'Low Utilization' },
    { id: 'low-retention', label: 'Low Retention' },
    { id: 'top', label: 'Top Performers' },
]

export default function IndependentOwnerDashboard() {
    const { data: session } = useSession()
    const [data, setData] = useState<DashboardPayload | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [drawerLocId, setDrawerLocId] = useState<string | null>(null)
    const [drawerStylistId, setDrawerStylistId] = useState<string | null>(null)
    const [tablePreset, setTablePreset] = useState('all')
    const [tableSearch, setTableSearch] = useState('')
    const [reportTab, setReportTab] = useState('locations')

    const activeSection = useActiveSection(['overview', 'locations', 'talent', 'business', 'reporting'])

    // ── Data fetch ──────────────────────────────────────────────────
    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/dashboard/independent-owner')
            if (res.ok) setData(await res.json())
        } catch (e) { console.error('[SALON_OS] Fetch error:', e) }
        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Computed ─────────────────────────────────────────────────────
    const s = data?.summary
    const locs = data?.locationBreakdown || []
    const meta = data?._meta
    const util = data?.utilization
    const ret = data?.retention
    const mix = data?.serviceMix
    const margins = data?.margins
    const retail = data?.retail

    // ── Table filtering ─────────────────────────────────────────────
    const filteredLocs = useMemo(() => {
        let out = locs
        if (tablePreset === 'low-util') out = out.filter(l => l.chairUtilization < 40)
        else if (tablePreset === 'low-retention') out = out.filter(l => l.repeatPct < 25)
        else if (tablePreset === 'top') out = out.filter(l => l.health >= 80)
        if (tableSearch) {
            const q = tableSearch.toLowerCase()
            out = out.filter(l => l.name.toLowerCase().includes(q))
        }
        return out
    }, [locs, tablePreset, tableSearch])

    const sortedLocs = useMemo(() => {
        return [...filteredLocs].sort((a, b) => b.revenue - a.revenue)
    }, [filteredLocs])

    const drawerLoc = drawerLocId ? locs.find(l => l.id === drawerLocId) : null
    const drawerStylist = drawerStylistId ? data?.stylistProductivity?.find(s => s.id === drawerStylistId) : null

    // ── Loading ─────────────────────────────────────────────────────
    if (loading) return <OwnerLoading label="Loading salon data…" />

    // ═════════════════════════════════════════════════════════════════
    // RENDER — SALON OWNER ONE-PAGE OPERATING SYSTEM
    // ═════════════════════════════════════════════════════════════════

    return (
        <>
            <OwnerPageShell>
                {/* ─── ROW 0: TOP BAR ─── */}
                <OwnerTopBar
                    title="Salon Command Center"
                    subtitle={`${s?.totalLocations || 0} studios · ${meta?.businessDate || 'Today'}`}
                    badge="Independent Owner"
                    badgeColor="bg-pink-500/15 text-pink-400 border-pink-500/20"
                    icon={Scissors}
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
                                title: 'Revenue (30d)', value: fmtK(s?.revenue || 0),
                                delta: s?.revDelta, sub: `Prior: ${fmtK(s?.priorRevenue || 0)}`,
                                variant: 'success', icon: DollarSign, pulse: true,
                            },
                            {
                                title: 'Chair Utilization', value: `${(util?.chairUtilization || 0).toFixed(0)}%`,
                                sub: `${s?.totalChairs || 0} chairs across ${s?.totalLocations || 0} studios`,
                                variant: (util?.chairUtilization || 0) >= 60 ? 'success' : (util?.chairUtilization || 0) >= 40 ? 'warning' : 'danger',
                                icon: Armchair,
                            },
                            {
                                title: 'Repeat Clients', value: `${(ret?.repeatPct || 0).toFixed(0)}%`,
                                sub: `${ret?.repeatClients || 0} / ${ret?.totalUniqueClients || 0} clients`,
                                variant: 'accent', icon: Repeat,
                            },
                            {
                                title: 'Rebooking Rate', value: `${(ret?.rebookingRate || 0).toFixed(0)}%`,
                                sub: `${ret?.futureBookings || 0} future bookings`,
                                variant: (ret?.rebookingRate || 0) >= 40 ? 'success' : 'warning', icon: HeartPulse,
                            },
                            {
                                title: 'Product Margin', value: `${(margins?.productMarginPct || 0).toFixed(0)}%`,
                                sub: `Retail: ${fmtK(retail?.productRevenue || 0)}`,
                                variant: 'muted', icon: Percent,
                            },
                            {
                                title: 'Health', value: String(s?.avgHealth || 0),
                                sub: `${s?.healthBreakdown?.green || 0} ✓  ${s?.healthBreakdown?.yellow || 0} ⚠  ${s?.healthBreakdown?.red || 0} ✗`,
                                variant: (s?.avgHealth || 0) >= 70 ? 'success' : (s?.avgHealth || 0) >= 50 ? 'warning' : 'danger',
                                icon: Activity,
                            },
                        ]}
                    />
                </section>

                {/* ─── ROW 2: ACTION CENTER + EXCEPTION RAIL ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ minHeight: 340 }}>
                    <div className="lg:col-span-3">
                        <OwnerActionCenter
                            items={data?.attentionItems || []}
                            title="Needs Attention"
                            fetchedAt={meta?.lastUpdatedAt}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <OwnerExceptionRail
                            items={data?.exceptions || []}
                            title="Exceptions"
                            fetchedAt={meta?.lastUpdatedAt}
                            emptyTitle="All studios running smoothly"
                            emptySubtitle="No overrides or exceptions detected"
                        />
                    </div>
                </div>

                {/* ─── ROW 3: STUDIO PERFORMANCE TABLE ─── */}
                <section id="locations">
                    <Card>
                        <SectionHead title="Studio Performance" icon={MapPin} badge={filteredLocs.length}
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
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Studio</th>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Revenue</th>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Chair Util</th>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Repeat %</th>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">No-Show</th>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Retail Mix</th>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Margin</th>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Staff</th>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Health</th>
                                        <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Issue</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLocs.length === 0 ? (
                                        <tr><td colSpan={10} className="text-center py-12 text-stone-500">No studios match filter</td></tr>
                                    ) : (
                                        sortedLocs.map(loc => (
                                            <tr key={loc.id}
                                                className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors"
                                                onClick={() => setDrawerLocId(loc.id)}>
                                                <td className="px-3 py-3">
                                                    <p className="text-sm font-semibold text-white">{loc.name}</p>
                                                    <p className="text-[10px] text-stone-600 mt-0.5">{loc.chairs} chairs · {loc.staffCount} staff</p>
                                                </td>
                                                <td className="px-3 py-3 text-sm font-bold text-emerald-400">{fmtK(loc.revenue)}</td>
                                                <td className="px-3 py-3">
                                                    <span className={`text-sm font-bold ${loc.chairUtilization >= 60 ? 'text-emerald-400' : loc.chairUtilization >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                                        {loc.chairUtilization.toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-stone-300">{loc.repeatPct.toFixed(0)}%</td>
                                                <td className="px-3 py-3">
                                                    <span className={`text-sm ${loc.noShowPct > 15 ? 'font-bold text-red-400' : 'text-stone-400'}`}>
                                                        {loc.noShowPct.toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-stone-300">{loc.retailAttachRate.toFixed(0)}%</td>
                                                <td className="px-3 py-3 text-sm text-stone-300">{loc.productMarginPct.toFixed(0)}%</td>
                                                <td className="px-3 py-3 text-sm text-stone-300">{loc.staffCount}</td>
                                                <td className="px-3 py-3"><HealthBadge score={loc.health} size="sm" /></td>
                                                <td className="px-3 py-3">
                                                    {loc.topIssue
                                                        ? <p className="text-[10px] text-amber-400 max-w-[140px] truncate">{loc.topIssue}</p>
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

                {/* ─── ROW 4: STYLIST PERFORMANCE + CUSTOMER RETENTION ─── */}
                <section id="talent">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Stylist Leaderboard */}
                        <Card className="p-5">
                            <SectionHead title="Stylist Performance" icon={Scissors} badge={data?.stylistProductivity?.length || 0} />
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <MetricCard label="Total Stylists" value={s?.totalStylists || 0} />
                                <MetricCard label="Avg Revenue" value={s?.totalStylists ? fmtK(s.revenue / s.totalStylists) : '—'} color="text-violet-400" />
                                <MetricCard label="Avg Ticket" value={fmt(s?.avgTicket || 0)} />
                            </div>
                            <div className="space-y-2">
                                {(data?.stylistProductivity || []).slice(0, 6).map((sty, i) => {
                                    const maxRev = (data?.stylistProductivity?.[0]?.revenue || 1)
                                    return (
                                        <div key={sty.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
                                            onClick={() => setDrawerStylistId(sty.id)}>
                                            <span className="text-xs font-bold text-stone-600 w-5">{i + 1}</span>
                                            <span className="text-xs font-semibold text-white min-w-[100px] truncate">{sty.name}</span>
                                            <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                                <div className="h-full rounded-full bg-pink-500/60" style={{ width: `${(sty.revenue / maxRev) * 100}%` }} />
                                            </div>
                                            <div className="text-right min-w-[80px]">
                                                <span className="text-xs font-bold text-pink-400">{fmtK(sty.revenue)}</span>
                                                <span className="text-[10px] text-stone-600 ml-1">({sty.services})</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>

                        {/* Customer Retention */}
                        <Card className="p-5">
                            <SectionHead title="Client Retention" icon={HeartPulse} />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <MetricCard label="Unique (30d)" value={ret?.totalUniqueClients || 0} />
                                <MetricCard label="Repeat %" value={`${(ret?.repeatPct || 0).toFixed(0)}%`} color="text-emerald-400" />
                                <MetricCard label="Rebooking" value={`${(ret?.rebookingRate || 0).toFixed(0)}%`} color={(ret?.rebookingRate || 0) >= 40 ? 'text-emerald-400' : 'text-amber-400'} />
                                <MetricCard label="No-Show" value={`${(util?.noShowRate || 0).toFixed(1)}%`} color={(util?.noShowRate || 0) > 15 ? 'text-red-400' : 'text-stone-300'} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Repeat Rate by Studio</p>
                                {locs.slice().sort((a, b) => b.repeatPct - a.repeatPct).slice(0, 5).map(loc => (
                                    <div key={loc.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                        <span className="text-xs font-semibold text-white min-w-[120px] truncate">{loc.name}</span>
                                        <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                            <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${loc.repeatPct}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-400 min-w-[40px] text-right">{loc.repeatPct.toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </section>

                {/* ─── ROW 5: SERVICE MIX + RETAIL + INVENTORY ─── */}
                <section id="business">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Service Mix */}
                        <Card className="p-5">
                            <SectionHead title="Service Mix" icon={Scissors} />
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <MetricCard label="Services" value={fmtK(mix?.serviceRevenue || 0)} color="text-pink-400" sub={`${(mix?.servicePct || 0).toFixed(0)}%`} />
                                <MetricCard label="Retail" value={fmtK(mix?.productRevenue || 0)} color="text-emerald-400" sub={`${(mix?.productPct || 0).toFixed(0)}%`} />
                            </div>
                            <div className="h-2.5 rounded-full bg-stone-800 overflow-hidden flex mb-3">
                                <div className="h-full bg-pink-500 rounded-l-full" style={{ width: `${mix?.servicePct || 50}%` }} />
                                <div className="h-full bg-emerald-500 rounded-r-full" style={{ width: `${mix?.productPct || 50}%` }} />
                            </div>
                            <div className="space-y-1.5">
                                {(mix?.topServices || []).slice(0, 5).map(s => (
                                    <div key={s.name} className="flex items-center justify-between px-2 py-1.5 rounded bg-white/[0.02]">
                                        <span className="text-[11px] text-stone-300 truncate max-w-[140px]">{s.name}</span>
                                        <span className="text-[11px] font-bold text-pink-400">{fmtK(s.revenue)}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Retail & Margins */}
                        <Card className="p-5">
                            <SectionHead title="Margins & Retail" icon={ShoppingBag} />
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <MetricCard label="Product Margin" value={`${(margins?.productMarginPct || 0).toFixed(0)}%`}
                                    color={margins?.productMarginPct && margins.productMarginPct > 40 ? 'text-emerald-400' : 'text-amber-400'} />
                                <MetricCard label="Attach Rate" value={`${(retail?.retailAttachRate || 0).toFixed(0)}%`} color="text-violet-400" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                                    <span className="text-xs text-stone-400">Product Revenue</span>
                                    <span className="text-xs font-bold text-emerald-400">{fmtK(retail?.productRevenue || 0)}</span>
                                </div>
                                <div className="flex justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                                    <span className="text-xs text-stone-400">Product Cost</span>
                                    <span className="text-xs font-bold text-stone-300">{fmtK(margins?.productCost || 0)}</span>
                                </div>
                                <div className="flex justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                                    <span className="text-xs text-stone-400">Gross Profit</span>
                                    <span className="text-xs font-bold text-emerald-400">
                                        {fmtK((margins?.productMarginRevenue || 0) - (margins?.productCost || 0))}
                                    </span>
                                </div>
                            </div>
                            {/* Opportunities */}
                            {(data?.opportunities || []).length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {data!.opportunities.slice(0, 2).map((opp, i) => (
                                        <div key={i} className="p-2.5 rounded-lg bg-violet-500/[0.05] border border-violet-500/15">
                                            <p className="text-[10px] font-bold text-violet-400 uppercase">{opp.type}</p>
                                            <p className="text-[11px] text-white mt-0.5">{opp.title}</p>
                                            <p className="text-[10px] text-stone-400 mt-0.5">{opp.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Inventory Blockers */}
                        <Card className="p-5">
                            <SectionHead title="Inventory" icon={Package} badge={retail?.lowStockCount || 0} />
                            {(retail?.lowStockCount || 0) === 0 ? (
                                <div className="text-center py-6">
                                    <Package className="h-7 w-7 mx-auto text-stone-700 mb-2" />
                                    <p className="text-sm text-stone-400">Inventory healthy</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(retail?.lowStockItems || []).slice(0, 6).map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-500/[0.04] border border-amber-500/10">
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                                                <p className="text-[10px] text-stone-500">Stock: {item.stock} / Reorder: {item.reorderPoint}</p>
                                            </div>
                                            <span className="text-xs font-bold text-amber-400 flex-shrink-0">{fmt(item.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </section>

                {/* ─── ROW 6: REPORTING CENTER ─── */}
                <section id="reporting">
                    <Card>
                        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                            <SectionHead title="Reporting Center" icon={BarChart3} />
                            <TabBar tabs={[
                                { id: 'locations', label: 'Studios', count: locs.length },
                                { id: 'stylists', label: 'Stylists', count: data?.stylistProductivity?.length || 0 },
                                { id: 'services', label: 'Services' },
                                { id: 'utilization', label: 'Utilization' },
                            ]} active={reportTab} onChange={setReportTab} />
                        </div>
                        <div className="p-5 min-h-[300px]">
                            {reportTab === 'locations' && (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {locs.map(loc => (
                                        <div key={loc.id} onClick={() => setDrawerLocId(loc.id)}
                                            className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-semibold text-white truncate">{loc.name}</p>
                                                <HealthBadge score={loc.health} size="sm" />
                                            </div>
                                            <p className="text-lg font-black text-emerald-400">{fmtK(loc.revenue)}</p>
                                            <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-500">
                                                <span>Chair: {loc.chairUtilization.toFixed(0)}%</span>
                                                <span>Repeat: {loc.repeatPct.toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {reportTab === 'stylists' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/[0.04]">
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">#</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Stylist</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Revenue</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Services</th>
                                                <th className="px-3 py-2 text-[10px] font-bold uppercase text-stone-500">Avg Ticket</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data?.stylistProductivity || []).map((sty, i) => (
                                                <tr key={sty.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer" onClick={() => setDrawerStylistId(sty.id)}>
                                                    <td className="px-3 py-2.5 text-xs font-bold text-stone-600">{i + 1}</td>
                                                    <td className="px-3 py-2.5 text-sm font-semibold text-white">{sty.name}</td>
                                                    <td className="px-3 py-2.5 text-sm font-bold text-pink-400">{fmtK(sty.revenue)}</td>
                                                    <td className="px-3 py-2.5 text-sm text-stone-300">{sty.services}</td>
                                                    <td className="px-3 py-2.5 text-sm text-stone-300">{fmt(sty.avgTicket)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {reportTab === 'services' && (
                                <div className="space-y-2">
                                    {(mix?.topServices || []).map((svc, i) => {
                                        const maxRev = mix?.topServices?.[0]?.revenue || 1
                                        return (
                                            <div key={svc.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                                <span className="text-xs font-bold text-stone-600 w-5">{i + 1}</span>
                                                <span className="text-xs font-semibold text-white min-w-[140px] truncate">{svc.name}</span>
                                                <div className="flex-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                                    <div className="h-full rounded-full bg-pink-500/60" style={{ width: `${(svc.revenue / maxRev) * 100}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-pink-400 min-w-[60px] text-right">{fmtK(svc.revenue)}</span>
                                                <span className="text-[10px] text-stone-500 min-w-[40px] text-right">{svc.count}×</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            {reportTab === 'utilization' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                        <MetricCard label="Chair Util" value={`${(util?.chairUtilization || 0).toFixed(0)}%`}
                                            color={(util?.chairUtilization || 0) >= 60 ? 'text-emerald-400' : 'text-amber-400'} />
                                        <MetricCard label="Booked Hours" value={`${(util?.bookedHours || 0).toFixed(0)}h`} />
                                        <MetricCard label="Available Hours" value={`${util?.totalChairHours || 0}h`} />
                                        <MetricCard label="No-Show Rate" value={`${(util?.noShowRate || 0).toFixed(1)}%`}
                                            color={(util?.noShowRate || 0) > 15 ? 'text-red-400' : 'text-stone-300'} />
                                    </div>
                                    {locs.map(loc => (
                                        <div key={loc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02]">
                                            <span className="text-xs font-semibold text-white min-w-[120px] truncate">{loc.name}</span>
                                            <div className="flex-1 h-2 rounded-full bg-stone-800 overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${loc.chairUtilization >= 60 ? 'bg-emerald-500' : loc.chairUtilization >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${Math.min(100, loc.chairUtilization)}%` }} />
                                            </div>
                                            <span className="text-xs font-bold text-stone-300 min-w-[40px] text-right">{loc.chairUtilization.toFixed(0)}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </section>

                {/* ─── TREND FOOTER ─── */}
                <div className="flex items-center justify-between px-5 py-3 bg-stone-900/30 backdrop-blur-md border border-white/[0.04] rounded-xl">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <Scissors className="h-3.5 w-3.5" />
                            <span>{s?.totalLocations || 0} studios</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <Users className="h-3.5 w-3.5" />
                            <span>{s?.totalStylists || 0} stylists</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <Armchair className="h-3.5 w-3.5" />
                            <span>{s?.totalChairs || 0} chairs · {(util?.chairUtilization || 0).toFixed(0)}% util</span>
                        </div>
                    </div>
                    <DataFresh at={meta?.lastUpdatedAt} />
                </div>
            </OwnerPageShell>

            {/* ═══ STUDIO DRILLDOWN DRAWER ═══ */}
            <OwnerDrawer
                open={!!drawerLocId}
                onClose={() => setDrawerLocId(null)}
                title={drawerLoc?.name || 'Studio Details'}
                subtitle={drawerLoc?.address || 'Performance overview'}
                width="xl"
            >
                {drawerLoc && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <HealthBadge score={drawerLoc.health} size="lg" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <MetricCard label="Revenue (30d)" value={fmtK(drawerLoc.revenue)} color="text-emerald-400" />
                            <MetricCard label="Chair Util" value={`${drawerLoc.chairUtilization.toFixed(0)}%`}
                                color={drawerLoc.chairUtilization >= 60 ? 'text-emerald-400' : 'text-amber-400'} />
                            <MetricCard label="Appointments" value={drawerLoc.appointments} />
                            <MetricCard label="Repeat %" value={`${drawerLoc.repeatPct.toFixed(0)}%`} color="text-emerald-400" />
                            <MetricCard label="No-Show %" value={`${drawerLoc.noShowPct.toFixed(1)}%`}
                                color={drawerLoc.noShowPct > 15 ? 'text-red-400' : 'text-stone-300'} />
                            <MetricCard label="Retail Attach" value={`${drawerLoc.retailAttachRate.toFixed(0)}%`} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Revenue Split</p>
                            <div className="grid grid-cols-2 gap-3">
                                <MetricCard label="Services" value={fmtK(drawerLoc.serviceRevenue)} color="text-pink-400" />
                                <MetricCard label="Retail" value={fmtK(drawerLoc.productRevenue)} color="text-emerald-400"
                                    sub={`Margin: ${drawerLoc.productMarginPct.toFixed(0)}%`} />
                            </div>
                        </div>
                        {drawerLoc.stylists.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Top Stylists</p>
                                <div className="space-y-2">
                                    {drawerLoc.stylists.map(sty => (
                                        <div key={sty.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02]">
                                            <span className="text-xs font-semibold text-white">{sty.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-stone-400">{sty.services} svc</span>
                                                <span className="text-xs font-bold text-pink-400">{fmtK(sty.revenue)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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

            {/* ═══ STYLIST DRILLDOWN DRAWER ═══ */}
            <OwnerDrawer
                open={!!drawerStylistId}
                onClose={() => setDrawerStylistId(null)}
                title={drawerStylist?.name || 'Stylist Details'}
                subtitle="30-day performance"
                width="md"
            >
                {drawerStylist && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-3 gap-3">
                            <MetricCard label="Revenue" value={fmtK(drawerStylist.revenue)} color="text-pink-400" />
                            <MetricCard label="Services" value={drawerStylist.services} />
                            <MetricCard label="Avg Ticket" value={fmt(drawerStylist.avgTicket)} color="text-violet-400" />
                        </div>
                    </div>
                )}
            </OwnerDrawer>
        </>
    )
}
