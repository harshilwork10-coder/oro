'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    DollarSign, Users, MapPin, TrendingUp,
    AlertCircle, BarChart3, ChevronRight, Copy,
    Crown, Rocket, ArrowUpDown, AlertTriangle,
    CheckCircle, Zap, Flag, Activity, Layers,
    TrendingDown, Percent, Globe, Store, Download,
    ChevronDown, ChevronUp, X, Heart, Clock,
    ShoppingCart, UserCheck, CalendarX, Briefcase,
    ArrowRight, ArrowDown, ArrowUp, Gauge, Search
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import DrawerPanel from './command-center/DrawerPanel'

// ═══════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════

interface StoreData {
    id: string; name: string; address: string | null; franchiseId: string; franchisee: string
    region: string; status: string; revenue: number; priorRevenue: number; growth: number
    avgTicket: number; txnCount: number; repeatPct: number; noShowPct: number
    totalAppts: number; health: number; topIssue: string | null; createdAt: string
}

interface FranchiseeData {
    id: string; name: string; region: string; locationCount: number; monthlyRevenue: number
    priorRevenue: number; growth: number; transactionCount: number; avgTicket: number
    employeeCount: number; royaltiesDue: number; royaltiesCollected: number
    status: 'active' | 'warning' | 'pending' | 'critical'; health: number
}

interface RegionData {
    region: string; revenue: number; priorRevenue: number; growth: number
    stores: number; weakStores: number; openings: number; franchiseeCount: number
    topFranchisee: string; concern: 'low' | 'moderate' | 'high'
}

interface AttentionItem {
    type: string; severity: 'critical' | 'warning' | 'info'
    title: string; description: string; count: number; category: string
}

interface DashboardData {
    name: string; brandCode: string | null
    kpis: {
        networkRevenue: number; priorRevenue: number; sameStoreGrowth: number
        activeLocations: number; totalLocations: number; pendingOpenings: number
        royaltiesCollected: number; royaltiesDue: number; royaltiesOverdue: number
        franchiseeHealthScore: number; totalFranchisees: number
        totalEmployees: number; totalTransactions: number
    }
    franchisees: FranchiseeData[]; stores: StoreData[]; regions: RegionData[]
    royalties: { collected: number; due: number; overdue: number; byFranchisee: any[] }
    rollout: { live: number; pending: number; blocked: number; stationRequests: number; avgDaysToGoLive: number }
    attentionItems: AttentionItem[]
    fetchedAt: string
}

// ═══════════════════════════════════════════════════════
// Utility Components
// ═══════════════════════════════════════════════════════

function DataLabel({ fetchedAt }: { fetchedAt?: string }) {
    const t = fetchedAt ? new Date(fetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null
    return (
        <div className="flex items-center gap-1.5 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium uppercase tracking-wide text-emerald-400">Live</span>
            {t && <span className="text-stone-600">· {t}</span>}
        </div>
    )
}

function HealthBadge({ score }: { score: number }) {
    const color = score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
        : score >= 60 ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
        : 'bg-red-500/15 text-red-400 border-red-500/20'
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${color}`}>{score}</span>
}

function GrowthBadge({ value }: { value: number }) {
    if (value === 0) return <span className="text-xs text-stone-600">—</span>
    const positive = value >= 0
    return (
        <span className={`text-xs font-bold flex items-center gap-0.5 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? '+' : ''}{value.toFixed(1)}%
        </span>
    )
}

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        active: 'bg-emerald-500', warning: 'bg-amber-500', pending: 'bg-stone-500', critical: 'bg-red-500',
        ACTIVE: 'bg-emerald-500', PROVISIONING_PENDING: 'bg-amber-500', READY_FOR_INSTALL: 'bg-blue-500',
        SUSPENDED: 'bg-red-500', DEACTIVATED: 'bg-stone-600',
    }
    return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status] || 'bg-stone-500'}`} />
}

function SectionHeader({ id, title, icon: Icon, badge, right, className = '' }: {
    id: string; title: string; icon: any; badge?: number; right?: React.ReactNode; className?: string
}) {
    return (
        <div id={id} className={`scroll-mt-28 flex items-center justify-between mb-5 ${className}`}>
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[var(--theme-accent)]" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
                {badge !== undefined && badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">{badge}</span>
                )}
            </div>
            {right}
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Section Anchor Bar
// ═══════════════════════════════════════════════════════

const SECTIONS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'attention', label: 'Attention', icon: AlertCircle },
    { id: 'franchisees', label: 'Franchisees', icon: Users },
    { id: 'regions', label: 'Regions', icon: Globe },
    { id: 'stores', label: 'Stores', icon: Store },
    { id: 'rollout', label: 'Rollout', icon: Rocket },
    { id: 'financials', label: 'Financials', icon: DollarSign },
]

function AnchorBar({ active }: { active: string }) {
    return (
        <div className="sticky top-14 z-30 bg-[var(--background)]/95 backdrop-blur-lg border-b border-white/[0.04]">
            <div className="max-w-[1800px] mx-auto px-6">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                                active === s.id
                                    ? 'bg-[var(--theme-accent-muted)] text-[var(--theme-accent)]'
                                    : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.04]'
                            }`}
                        >
                            <s.icon className="h-3.5 w-3.5" />
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// Store Reporting Center
// ═══════════════════════════════════════════════════════

