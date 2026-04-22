'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { formatCurrency } from '@/lib/utils'
import {
    DollarSign, TrendingUp, Users, Calendar, AlertTriangle, ShoppingCart,
    BarChart3, Clock, HeartPulse, Package, CreditCard, Scissors,
    Activity, Store, Star,
} from 'lucide-react'

import {
    OwnerPageShell, OwnerTopBar, OwnerKpiStrip, OwnerActionCenter,
    OwnerExceptionRail, OwnerDrawer, OwnerLoading,
    Card, SectionHead, MetricCard, HealthBadge, Delta, StatusBadge,
    TabBar, DataFresh,
    type OwnerKpiDef, type ActionItem, type ExceptionItem,
} from '@/components/dashboard/owner-os/OwnerPrimitives'

// ── Helpers ─────────────────────────────────────────────────────
function fmt(n: number) { return formatCurrency(n) }
function fmtK(n: number) { return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}` }

// ═══════════════════════════════════════════════════════════════
// SINGLE-LOCATION FRANCHISEE OWNER — ONE-PAGE OPERATING SYSTEM
// ═══════════════════════════════════════════════════════════════

interface StoreData {
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

export default function FranchiseeCommandCenter() {
    const { data: session } = useSession()
    const [store, setStore] = useState<StoreData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [attentionItems, setAttentionItems] = useState<ActionItem[]>([])
    const [exceptionItems, setExceptionItems] = useState<ExceptionItem[]>([])
    const [meta, setMeta] = useState<any>(null)
    const [reportTab, setReportTab] = useState('overview')
    const [drawerOpen, setDrawerOpen] = useState<string | null>(null) // 'sales' | 'staff' | 'customer' | null

    // ── Fetch ───────────────────────────────────────────────────────
    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/dashboard/multi-store')
            if (res.ok) {
                const payload = await res.json()
                // Single-location: take first location
                const loc = payload.locations?.[0] || null
                setStore(loc)
                setAttentionItems(payload.attentionItems || [])
                setExceptionItems(payload.exceptions || [])
                setMeta(payload._meta)
            }
        } catch (e) { console.error('[SINGLE_OWNER_OS] Fetch error:', e) }
        setLoading(false)
        setRefreshing(false)
    }, [])

    useEffect(() => {
        fetchData()
        const iv = setInterval(() => fetchData(true), 60000)
        return () => clearInterval(iv)
    }, [fetchData])

    // ── Loading ─────────────────────────────────────────────────────
    if (loading) return <OwnerLoading label="Loading your store…" />

    const d = store
    const salesDelta = d && d.yesterday.sales > 0
        ? ((d.today.sales - d.yesterday.sales) / d.yesterday.sales * 100) : 0
    const totalPayments = (d?.today.cash || 0) + (d?.today.card || 0)
    const cashPct = totalPayments > 0 ? ((d?.today.cash || 0) / totalPayments * 100) : 0

    // ═════════════════════════════════════════════════════════════════
    // RENDER — SINGLE-STORE ONE-PAGE OS
    // ═════════════════════════════════════════════════════════════════

    return (
        <>
            <OwnerPageShell>
                {/* ─── ROW 0: TOP BAR ─── */}
                <OwnerTopBar
                    title={d?.location.name || 'My Store'}
                    subtitle={`${meta?.businessDate || 'Today'} · ${session?.user?.name?.split(' ')[0] || 'Owner'}`}
                    badge="Franchisee"
                    badgeColor="bg-blue-500/15 text-blue-400 border-blue-500/20"
                    icon={Store}
                    fetchedAt={meta?.lastUpdatedAt}
                    onRefresh={() => fetchData(true)}
                    refreshing={refreshing}
                >
                    {d && <HealthBadge score={d.health} size="md" />}
                </OwnerTopBar>

                {/* ─── ROW 1: KPI STRIP ─── */}
                <OwnerKpiStrip
                    fetchedAt={meta?.lastUpdatedAt}
                    kpis={[
                        {
                            title: "Today's Revenue", value: fmt(d?.today.sales || 0),
                            delta: salesDelta, sub: `Yesterday: ${fmt(d?.yesterday.sales || 0)}`,
                            variant: 'success', icon: DollarSign, pulse: true,
                        },
                        {
                            title: 'Transactions', value: String(d?.today.transactions || 0),
                            sub: `Avg ticket ${fmt(d?.today.avgTicket || 0)}`,
                            variant: 'muted', icon: ShoppingCart,
                        },
                        {
                            title: 'Appointments', value: String(d?.appointments?.today || 0),
                            sub: d?.appointments?.noShowPct ? `${d.appointments.noShowPct.toFixed(1)}% no-show` : 'Today',
                            variant: (d?.appointments?.noShowPct || 0) > 15 ? 'warning' : 'muted', icon: Calendar,
                        },
                        {
                            title: 'Staff On Floor', value: `${d?.staff.onClock || 0} / ${d?.staff.total || 0}`,
                            sub: (d?.staff.onClock || 0) === 0 ? 'No one clocked in' : 'Checked in now',
                            variant: (d?.staff.onClock || 0) === 0 ? 'warning' : 'muted', icon: Users,
                        },
                        {
                            title: 'Repeat Clients', value: `${(d?.retention?.repeatPct || 0).toFixed(0)}%`,
                            sub: `${d?.retention?.uniqueClients || 0} unique (30d)`,
                            variant: 'accent', icon: HeartPulse,
                        },
                        {
                            title: 'MTD Revenue', value: fmtK(d?.mtd.sales || 0),
                            sub: `${d?.mtd.transactions || 0} transactions`,
                            variant: 'muted', icon: TrendingUp,
                        },
                    ]}
                />

                {/* ─── ROW 2: ACTION CENTER + EXCEPTION RAIL ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ minHeight: 300 }}>
                    <div className="lg:col-span-3">
                        <OwnerActionCenter
                            items={attentionItems}
                            title="Needs Attention"
                            fetchedAt={meta?.lastUpdatedAt}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <OwnerExceptionRail
                            items={exceptionItems}
                            title="Exceptions"
                            fetchedAt={meta?.lastUpdatedAt}
                            emptyTitle="Store running smoothly"
                            emptySubtitle="No voids, no-shows, or overrides detected"
                        />
                    </div>
                </div>

                {/* ─── ROW 3: TODAY'S BUSINESS PERFORMANCE ─── */}
                <Card className="p-5">
                    <SectionHead title="Today's Business" icon={BarChart3}
                        right={<DataFresh at={meta?.lastUpdatedAt} />}
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/[0.04]">
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Metric</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Today</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Yesterday</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">MTD</th>
                                    <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { metric: 'Revenue', today: fmt(d?.today.sales || 0), yesterday: fmt(d?.yesterday.sales || 0), mtd: fmtK(d?.mtd.sales || 0), delta: salesDelta },
                                    { metric: 'Transactions', today: String(d?.today.transactions || 0), yesterday: String(d?.yesterday.transactions || 0), mtd: String(d?.mtd.transactions || 0), delta: d && d.yesterday.transactions > 0 ? ((d.today.transactions - d.yesterday.transactions) / d.yesterday.transactions * 100) : 0 },
                                    { metric: 'Avg Ticket', today: fmt(d?.today.avgTicket || 0), yesterday: d && d.yesterday.transactions > 0 ? fmt(d.yesterday.sales / d.yesterday.transactions) : '—', mtd: d && d.mtd.transactions > 0 ? fmt(d.mtd.sales / d.mtd.transactions) : '—', delta: 0 },
                                    { metric: 'Cash', today: fmt(d?.today.cash || 0), yesterday: '—', mtd: '—', delta: 0 },
                                    { metric: 'Card', today: fmt(d?.today.card || 0), yesterday: '—', mtd: '—', delta: 0 },
                                ].map(row => (
                                    <tr key={row.metric} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                        <td className="px-3 py-3 text-sm font-semibold text-white">{row.metric}</td>
                                        <td className="px-3 py-3 text-sm font-bold text-emerald-400">{row.today}</td>
                                        <td className="px-3 py-3 text-sm text-stone-400">{row.yesterday}</td>
                                        <td className="px-3 py-3 text-sm text-stone-400">{row.mtd}</td>
                                        <td className="px-3 py-3">{row.delta !== 0 ? <Delta value={row.delta} /> : <span className="text-xs text-stone-600">—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* ─── ROW 4: STAFF + CUSTOMER RETENTION ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Staff Panel */}
                    <Card className="p-5">
                        <SectionHead title="Team Status" icon={Users} />
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <MetricCard label="Total" value={d?.staff.total || 0} />
                            <MetricCard label="On Clock" value={d?.staff.onClock || 0} color={d?.staff.onClock ? 'text-emerald-400' : 'text-amber-400'} />
                            <MetricCard label="Rev / Staff" value={d?.staff.onClock ? fmt(d.today.sales / d.staff.onClock) : '—'} color="text-violet-400" />
                        </div>
                        {(d?.staff.onClock || 0) === 0 && d?.staff.total ? (
                            <div className="p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/15 text-center">
                                <p className="text-xs font-semibold text-amber-400">No staff clocked in</p>
                                <p className="text-[10px] text-stone-500 mt-0.5">Check schedule or time-clock</p>
                            </div>
                        ) : (
                            <div className="p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15 text-center">
                                <p className="text-xs font-semibold text-emerald-400">{d?.staff.onClock || 0} staff on floor</p>
                                <p className="text-[10px] text-stone-500 mt-0.5">Coverage {d?.staff.total ? `${Math.round((d.staff.onClock / d.staff.total) * 100)}%` : '—'}</p>
                            </div>
                        )}
                    </Card>

                    {/* Customer Retention */}
                    <Card className="p-5">
                        <SectionHead title="Customer Retention" icon={HeartPulse} />
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <MetricCard label="Unique (30d)" value={d?.retention?.uniqueClients || 0} />
                            <MetricCard label="Repeat %" value={`${(d?.retention?.repeatPct || 0).toFixed(0)}%`} color="text-emerald-400" />
                            <MetricCard label="No-Show %" value={`${(d?.appointments?.noShowPct || 0).toFixed(1)}%`}
                                color={(d?.appointments?.noShowPct || 0) > 15 ? 'text-red-400' : 'text-stone-300'} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                                <span className="text-xs text-stone-400">Appointments Today</span>
                                <span className="text-sm font-bold text-white">{d?.appointments?.today || 0}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* ─── ROW 5: FINANCIALS + INVENTORY + PAYMENTS ─── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Payment Breakdown */}
                    <Card className="p-5">
                        <SectionHead title="Payment Split" icon={CreditCard} />
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <MetricCard label="Cash" value={fmt(d?.today.cash || 0)} color="text-emerald-400" sub={`${cashPct.toFixed(0)}%`} />
                            <MetricCard label="Card" value={fmt(d?.today.card || 0)} color="text-blue-400" sub={`${(100 - cashPct).toFixed(0)}%`} />
                        </div>
                        <div className="h-2.5 rounded-full bg-stone-800 overflow-hidden flex">
                            <div className="h-full bg-emerald-500 rounded-l-full transition-all" style={{ width: `${cashPct}%` }} />
                            <div className="h-full bg-blue-500 rounded-r-full transition-all" style={{ width: `${100 - cashPct}%` }} />
                        </div>
                    </Card>

                    {/* Inventory */}
                    <Card className="p-5">
                        <SectionHead title="Inventory" icon={Package} badge={d?.inventory.lowStock || 0} />
                        {(d?.inventory.lowStock || 0) === 0 ? (
                            <div className="text-center py-6">
                                <Package className="h-7 w-7 mx-auto text-stone-700 mb-2" />
                                <p className="text-sm text-stone-400">All stocked</p>
                                <p className="text-[10px] text-stone-600 mt-0.5">No low-stock alerts</p>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg bg-amber-500/[0.05] border border-amber-500/15">
                                <p className="text-sm font-bold text-amber-400">{d?.inventory.lowStock} items low</p>
                                <p className="text-[10px] text-stone-500 mt-0.5">Below reorder point</p>
                            </div>
                        )}
                    </Card>

                    {/* Store Health */}
                    <Card className="p-5">
                        <SectionHead title="Store Health" icon={HeartPulse} />
                        <div className="flex items-center justify-center py-4">
                            <div className="text-center">
                                <HealthBadge score={d?.health || 0} size="lg" />
                                <p className="text-xs text-stone-500 mt-2">{d?.status === 'active' ? 'Operating normally' : d?.status === 'idle' ? 'Idle — no sales yet' : 'Needs attention'}</p>
                            </div>
                        </div>
                        {d?.topIssue && (
                            <div className="mt-3 p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/15">
                                <p className="text-[10px] font-bold text-amber-400 uppercase">Top Issue</p>
                                <p className="text-xs text-white mt-0.5">{d.topIssue}</p>
                                {d.recommendedAction && (
                                    <p className="text-[10px] text-violet-400 mt-1">→ {d.recommendedAction}</p>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* ─── ROW 6: REPORTING CENTER ─── */}
                <Card>
                    <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                        <SectionHead title="Reports" icon={BarChart3} />
                        <TabBar tabs={[
                            { id: 'overview', label: 'Overview' },
                            { id: 'sales', label: 'Sales' },
                            { id: 'payments', label: 'Payments' },
                        ]} active={reportTab} onChange={setReportTab} />
                    </div>
                    <div className="p-5 min-h-[200px]">
                        {reportTab === 'overview' && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <MetricCard label="Today" value={fmt(d?.today.sales || 0)} color="text-emerald-400" />
                                <MetricCard label="Yesterday" value={fmt(d?.yesterday.sales || 0)} />
                                <MetricCard label="MTD" value={fmtK(d?.mtd.sales || 0)} />
                                <MetricCard label="Health" value={String(d?.health || 0)} color={d?.health && d.health >= 70 ? 'text-emerald-400' : 'text-amber-400'} />
                            </div>
                        )}
                        {reportTab === 'sales' && (
                            <div className="space-y-3">
                                {[
                                    { label: "Today's Revenue", value: fmt(d?.today.sales || 0), color: 'text-emerald-400' },
                                    { label: 'Avg Ticket', value: fmt(d?.today.avgTicket || 0), color: 'text-white' },
                                    { label: 'Transactions', value: String(d?.today.transactions || 0), color: 'text-white' },
                                    { label: 'MTD Revenue', value: fmtK(d?.mtd.sales || 0), color: 'text-white' },
                                    { label: 'MTD Transactions', value: String(d?.mtd.transactions || 0), color: 'text-white' },
                                ].map(row => (
                                    <div key={row.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                                        <span className="text-xs text-stone-400">{row.label}</span>
                                        <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {reportTab === 'payments' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <MetricCard label="Cash" value={fmt(d?.today.cash || 0)} color="text-emerald-400" />
                                    <MetricCard label="Card" value={fmt(d?.today.card || 0)} color="text-blue-400" />
                                </div>
                                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02]">
                                    <span className="text-xs text-stone-400">Cash %</span>
                                    <span className="text-sm font-bold text-emerald-400">{cashPct.toFixed(0)}%</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02]">
                                    <span className="text-xs text-stone-400">Card %</span>
                                    <span className="text-sm font-bold text-blue-400">{(100 - cashPct).toFixed(0)}%</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02]">
                                    <span className="text-xs text-stone-400">Total</span>
                                    <span className="text-sm font-bold text-white">{fmt(d?.today.sales || 0)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* ─── TREND FOOTER ─── */}
                <div className="flex items-center justify-between px-5 py-3 bg-stone-900/30 backdrop-blur-md border border-white/[0.04] rounded-xl">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <Store className="h-3.5 w-3.5" />
                            <span>{d?.location.name || 'My Store'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span>Health: <strong className="text-stone-300">{d?.health || 0}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            <Users className="h-3.5 w-3.5" />
                            <span>{d?.staff.onClock || 0} on floor</span>
                        </div>
                    </div>
                    <DataFresh at={meta?.lastUpdatedAt} />
                </div>
            </OwnerPageShell>
        </>
    )
}