type StoreTab = 'all' | 'top' | 'bottom' | 'operations' | 'customers'

function StoreReportingCenter({ stores, onSelect, fetchedAt }: {
    stores: StoreData[]; onSelect: (id: string) => void; fetchedAt?: string
}) {
    const [tab, setTab] = useState<StoreTab>('all')
    const [sortField, setSortField] = useState<string>('revenue')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
    const [search, setSearch] = useState('')

    const toggleSort = (field: string) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortField(field); setSortDir('desc') }
    }

    const activeStores = stores.filter(s => s.status === 'ACTIVE' || !s.status || s.status === '')
    let filtered = tab === 'top' ? [...activeStores].sort((a, b) => b.revenue - a.revenue).slice(0, 20)
        : tab === 'bottom' ? [...activeStores].sort((a, b) => a.health - b.health).slice(0, 20)
        : tab === 'operations' ? activeStores.filter(s => s.noShowPct > 10 || s.txnCount < 10)
        : tab === 'customers' ? activeStores.filter(s => s.totalAppts > 0)
        : stores

    if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.franchisee.toLowerCase().includes(q) || s.region.toLowerCase().includes(q))
    }

    const sorted = [...filtered].sort((a, b) => {
        const av = (a as any)[sortField] ?? 0
        const bv = (b as any)[sortField] ?? 0
        if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        return sortDir === 'asc' ? av - bv : bv - av
    })

    const tabs: { id: StoreTab; label: string; count?: number }[] = [
        { id: 'all', label: 'All Stores', count: stores.length },
        { id: 'top', label: 'Top 20' },
        { id: 'bottom', label: 'Bottom 20' },
        { id: 'operations', label: 'Ops Issues', count: activeStores.filter(s => s.noShowPct > 10 || s.txnCount < 10).length },
        { id: 'customers', label: 'Customer Health', count: activeStores.filter(s => s.totalAppts > 0).length },
    ]

    const SH = ({ field, children, w }: { field: string; children: React.ReactNode; w?: string }) => (
        <th
            className={`px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500 cursor-pointer hover:text-stone-300 transition-colors select-none ${w || ''}`}
            onClick={() => toggleSort(field)}
        >
            <span className="flex items-center gap-1">
                {children}
                {sortField === field && <ArrowUpDown className="h-2.5 w-2.5 text-[var(--theme-accent)]" />}
            </span>
        </th>
    )

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                                tab === t.id ? 'bg-[var(--theme-accent-muted)] text-[var(--theme-accent)]' : 'text-stone-500 hover:text-stone-300'
                            }`}
                        >
                            {t.label}
                            {t.count !== undefined && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                    tab === t.id ? 'bg-[var(--theme-accent)]/20 text-[var(--theme-accent)]' : 'bg-stone-800 text-stone-500'
                                }`}>{t.count}</span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                        <input
                            type="text" placeholder="Filter stores…" value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-xs text-stone-300 placeholder-stone-600 w-48 focus:outline-none focus:ring-1 focus:ring-[var(--theme-accent)]/30"
                        />
                    </div>
                    <DataLabel fetchedAt={fetchedAt} />
                </div>
            </div>
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto scrollbar-hide">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-stone-900/95 backdrop-blur z-10">
                        <tr className="border-b border-white/[0.06]">
                            <SH field="name">Store</SH>
                            <SH field="franchisee">Franchisee</SH>
                            <SH field="region">Region</SH>
                            <SH field="revenue">Revenue</SH>
                            <SH field="growth">Growth</SH>
                            <SH field="avgTicket">Avg Ticket</SH>
                            <SH field="txnCount">Txns</SH>
                            <SH field="repeatPct">Repeat %</SH>
                            <SH field="noShowPct">No-Show %</SH>
                            <SH field="health">Health</SH>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Issue</th>
                            <th className="px-3 py-2.5 w-8"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(s => (
                            <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                onClick={() => onSelect(s.id)}>
                                <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap max-w-[180px] truncate">{s.name}</td>
                                <td className="px-3 py-2.5 text-stone-400 whitespace-nowrap max-w-[140px] truncate">{s.franchisee}</td>
                                <td className="px-3 py-2.5">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-stone-400">{s.region}</span>
                                </td>
                                <td className="px-3 py-2.5 font-bold text-emerald-400 whitespace-nowrap">{formatCurrency(s.revenue)}</td>
                                <td className="px-3 py-2.5"><GrowthBadge value={s.growth} /></td>
                                <td className="px-3 py-2.5 text-stone-300 whitespace-nowrap">{formatCurrency(s.avgTicket)}</td>
                                <td className="px-3 py-2.5 text-stone-300 font-medium">{s.txnCount}</td>
                                <td className="px-3 py-2.5">
                                    <span className={`text-xs font-semibold ${s.repeatPct >= 50 ? 'text-emerald-400' : s.repeatPct >= 30 ? 'text-amber-400' : 'text-stone-500'}`}>
                                        {s.repeatPct.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="px-3 py-2.5">
                                    <span className={`text-xs font-semibold ${s.noShowPct > 15 ? 'text-red-400' : s.noShowPct > 8 ? 'text-amber-400' : 'text-stone-500'}`}>
                                        {s.noShowPct.toFixed(0)}%
                                    </span>
                                </td>
                                <td className="px-3 py-2.5"><HealthBadge score={s.health} /></td>
                                <td className="px-3 py-2.5 max-w-[180px]">
                                    {s.topIssue ? (
                                        <span className="text-[10px] text-red-400 font-medium truncate block">{s.topIssue}</span>
                                    ) : (
                                        <span className="text-[10px] text-stone-600">—</span>
                                    )}
                                </td>
                                <td className="px-3 py-2.5">
                                    <ChevronRight className="h-3.5 w-3.5 text-stone-600 group-hover:text-[var(--theme-accent)]" />
                                </td>
                            </tr>
                        ))}
                        {sorted.length === 0 && (
                            <tr><td colSpan={12} className="text-center py-12 text-stone-500 text-sm">No stores match your filter</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function FranchisorCommandCenter() {
    const { data: session } = useSession()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeSection, setActiveSection] = useState('overview')
    const [drawerStore, setDrawerStore] = useState<string | null>(null)
    const [drawerFranchisee, setDrawerFranchisee] = useState<string | null>(null)
    const [fSortField, setFSortField] = useState<string>('monthlyRevenue')
    const [fSortDir, setFSortDir] = useState<'asc' | 'desc'>('desc')

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/brand/dashboard')
            if (res.ok) setData(await res.json())
        } catch (e) {
            console.error('Dashboard error:', e)
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
        const ids = SECTIONS.map(s => s.id)
        const observers = ids.map(id => {
            const el = document.getElementById(id)
            if (!el) return null
            const obs = new IntersectionObserver(
                ([entry]) => { if (entry.isIntersecting) setActiveSection(id) },
                { rootMargin: '-20% 0px -70% 0px' }
            )
            obs.observe(el)
            return obs
        })
        return () => observers.forEach(o => o?.disconnect())
    }, [data])

    // Shortcuts
    const k = data?.kpis
    const franchisees = data?.franchisees || []
    const stores = data?.stores || []
    const regions = data?.regions || []
    const attention = data?.attentionItems || []
    const selectedStore = stores.find(s => s.id === drawerStore)
    const selectedFranchisee = franchisees.find(f => f.id === drawerFranchisee)

    // Franchisee sort
    const toggleFSort = (field: string) => {
        if (fSortField === field) setFSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setFSortField(field); setFSortDir('desc') }
    }
    const sortedFranchisees = [...franchisees].sort((a, b) => {
        const av = (a as any)[fSortField] ?? 0
        const bv = (b as any)[fSortField] ?? 0
        if (typeof av === 'string') return fSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        return fSortDir === 'asc' ? av - bv : bv - av
    })

    // Biggest movers
    const moversUp = [...franchisees].filter(f => f.growth > 0 && f.priorRevenue > 0).sort((a, b) => b.growth - a.growth).slice(0, 3)
    const moversDown = [...franchisees].filter(f => f.growth < 0 && f.priorRevenue > 0).sort((a, b) => a.growth - b.growth).slice(0, 3)

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--theme-accent)' }} />
                    <p className="text-sm text-stone-500">Loading CEO dashboard…</p>
                </div>
            </div>
        )
    }

    const FSH = ({ field, children }: { field: string; children: React.ReactNode }) => (
        <th
            className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500 cursor-pointer hover:text-stone-300 transition-colors select-none"
            onClick={() => toggleFSort(field)}
        >
            <span className="flex items-center gap-1">
                {children}
                {fSortField === field && <ArrowUpDown className="h-2.5 w-2.5 text-[var(--theme-accent)]" />}
            </span>
        </th>
    )

    return (
        <>
            <AnchorBar active={activeSection} />

            <div className="min-h-screen relative overflow-hidden">
                {/* Ambient glows */}
                <div className="absolute top-[-8%] right-[-4%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
                     style={{ backgroundColor: 'var(--theme-accent-muted)' }} />
                <div className="absolute bottom-[-8%] left-[-4%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none opacity-50"
                     style={{ backgroundColor: 'var(--theme-accent-muted)' }} />

                <div className="relative z-10 px-6 py-6 space-y-8 max-w-[1800px] mx-auto">

                    {/* ═══════════════════════════
                       §1 OVERVIEW — Executive KPIs
                    ═══════════════════════════ */}
                    <section id="overview" className="scroll-mt-28 space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                                    <Crown className="h-5 w-5 text-violet-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h1 className="text-2xl font-black text-white tracking-tight">{data?.name || 'Brand HQ'}</h1>
                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border bg-violet-500/15 text-violet-400 border-violet-500/20">CEO Dashboard</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-sm text-stone-500">
                                            {k?.totalFranchisees || 0} franchisees · {k?.totalLocations || 0} locations · {k?.totalEmployees || 0} staff
                                        </p>
                                        <span className="text-xs text-stone-600">•</span>
                                        <DataLabel fetchedAt={data?.fetchedAt} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {data?.brandCode && (
                                    <span className="px-2.5 py-1 rounded-md bg-violet-500/15 border border-violet-500/20 text-violet-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer hover:bg-violet-500/25 transition-colors"
                                        onClick={() => navigator.clipboard.writeText(data.brandCode!)} title="Copy brand code">
                                        {data.brandCode} <Copy className="h-3 w-3 opacity-50" />
                                    </span>
                                )}
                                <button onClick={fetchData} disabled={loading}
                                    className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 rounded-xl border border-white/[0.06] transition-all text-sm font-medium">
                                    <Activity className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                                </button>
                            </div>
                        </div>

                        {/* 6 KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                            {[
                                {
                                    title: 'Network Revenue', value: formatCurrency(k?.networkRevenue || 0),
                                    sub: 'Last 30 days', icon: DollarSign, variant: 'success' as const, pulse: true,
                                    trend: k?.sameStoreGrowth ? { v: k.sameStoreGrowth, l: 'vs prior' } : null,
                                },
                                {
                                    title: 'Same-Store Growth', value: k?.sameStoreGrowth ? `${k.sameStoreGrowth >= 0 ? '+' : ''}${k.sameStoreGrowth.toFixed(1)}%` : '—',
                                    sub: 'Period-over-period', icon: TrendingUp,
                                    variant: (k?.sameStoreGrowth || 0) > 0 ? 'success' as const : (k?.sameStoreGrowth || 0) < 0 ? 'danger' as const : 'default' as const,
                                },
                                {
                                    title: 'Active Locations', value: `${k?.activeLocations || 0}`,
                                    sub: `${k?.pendingOpenings || 0} pending go-live`, icon: MapPin,
                                    variant: (k?.pendingOpenings || 0) > 0 ? 'warning' as const : 'accent' as const,
                                },
                                {
                                    title: 'Pending Openings', value: `${k?.pendingOpenings || 0}`,
                                    sub: data?.rollout ? `~${data.rollout.avgDaysToGoLive}d avg activation` : '', icon: Rocket,
                                    variant: (k?.pendingOpenings || 0) > 0 ? 'warning' as const : 'success' as const,
                                },
                                {
                                    title: 'Royalties', value: formatCurrency(k?.royaltiesCollected || 0),
                                    sub: `${formatCurrency(k?.royaltiesDue || 0)} due`, icon: Briefcase,
                                    variant: (k?.royaltiesOverdue || 0) > 0 ? 'warning' as const : 'success' as const,
                                },
                                {
                                    title: 'Health Score', value: `${k?.franchiseeHealthScore || 100}`,
                                    sub: 'Network average', icon: Heart,
                                    variant: (k?.franchiseeHealthScore || 100) >= 80 ? 'success' as const
                                        : (k?.franchiseeHealthScore || 100) >= 60 ? 'warning' as const : 'danger' as const,
                                },
                            ].map((kpi, i) => {
                                const vStyles: Record<string, { border: string; iconBg: string; iconColor: string }> = {
                                    default: { border: 'border-white/[0.06]', iconBg: 'bg-white/[0.06]', iconColor: 'text-stone-400' },
                                    success: { border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
                                    warning: { border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
                                    danger: { border: 'border-red-500/20', iconBg: 'bg-red-500/10', iconColor: 'text-red-400' },
                                    accent: { border: 'border-[var(--theme-accent)]/20', iconBg: 'bg-[var(--theme-accent-muted)]', iconColor: 'text-[var(--theme-accent)]' },
                                }
                                const v = vStyles[kpi.variant]
                                return (
                                    <div key={i} className={`relative overflow-hidden rounded-xl border p-4 bg-stone-900/50 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] group cursor-pointer ${v.border}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${v.iconBg}`}>
                                                {kpi.pulse && <span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse top-2 right-2" />}
                                                <kpi.icon className={`h-4 w-4 ${v.iconColor}`} />
                                            </div>
                                        </div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">{kpi.title}</p>
                                        <p className="text-xl font-black text-white tracking-tight leading-none">{kpi.value}</p>
                                        <p className="text-[10px] text-stone-500 mt-1.5">{kpi.sub}</p>
                                        {kpi.trend && (
                                            <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${kpi.trend.v >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {kpi.trend.v >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                {kpi.trend.v >= 0 ? '+' : ''}{kpi.trend.v.toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Biggest Movers */}
                        {(moversUp.length > 0 || moversDown.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {moversUp.length > 0 && (
                                    <div className="bg-stone-900/50 backdrop-blur-md border border-emerald-500/10 rounded-xl p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5"><ArrowUp className="h-3 w-3" /> Biggest Movers Up</p>
                                        <div className="space-y-2">
                                            {moversUp.map(f => (
                                                <div key={f.id} className="flex items-center justify-between cursor-pointer hover:bg-white/[0.03] rounded-lg px-2 py-1.5 transition-colors"
                                                    onClick={() => setDrawerFranchisee(f.id)}>
                                                    <span className="text-sm font-medium text-white">{f.name}</span>
                                                    <GrowthBadge value={f.growth} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {moversDown.length > 0 && (
                                    <div className="bg-stone-900/50 backdrop-blur-md border border-red-500/10 rounded-xl p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1.5"><ArrowDown className="h-3 w-3" /> Biggest Movers Down</p>
                                        <div className="space-y-2">
                                            {moversDown.map(f => (
                                                <div key={f.id} className="flex items-center justify-between cursor-pointer hover:bg-white/[0.03] rounded-lg px-2 py-1.5 transition-colors"
                                                    onClick={() => setDrawerFranchisee(f.id)}>
                                                    <span className="text-sm font-medium text-white">{f.name}</span>
                                                    <GrowthBadge value={f.growth} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* ═══════════════════════════
                       §2 NEEDS ATTENTION TODAY
                    ═══════════════════════════ */}
                    <section id="attention" className="scroll-mt-28">
                        <SectionHeader id="_att" title="Needs Attention Today" icon={Zap} badge={attention.length} />
                        {attention.length === 0 ? (
                            <div className="bg-stone-900/50 backdrop-blur-md border border-emerald-500/15 rounded-xl p-8 text-center">
                                <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
                                <p className="font-semibold text-stone-300">Network is healthy</p>
                                <p className="text-xs text-stone-500 mt-1">No items require CEO attention today</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                {attention.map((item, i) => {
                                    const sevStyles = {
                                        critical: 'border-red-500/20 bg-red-500/[0.04]',
                                        warning: 'border-amber-500/20 bg-amber-500/[0.04]',
                                        info: 'border-blue-500/20 bg-blue-500/[0.04]',
                                    }
                                    const dotColors = { critical: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500' }
                                    return (
                                        <div key={i} className={`rounded-xl border p-4 transition-colors hover:bg-white/[0.02] ${sevStyles[item.severity]}`}>
                                            <div className="flex items-start gap-3">
                                                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColors[item.severity]}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-white leading-snug">{item.title}</p>
                                                    <p className="text-xs text-stone-400 mt-1 leading-relaxed">{item.description}</p>
                                                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-stone-400 uppercase">{item.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </section>

                    {/* ═══════════════════════════
                       §3 FRANCHISEE LEADERBOARD
                    ═══════════════════════════ */}
                    <section id="franchisees" className="scroll-mt-28">
                        <SectionHeader id="_fl" title="Franchisee Leaderboard" icon={Users}
                            right={<DataLabel fetchedAt={data?.fetchedAt} />} />
                        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-white/[0.06]">
                                            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">#</th>
                                            <FSH field="name">Franchisee</FSH>
                                            <FSH field="region">Region</FSH>
                                            <FSH field="locationCount">Locations</FSH>
                                            <FSH field="monthlyRevenue">Revenue</FSH>
                                            <FSH field="growth">Growth</FSH>
                                            <FSH field="avgTicket">Avg Ticket</FSH>
                                            <FSH field="royaltiesDue">Royalties Due</FSH>
                                            <FSH field="royaltiesCollected">Collected</FSH>
                                            <FSH field="health">Health</FSH>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                                            <th className="px-3 py-2.5 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedFranchisees.map((f, i) => (
                                            <tr key={f.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                                onClick={() => setDrawerFranchisee(f.id)}>
                                                <td className="px-3 py-2.5 text-stone-500 font-mono text-[10px]">{i + 1}</td>
                                                <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap">{f.name}</td>
                                                <td className="px-3 py-2.5"><span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-stone-400">{f.region}</span></td>
                                                <td className="px-3 py-2.5 text-stone-300">{f.locationCount}</td>
                                                <td className="px-3 py-2.5 font-bold text-emerald-400">{formatCurrency(f.monthlyRevenue)}</td>
                                                <td className="px-3 py-2.5"><GrowthBadge value={f.growth} /></td>
                                                <td className="px-3 py-2.5 text-stone-300">{formatCurrency(f.avgTicket)}</td>
                                                <td className="px-3 py-2.5 text-stone-300">{f.royaltiesDue > 0 ? formatCurrency(f.royaltiesDue) : '—'}</td>
                                                <td className="px-3 py-2.5 text-stone-300">{f.royaltiesCollected > 0 ? formatCurrency(f.royaltiesCollected) : '—'}</td>
                                                <td className="px-3 py-2.5"><HealthBadge score={f.health} /></td>
                                                <td className="px-3 py-2.5">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        f.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                                                        f.status === 'critical' ? 'bg-red-500/15 text-red-400' :
                                                        f.status === 'warning' ? 'bg-amber-500/15 text-amber-400' :
                                                        'bg-stone-700 text-stone-400'
                                                    }`}>{f.status}</span>
                                                </td>
                                                <td className="px-3 py-2.5"><ChevronRight className="h-3.5 w-3.5 text-stone-600 group-hover:text-[var(--theme-accent)]" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* ═══════════════════════════
                       §4 REGION PERFORMANCE
                    ═══════════════════════════ */}
                    <section id="regions" className="scroll-mt-28">
                        <SectionHeader id="_rp" title="Region Performance" icon={Globe} />
                        {regions.length === 0 ? (
                            <div className="bg-stone-900/50 border border-white/[0.06] rounded-xl p-8 text-center">
                                <Globe className="h-10 w-10 mx-auto mb-3 text-stone-600" />
                                <p className="font-medium text-stone-400">No regions assigned</p>
                                <p className="text-xs text-stone-500 mt-1">Set region on each franchise to enable geographic comparison.</p>
                            </div>
                        ) : (
                            <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-white/[0.06]">
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Region</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Revenue</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Growth</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Stores</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Weak</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Openings</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Top Franchisee</th>
                                                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Concern</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {regions.map(r => (
                                                <tr key={r.region} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                                                    <td className="px-4 py-3 font-semibold text-white">{r.region}</td>
                                                    <td className="px-4 py-3 font-bold text-emerald-400">{formatCurrency(r.revenue)}</td>
                                                    <td className="px-4 py-3"><GrowthBadge value={r.growth} /></td>
                                                    <td className="px-4 py-3 text-stone-300">{r.stores}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`font-bold ${r.weakStores > 0 ? 'text-red-400' : 'text-stone-500'}`}>{r.weakStores}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-stone-300">{r.openings}</td>
                                                    <td className="px-4 py-3 text-stone-400 max-w-[150px] truncate">{r.topFranchisee || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                            r.concern === 'high' ? 'bg-red-500/15 text-red-400' :
                                                            r.concern === 'moderate' ? 'bg-amber-500/15 text-amber-400' :
                                                            'bg-emerald-500/15 text-emerald-400'
                                                        }`}>{r.concern}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ═══════════════════════════
                       §5 STORE-WISE REPORTING
                    ═══════════════════════════ */}
                    <section id="stores" className="scroll-mt-28">
                        <SectionHeader id="_sr" title="Store-Wise Reporting" icon={Store} badge={stores.length}
                            right={<DataLabel fetchedAt={data?.fetchedAt} />} />
                        <StoreReportingCenter stores={stores} onSelect={setDrawerStore} fetchedAt={data?.fetchedAt} />
                    </section>

                    {/* ═══════════════════════════
                       §6 OPENINGS & ROLLOUT
                    ═══════════════════════════ */}
                    <section id="rollout" className="scroll-mt-28">
                        <SectionHeader id="_ro" title="Openings & Rollout" icon={Rocket}
                            badge={(data?.rollout?.pending || 0) + (data?.rollout?.stationRequests || 0)} />
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { label: 'Live', value: data?.rollout?.live || 0, color: 'emerald', icon: CheckCircle },
                                { label: 'Pending Go-Live', value: data?.rollout?.pending || 0, color: 'amber', icon: Clock },
                                { label: 'Blocked / Offline', value: data?.rollout?.blocked || 0, color: 'red', icon: AlertCircle },
                                { label: 'Station Requests', value: data?.rollout?.stationRequests || 0, color: 'blue', icon: Store },
                                { label: 'Avg Days to Go-Live', value: data?.rollout?.avgDaysToGoLive || 0, color: 'violet', icon: Gauge },
                            ].map(c => (
                                <div key={c.label} className={`bg-stone-900/50 backdrop-blur-md border border-${c.color}-500/20 rounded-xl p-5`}>
                                    <c.icon className={`h-4 w-4 text-${c.color}-400 mb-2`} />
                                    <p className="text-2xl font-black text-white">{c.value}</p>
                                    <p className="text-[11px] text-stone-500 mt-1">{c.label}</p>
                                </div>
                            ))}
                        </div>
                        {(data?.rollout?.live || 0) + (data?.rollout?.pending || 0) > 0 && (
                            <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-xl p-5 mt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-bold text-white">Rollout Progress</p>
                                    <span className="text-sm font-bold text-[var(--theme-accent)]">
                                        {k?.totalLocations ? ((data?.rollout?.live || 0) / k.totalLocations * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                                <div className="h-3 rounded-full bg-stone-800 overflow-hidden flex">
                                    <div className="h-full bg-emerald-500" style={{ width: `${k?.totalLocations ? ((data?.rollout?.live || 0) / k.totalLocations * 100) : 0}%` }} />
                                    <div className="h-full bg-amber-500/60" style={{ width: `${k?.totalLocations ? ((data?.rollout?.pending || 0) / k.totalLocations * 100) : 0}%` }} />
                                    <div className="h-full bg-red-500/40" style={{ width: `${k?.totalLocations ? ((data?.rollout?.blocked || 0) / k.totalLocations * 100) : 0}%` }} />
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ═══════════════════════════
                       §7 FINANCIALS / ROYALTIES
                    ═══════════════════════════ */}
                    <section id="financials" className="scroll-mt-28">
                        <SectionHeader id="_fin" title="Financial & Royalties Summary" icon={DollarSign}
                            right={<DataLabel fetchedAt={data?.fetchedAt} />} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                            <div className="bg-stone-900/50 border border-emerald-500/20 rounded-xl p-5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Collected</p>
                                <p className="text-2xl font-black text-emerald-400">{formatCurrency(data?.royalties?.collected || 0)}</p>
                            </div>
                            <div className="bg-stone-900/50 border border-white/[0.06] rounded-xl p-5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Total Due</p>
                                <p className="text-2xl font-black text-white">{formatCurrency(data?.royalties?.due || 0)}</p>
                            </div>
                            <div className={`bg-stone-900/50 border ${(data?.royalties?.overdue || 0) > 0 ? 'border-red-500/20' : 'border-white/[0.06]'} rounded-xl p-5`}>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Overdue / Variance</p>
                                <p className={`text-2xl font-black ${(data?.royalties?.overdue || 0) > 0 ? 'text-red-400' : 'text-stone-500'}`}>
                                    {formatCurrency(data?.royalties?.overdue || 0)}
                                </p>
                            </div>
                            <div className="bg-stone-900/50 border border-white/[0.06] rounded-xl p-5">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">Network Revenue</p>
                                <p className="text-2xl font-black text-white">{formatCurrency(k?.networkRevenue || 0)}</p>
                                <p className="text-[10px] text-stone-500 mt-1">Prior: {formatCurrency(k?.priorRevenue || 0)}</p>
                            </div>
                        </div>

                        {/* Royalty by franchisee */}
                        {(data?.royalties?.byFranchisee?.length || 0) > 0 && (
                            <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-xl overflow-hidden">
                                <div className="px-5 py-3 border-b border-white/[0.06]">
                                    <p className="text-sm font-bold text-white">Royalties by Franchisee</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-white/[0.06]">
                                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Franchisee</th>
                                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Due</th>
                                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Collected</th>
                                                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Variance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data!.royalties.byFranchisee.map((r: any) => (
                                                <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                                                    <td className="px-4 py-2.5 font-medium text-white">{r.name}</td>
                                                    <td className="px-4 py-2.5 text-stone-300">{formatCurrency(r.due)}</td>
                                                    <td className="px-4 py-2.5 text-emerald-400 font-medium">{formatCurrency(r.collected)}</td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`font-bold ${r.variance > 0 ? 'text-red-400' : 'text-stone-500'}`}>
                                                            {r.variance > 0 ? formatCurrency(r.variance) : '—'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

                    <div className="h-8" />
                </div>
            </div>

            {/* ═══ STORE DETAIL DRAWER ═══ */}
            <DrawerPanel open={!!drawerStore} onClose={() => setDrawerStore(null)}
                title={selectedStore?.name || 'Store'} subtitle={selectedStore?.address || 'Store details'} width="xl">
                {selectedStore && (() => {
                    const s = selectedStore
                    return (
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <StatusDot status={s.status} />
                                <span className="text-sm font-semibold uppercase text-stone-300">{s.status}</span>
                                <HealthBadge score={s.health} />
                            </div>
                            {s.topIssue && (
                                <div className="bg-red-500/[0.06] border border-red-500/20 rounded-xl px-4 py-3">
                                    <p className="text-xs font-bold text-red-400 uppercase mb-1">Top Issue</p>
                                    <p className="text-sm text-white">{s.topIssue}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { l: 'Revenue (30d)', v: formatCurrency(s.revenue), c: 'text-emerald-400' },
                                    { l: 'Prior Period', v: formatCurrency(s.priorRevenue), c: 'text-stone-400' },
                                    { l: 'Growth', v: `${s.growth >= 0 ? '+' : ''}${s.growth.toFixed(1)}%`, c: s.growth >= 0 ? 'text-emerald-400' : 'text-red-400' },
                                    { l: 'Avg Ticket', v: formatCurrency(s.avgTicket), c: 'text-white' },
                                    { l: 'Transactions', v: `${s.txnCount}`, c: 'text-white' },
                                    { l: 'Repeat Customer %', v: `${s.repeatPct.toFixed(0)}%`, c: s.repeatPct >= 50 ? 'text-emerald-400' : 'text-amber-400' },
                                    { l: 'No-Show %', v: `${s.noShowPct.toFixed(0)}%`, c: s.noShowPct > 15 ? 'text-red-400' : 'text-stone-300' },
                                    { l: 'Total Appointments', v: `${s.totalAppts}`, c: 'text-white' },
                                ].map(x => (
                                    <div key={x.l} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">{x.l}</p>
                                        <p className={`text-lg font-black ${x.c}`}>{x.v}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Franchisee</p>
                                <p className="text-sm font-semibold text-white">{s.franchisee}</p>
                                <p className="text-xs text-stone-500">{s.region}</p>
                            </div>
                        </div>
                    )
                })()}
            </DrawerPanel>

            {/* ═══ FRANCHISEE DETAIL DRAWER ═══ */}
            <DrawerPanel open={!!drawerFranchisee} onClose={() => setDrawerFranchisee(null)}
                title={selectedFranchisee?.name || 'Franchisee'} subtitle="30-day performance overview" width="xl">
                {selectedFranchisee && (() => {
                    const f = selectedFranchisee
                    const fStores = stores.filter(s => s.franchiseId === f.id)
                    return (
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <StatusDot status={f.status} />
                                <span className="text-sm font-semibold uppercase text-stone-300">{f.status}</span>
                                <HealthBadge score={f.health} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { l: 'Revenue', v: formatCurrency(f.monthlyRevenue), c: 'text-emerald-400' },
                                    { l: 'Prior Period', v: formatCurrency(f.priorRevenue), c: 'text-stone-400' },
                                    { l: 'Growth', v: `${f.growth >= 0 ? '+' : ''}${f.growth.toFixed(1)}%`, c: f.growth >= 0 ? 'text-emerald-400' : 'text-red-400' },
                                    { l: 'Avg Ticket', v: formatCurrency(f.avgTicket), c: 'text-white' },
                                    { l: 'Locations', v: `${f.locationCount}`, c: 'text-white' },
                                    { l: 'Employees', v: `${f.employeeCount}`, c: 'text-white' },
                                    { l: 'Transactions', v: `${f.transactionCount}`, c: 'text-white' },
                                    { l: 'Region', v: f.region, c: 'text-stone-300' },
                                ].map(x => (
                                    <div key={x.l} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">{x.l}</p>
                                        <p className={`text-lg font-black ${x.c}`}>{x.v}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Royalties */}
                            {(f.royaltiesDue > 0 || f.royaltiesCollected > 0) && (
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">Royalties</p>
                                    <div className="flex items-center justify-between">
                                        <div><p className="text-xs text-stone-500">Due</p><p className="text-lg font-bold text-white">{formatCurrency(f.royaltiesDue)}</p></div>
                                        <div className="text-right"><p className="text-xs text-stone-500">Collected</p><p className="text-lg font-bold text-emerald-400">{formatCurrency(f.royaltiesCollected)}</p></div>
                                    </div>
                                </div>
                            )}
                            {/* Franchisee's stores */}
                            {fStores.length > 0 && (
                                <div>
                                    <p className="text-sm font-bold text-stone-300 mb-2">Stores ({fStores.length})</p>
                                    <div className="space-y-2">
                                        {fStores.sort((a, b) => b.revenue - a.revenue).map(s => (
                                            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-colors cursor-pointer"
                                                onClick={() => { setDrawerFranchisee(null); setTimeout(() => setDrawerStore(s.id), 200) }}>
                                                <div className="flex items-center gap-2">
                                                    <StatusDot status={s.status} />
                                                    <div>
                                                        <p className="text-sm font-medium text-white">{s.name}</p>
                                                        {s.topIssue && <p className="text-[10px] text-red-400">{s.topIssue}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-emerald-400">{formatCurrency(s.revenue)}</p>
                                                        <GrowthBadge value={s.growth} />
                                                    </div>
                                                    <HealthBadge score={s.health} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })()}
            </DrawerPanel>
        </>
    )
}
