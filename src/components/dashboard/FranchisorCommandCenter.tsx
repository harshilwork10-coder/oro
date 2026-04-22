'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
    DollarSign, Users, MapPin, TrendingUp,
    AlertCircle, BarChart3, ChevronRight, Copy,
    Crown, Rocket, ArrowUpDown, AlertTriangle,
    CheckCircle, Zap, Flag, Activity, Layers,
    TrendingDown, Globe, Store, Download,
    ChevronDown, X, Heart, Clock,
    Briefcase, ArrowDown, ArrowUp, Gauge, Search,
    ExternalLink, FileText, Table2, ChevronUp
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import DrawerPanel from './command-center/DrawerPanel'

// ═══════════════════════════════════════════════════════
// TYPES (data contract)
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
    weakStores: number; topIssue: string | null
}
interface RegionData {
    region: string; revenue: number; priorRevenue: number; growth: number
    stores: number; weakStores: number; openings: number; franchiseeCount: number
    topFranchisee: string; concern: 'low' | 'moderate' | 'high'
}
interface Mover {
    type: 'franchisee' | 'region' | 'store'; id: string; name: string
    delta: number; direction: 'up' | 'down'; region: string; why: string
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
        offlineLocations: number; royaltiesCollected: number; royaltiesDue: number
        royaltiesOverdue: number; franchiseeHealthScore: number
        healthBreakdown: { green: number; yellow: number; red: number }
        totalFranchisees: number; totalEmployees: number; totalTransactions: number
        attentionCount: number; attentionCritical: number
    }
    franchisees: FranchiseeData[]; stores: StoreData[]; regions: RegionData[]
    royalties: { collected: number; due: number; overdue: number; byFranchisee: any[] }
    rollout: { live: number; pending: number; blocked: number; stationRequests: number; avgDaysToGoLive: number }
    attentionItems: AttentionItem[]; recentMovers: Mover[]
    fetchedAt: string
}

// ═══════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ═══════════════════════════════════════════════════════

function DataFresh({ at }: { at?: string }) {
    const t = at ? new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null
    return <span className="flex items-center gap-1.5 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="font-medium uppercase tracking-wide text-emerald-400">Live</span>{t && <span className="text-stone-600">· {t}</span>}</span>
}
function HealthBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
    const c = score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
        : score >= 60 ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
        : 'bg-red-500/15 text-red-400 border-red-500/20'
    return <span className={`inline-flex items-center justify-center rounded border font-bold ${
        size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'
    } ${c}`}>{score}</span>
}
function Delta({ value, suffix = '%' }: { value: number; suffix?: string }) {
    if (value === 0) return <span className="text-xs text-stone-600">—</span>
    const up = value >= 0
    return <span className={`text-xs font-bold flex items-center gap-0.5 ${up ? 'text-emerald-400' : 'text-red-400'}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {up ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
}
function StatusBadge({ status }: { status: string }) {
    const m: Record<string, string> = {
        active: 'bg-emerald-500/15 text-emerald-400', critical: 'bg-red-500/15 text-red-400',
        warning: 'bg-amber-500/15 text-amber-400', pending: 'bg-stone-700 text-stone-400',
        ACTIVE: 'bg-emerald-500/15 text-emerald-400', PROVISIONING_PENDING: 'bg-amber-500/15 text-amber-400',
        READY_FOR_INSTALL: 'bg-blue-500/15 text-blue-400', SUSPENDED: 'bg-red-500/15 text-red-400',
    }
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${m[status] || 'bg-stone-700 text-stone-400'}`}>{status}</span>
}
function ConcernBadge({ level }: { level: string }) {
    const m: Record<string, string> = {
        high: 'bg-red-500/15 text-red-400', moderate: 'bg-amber-500/15 text-amber-400', low: 'bg-emerald-500/15 text-emerald-400',
    }
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m[level] || m.low}`}>{level}</span>
}
function SectionHead({ title, icon: Icon, badge, right }: { title: string; icon: any; badge?: number; right?: React.ReactNode }) {
    return <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"><Icon className="h-3.5 w-3.5 text-violet-400" /></div>
            <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
            {(badge ?? 0) > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">{badge}</span>}
        </div>
        {right}
    </div>
}
function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
    return <div className={`bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-xl ${className}`}>{children}</div>
}

// Sortable header utility
function useSortable<T>(data: T[], defaultField: keyof T, defaultDir: 'asc' | 'desc' = 'desc') {
    const [field, setField] = useState<keyof T>(defaultField)
    const [dir, setDir] = useState<'asc' | 'desc'>(defaultDir)
    const toggle = (f: keyof T) => { if (field === f) setDir(d => d === 'asc' ? 'desc' : 'asc'); else { setField(f); setDir('desc') } }
    const sorted = useMemo(() => [...data].sort((a, b) => {
        const av = a[field] as any ?? 0, bv = b[field] as any ?? 0
        if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        return dir === 'asc' ? av - bv : bv - av
    }), [data, field, dir])
    return { sorted, field, dir, toggle }
}
function TH({ field, current, onClick, children }: { field: string; current: string; onClick: () => void; children: React.ReactNode }) {
    return <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500 cursor-pointer hover:text-stone-300 transition-colors select-none" onClick={onClick}>
        <span className="flex items-center gap-1">{children}{current === field && <ArrowUpDown className="h-2.5 w-2.5 text-violet-400" />}</span>
    </th>
}

// ═══════════════════════════════════════════════════════
// ROW 1 — KPI STRIP (6 cards)
// ═══════════════════════════════════════════════════════

function KpiStrip({ k, fetchedAt, actions }: { k: DashboardData['kpis'] | null; fetchedAt?: string; actions: Record<string, () => void> }) {
    if (!k) return null
    const royaltyVar = k.royaltiesDue - k.royaltiesCollected
    const kpis = [
        { title: 'Network Revenue', value: formatCurrency(k.networkRevenue), delta: k.sameStoreGrowth, sub: `${k.activeLocations} stores contributing`, variant: 'success', pulse: true, onClick: actions.financials },
        { title: 'Same-Store Growth', value: `${k.sameStoreGrowth >= 0 ? '+' : ''}${k.sameStoreGrowth.toFixed(1)}%`, delta: null, sub: 'Excl. new openings', variant: k.sameStoreGrowth > 0 ? 'success' : k.sameStoreGrowth < 0 ? 'danger' : 'muted', onClick: actions.stores },
        { title: 'Locations', value: `${k.activeLocations}`, delta: null, sub: `${k.pendingOpenings} pending · ${k.offlineLocations || 0} offline`, variant: k.pendingOpenings > 0 ? 'warning' : 'accent', onClick: actions.rollout },
        { title: 'Royalties', value: formatCurrency(k.royaltiesCollected), delta: null, sub: `${formatCurrency(k.royaltiesDue)} due${royaltyVar > 0 ? ` · ${formatCurrency(royaltyVar)} variance` : ''}`, variant: k.royaltiesOverdue > 0 ? 'warning' : 'success', onClick: actions.financials },
        { title: 'Health Score', value: `${k.franchiseeHealthScore}`, delta: null, sub: `${k.healthBreakdown?.green || 0}🟢 ${k.healthBreakdown?.yellow || 0}🟡 ${k.healthBreakdown?.red || 0}🔴`, variant: k.franchiseeHealthScore >= 80 ? 'success' : k.franchiseeHealthScore >= 60 ? 'warning' : 'danger', onClick: actions.franchiseesWorst },
        { title: 'Needs Attention', value: `${k.attentionCount || 0}`, delta: null, sub: `${k.attentionCritical || 0} critical`, variant: (k.attentionCritical || 0) > 0 ? 'danger' : (k.attentionCount || 0) > 0 ? 'warning' : 'success', onClick: actions.attention },
    ]
    const vs: Record<string, { border: string; iconBg: string; ic: string }> = {
        success: { border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', ic: 'text-emerald-400' },
        warning: { border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', ic: 'text-amber-400' },
        danger: { border: 'border-red-500/20', iconBg: 'bg-red-500/10', ic: 'text-red-400' },
        accent: { border: 'border-violet-500/20', iconBg: 'bg-violet-500/10', ic: 'text-violet-400' },
        muted: { border: 'border-white/[0.06]', iconBg: 'bg-white/[0.06]', ic: 'text-stone-400' },
    }
    const icons = [DollarSign, TrendingUp, MapPin, Briefcase, Heart, Zap]
    return <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi, i) => {
            const v = vs[kpi.variant] || vs.muted; const Ic = icons[i]
            return <div key={i} onClick={kpi.onClick} className={`relative rounded-xl border p-4 bg-stone-900/50 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] cursor-pointer group ${v.border}`}>
                {kpi.pulse && <span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse top-2.5 right-2.5" />}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${v.iconBg}`}><Ic className={`h-3.5 w-3.5 ${v.ic}`} /></div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">{kpi.title}</p>
                <p className="text-xl font-black text-white tracking-tight leading-none">{kpi.value}</p>
                <p className="text-[10px] text-stone-500 mt-1.5 leading-snug">{kpi.sub}</p>
                {kpi.delta !== null && kpi.delta !== 0 && <div className="mt-1"><Delta value={kpi.delta} /></div>}
            </div>
        })}
    </div>
}

// ═══════════════════════════════════════════════════════
// ROW 2 LEFT — NEEDS ATTENTION TODAY
// ═══════════════════════════════════════════════════════

function NeedsAttentionPanel({ items, fetchedAt }: { items: AttentionItem[]; fetchedAt?: string }) {
    const sevDot: Record<string, string> = { critical: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500' }
    const sevBg: Record<string, string> = { critical: 'border-red-500/15 bg-red-500/[0.04]', warning: 'border-amber-500/15 bg-amber-500/[0.04]', info: 'border-blue-500/15 bg-blue-500/[0.04]' }
    const display = items.slice(0, 7)
    return <Card className="h-full flex flex-col">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /><h3 className="font-bold text-white text-sm">Needs Attention Today</h3>
                {items.length > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">{items.length}</span>}
            </div>
            <DataFresh at={fetchedAt} />
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide">
            {display.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center px-6">
                    <CheckCircle className="h-8 w-8 text-emerald-500/50 mb-2" />
                    <p className="font-medium text-stone-400 text-sm">Nothing urgent</p>
                    <p className="text-[11px] text-stone-600 mt-0.5">Network operating within thresholds</p>
                </div>
            ) : (
                <div className="p-3 space-y-2">
                    {display.map((item, i) => (
                        <div key={i} className={`rounded-lg border px-3.5 py-3 transition-colors hover:bg-white/[0.02] ${sevBg[item.severity]}`}>
                            <div className="flex items-start gap-2.5">
                                <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${sevDot[item.severity]}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-semibold text-white leading-snug">{item.title}</p>
                                    <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
                                    <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/[0.05] text-stone-500 uppercase">{item.category}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </Card>
}

// ═══════════════════════════════════════════════════════
// ROW 2 RIGHT — ROLLOUT SNAPSHOT
// ═══════════════════════════════════════════════════════

function RolloutSnapshot({ rollout, fetchedAt }: { rollout: DashboardData['rollout'] | null; fetchedAt?: string }) {
    if (!rollout) return null
    const items = [
        { label: 'Pending Go-Live', value: rollout.pending, color: 'text-amber-400', icon: Clock },
        { label: 'Blocked / Offline', value: rollout.blocked, color: rollout.blocked > 0 ? 'text-red-400' : 'text-stone-500', icon: AlertCircle },
        { label: 'Station Requests', value: rollout.stationRequests, color: 'text-blue-400', icon: Store },
        { label: 'Avg Days to Go-Live', value: rollout.avgDaysToGoLive, color: 'text-violet-400', icon: Gauge },
        { label: 'Live Locations', value: rollout.live, color: 'text-emerald-400', icon: CheckCircle },
    ]
    return <Card className="h-full flex flex-col">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2"><Rocket className="h-4 w-4 text-violet-400" /><h3 className="font-bold text-white text-sm">Openings & Pipeline</h3></div>
            <DataFresh at={fetchedAt} />
        </div>
        <div className="flex-1 p-4 space-y-2.5">
            {items.map(item => (
                <div key={item.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                        <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                        <span className="text-xs text-stone-400 font-medium">{item.label}</span>
                    </div>
                    <span className={`text-lg font-black ${item.color}`}>{item.value}</span>
                </div>
            ))}
            {/* Rollout progress */}
            {(rollout.live + rollout.pending) > 0 && <div className="pt-1">
                <div className="h-2 rounded-full bg-stone-800 overflow-hidden flex">
                    <div className="h-full bg-emerald-500" style={{ width: `${(rollout.live / (rollout.live + rollout.pending + rollout.blocked)) * 100}%` }} />
                    <div className="h-full bg-amber-500/60" style={{ width: `${(rollout.pending / (rollout.live + rollout.pending + rollout.blocked)) * 100}%` }} />
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-[10px] text-stone-600">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Live ({rollout.live})</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Pending ({rollout.pending})</span>
                </div>
            </div>}
        </div>
    </Card>
}

// ═══════════════════════════════════════════════════════
// ROW 3 — FRANCHISEE LEADERBOARD
// ═══════════════════════════════════════════════════════

type FranchisePreset = 'top' | 'worst' | 'improved' | 'declined' | 'royalty' | 'all'

function FranchiseeLeaderboard({ franchisees, fetchedAt, onSelect }: {
    franchisees: FranchiseeData[]; fetchedAt?: string; onSelect: (id: string) => void
}) {
    const [preset, setPreset] = useState<FranchisePreset>('top')
    const presetData = useMemo(() => {
        switch (preset) {
            case 'top': return [...franchisees].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
            case 'worst': return [...franchisees].sort((a, b) => a.health - b.health)
            case 'improved': return [...franchisees].filter(f => f.growth > 0 && f.priorRevenue > 0).sort((a, b) => b.growth - a.growth)
            case 'declined': return [...franchisees].filter(f => f.growth < 0 && f.priorRevenue > 0).sort((a, b) => a.growth - b.growth)
            case 'royalty': return [...franchisees].filter(f => f.royaltiesDue > f.royaltiesCollected).sort((a, b) => (b.royaltiesDue - b.royaltiesCollected) - (a.royaltiesDue - a.royaltiesCollected))
            default: return franchisees
        }
    }, [franchisees, preset])
    const { sorted, field, toggle } = useSortable(presetData, 'monthlyRevenue')

    const presets: { id: FranchisePreset; label: string }[] = [
        { id: 'top', label: 'Top Performers' }, { id: 'worst', label: 'Worst Health' },
        { id: 'improved', label: 'Most Improved' }, { id: 'declined', label: 'Biggest Decline' },
        { id: 'royalty', label: 'Royalty Variance' }, { id: 'all', label: 'All' },
    ]

    return <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {presets.map(p => <button key={p.id} onClick={() => setPreset(p.id)}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all whitespace-nowrap ${preset === p.id ? 'bg-violet-500/15 text-violet-400' : 'text-stone-500 hover:text-stone-300'}`}>{p.label}</button>)}
            </div>
            <DataFresh at={fetchedAt} />
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto scrollbar-hide">
            <table className="w-full text-xs">
                <thead className="sticky top-0 bg-stone-900/95 backdrop-blur z-10">
                    <tr className="border-b border-white/[0.06]">
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500 w-8">#</th>
                        <TH field="name" current={field as string} onClick={() => toggle('name')}>Franchisee</TH>
                        <TH field="region" current={field as string} onClick={() => toggle('region')}>Region</TH>
                        <TH field="locationCount" current={field as string} onClick={() => toggle('locationCount')}>Loc</TH>
                        <TH field="monthlyRevenue" current={field as string} onClick={() => toggle('monthlyRevenue')}>Revenue</TH>
                        <TH field="growth" current={field as string} onClick={() => toggle('growth')}>Growth</TH>
                        <TH field="avgTicket" current={field as string} onClick={() => toggle('avgTicket')}>Avg Ticket</TH>
                        <TH field="royaltiesDue" current={field as string} onClick={() => toggle('royaltiesDue')}>Roy Due</TH>
                        <TH field="royaltiesCollected" current={field as string} onClick={() => toggle('royaltiesCollected')}>Roy Paid</TH>
                        <TH field="health" current={field as string} onClick={() => toggle('health')}>Health</TH>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Status</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Issue</th>
                        <th className="px-3 py-2.5 w-6"></th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((f, i) => <tr key={f.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group" onClick={() => onSelect(f.id)}>
                        <td className="px-3 py-2.5 text-stone-600 font-mono text-[10px]">{i + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap">{f.name}</td>
                        <td className="px-3 py-2.5"><span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-stone-400">{f.region}</span></td>
                        <td className="px-3 py-2.5 text-stone-300">{f.locationCount}</td>
                        <td className="px-3 py-2.5 font-bold text-emerald-400">{formatCurrency(f.monthlyRevenue)}</td>
                        <td className="px-3 py-2.5"><Delta value={f.growth} /></td>
                        <td className="px-3 py-2.5 text-stone-300">{formatCurrency(f.avgTicket)}</td>
                        <td className="px-3 py-2.5 text-stone-300">{f.royaltiesDue > 0 ? formatCurrency(f.royaltiesDue) : <span className="text-stone-600">—</span>}</td>
                        <td className="px-3 py-2.5 text-stone-300">{f.royaltiesCollected > 0 ? formatCurrency(f.royaltiesCollected) : <span className="text-stone-600">—</span>}</td>
                        <td className="px-3 py-2.5"><HealthBadge score={f.health} /></td>
                        <td className="px-3 py-2.5"><StatusBadge status={f.status} /></td>
                        <td className="px-3 py-2.5 max-w-[140px]">{f.topIssue ? <span className="text-[10px] text-red-400 font-medium truncate block">{f.topIssue}</span> : <span className="text-stone-600 text-[10px]">—</span>}</td>
                        <td className="px-3 py-2.5"><ChevronRight className="h-3.5 w-3.5 text-stone-600 group-hover:text-violet-400" /></td>
                    </tr>)}
                    {sorted.length === 0 && <tr><td colSpan={13} className="text-center py-10 text-stone-500 text-sm">No franchisees match this view</td></tr>}
                </tbody>
            </table>
        </div>
    </Card>
}

// ═══════════════════════════════════════════════════════
// ROW 4 LEFT — REGION PERFORMANCE
// ═══════════════════════════════════════════════════════

function RegionPerformanceTable({ regions, fetchedAt, onSelect }: {
    regions: RegionData[]; fetchedAt?: string; onSelect: (r: string) => void
}) {
    const { sorted, field, toggle } = useSortable(regions, 'revenue')
    return <Card className="h-full overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-violet-400" /><h3 className="font-bold text-white text-sm">Region Performance</h3></div>
            <DataFresh at={fetchedAt} />
        </div>
        {regions.length === 0 ? <div className="p-8 text-center"><Globe className="h-8 w-8 mx-auto mb-2 text-stone-700" /><p className="text-sm text-stone-400">No regions assigned</p><p className="text-[11px] text-stone-600 mt-0.5">Set region on each franchise to enable this view.</p></div> : (
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto scrollbar-hide">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-stone-900/95 backdrop-blur z-10">
                        <tr className="border-b border-white/[0.06]">
                            <TH field="region" current={field as string} onClick={() => toggle('region')}>Region</TH>
                            <TH field="revenue" current={field as string} onClick={() => toggle('revenue')}>Revenue</TH>
                            <TH field="growth" current={field as string} onClick={() => toggle('growth')}>Growth</TH>
                            <TH field="stores" current={field as string} onClick={() => toggle('stores')}>Stores</TH>
                            <TH field="weakStores" current={field as string} onClick={() => toggle('weakStores')}>Weak</TH>
                            <TH field="openings" current={field as string} onClick={() => toggle('openings')}>Openings</TH>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Top Franchisee</th>
                            <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Concern</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(r => <tr key={r.region} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => onSelect(r.region)}>
                            <td className="px-3 py-2.5 font-semibold text-white">{r.region}</td>
                            <td className="px-3 py-2.5 font-bold text-emerald-400">{formatCurrency(r.revenue)}</td>
                            <td className="px-3 py-2.5"><Delta value={r.growth} /></td>
                            <td className="px-3 py-2.5 text-stone-300">{r.stores}</td>
                            <td className="px-3 py-2.5"><span className={`font-bold ${r.weakStores > 0 ? 'text-red-400' : 'text-stone-600'}`}>{r.weakStores}</span></td>
                            <td className="px-3 py-2.5 text-stone-300">{r.openings}</td>
                            <td className="px-3 py-2.5 text-stone-400 max-w-[120px] truncate">{r.topFranchisee || '—'}</td>
                            <td className="px-3 py-2.5"><ConcernBadge level={r.concern} /></td>
                        </tr>)}
                    </tbody>
                </table>
            </div>
        )}
    </Card>
}

// ═══════════════════════════════════════════════════════
// ROW 4 RIGHT — TOP MOVERS
// ═══════════════════════════════════════════════════════

function TopMoversPanel({ movers, onClickFranchisee, onClickStore }: {
    movers: Mover[]
    onClickFranchisee: (id: string) => void; onClickStore: (id: string) => void
}) {
    const gainers = movers.filter(m => m.direction === 'up').slice(0, 4)
    const losers = movers.filter(m => m.direction === 'down').slice(0, 4)
    const typeIcon: Record<string, string> = { franchisee: '🏢', region: '🌎', store: '🏪' }

    const Row = ({ m }: { m: Mover }) => (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
            onClick={() => m.type === 'store' ? onClickStore(m.id) : m.type === 'franchisee' ? onClickFranchisee(m.id) : undefined}>
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{typeIcon[m.type]}</span>
                <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{m.name}</p>
                    <p className="text-[10px] text-stone-500 truncate">{m.why}</p>
                </div>
            </div>
            <Delta value={m.delta} />
        </div>
    )

    return <Card className="h-full flex flex-col">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-400" />
            <h3 className="font-bold text-white text-sm">Top Movers</h3>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-4">
            {gainers.length > 0 && <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1"><ArrowUp className="h-3 w-3" /> Biggest Gainers</p>
                <div className="space-y-0.5">{gainers.map((m, i) => <Row key={i} m={m} />)}</div>
            </div>}
            {losers.length > 0 && <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5 flex items-center gap-1"><ArrowDown className="h-3 w-3" /> Biggest Drops</p>
                <div className="space-y-0.5">{losers.map((m, i) => <Row key={i} m={m} />)}</div>
            </div>}
            {gainers.length === 0 && losers.length === 0 && (
                <div className="text-center py-6 text-stone-600 text-xs">No significant movers this period</div>
            )}
        </div>
    </Card>
}

// ═══════════════════════════════════════════════════════
// ROW 5 — STORE-WISE REPORTING CENTER (6 tabs)
// ═══════════════════════════════════════════════════════

type StoreTab = 'overview' | 'sales' | 'operations' | 'customers' | 'royalties' | 'openings'

function StoreReportingCenter({ stores, onSelect, fetchedAt }: {
    stores: StoreData[]; onSelect: (id: string) => void; fetchedAt?: string
}) {
    const [tab, setTab] = useState<StoreTab>('overview')
    const [search, setSearch] = useState('')
    const [viewMode, setViewMode] = useState<'top' | 'bottom' | 'all'>('all')

    const active = stores.filter(s => s.status === 'ACTIVE' || !s.status || s.status === '')
    const pending = stores.filter(s => s.status === 'PROVISIONING_PENDING' || s.status === 'READY_FOR_INSTALL')

    let filtered = tab === 'openings' ? pending : viewMode === 'top' ? [...active].sort((a, b) => b.revenue - a.revenue).slice(0, 20)
        : viewMode === 'bottom' ? [...active].sort((a, b) => a.health - b.health).slice(0, 20) : stores

    if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.franchisee.toLowerCase().includes(q) || s.region.toLowerCase().includes(q))
    }

    const { sorted, field, toggle } = useSortable(filtered, tab === 'openings' ? 'name' : 'revenue')

    const tabs: { id: StoreTab; label: string; count?: number }[] = [
        { id: 'overview', label: 'Top / Bottom', count: stores.length },
        { id: 'sales', label: 'Sales' },
        { id: 'operations', label: 'Operations' },
        { id: 'customers', label: 'Customers' },
        { id: 'royalties', label: 'Royalties' },
        { id: 'openings', label: 'Openings', count: pending.length },
    ]

    return <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b border-white/[0.06] gap-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setViewMode('all') }}
                    className={`relative flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all whitespace-nowrap ${tab === t.id ? 'bg-violet-500/15 text-violet-400' : 'text-stone-500 hover:text-stone-300'}`}>
                    {t.label}{t.count !== undefined && <span className={`ml-0.5 px-1 py-0 rounded-full text-[9px] font-bold ${tab === t.id ? 'bg-violet-500/20 text-violet-400' : 'bg-stone-800 text-stone-500'}`}>{t.count}</span>}
                </button>)}
            </div>
            <div className="flex items-center gap-2">
                {tab === 'overview' && <div className="flex items-center gap-0.5">
                    {(['all', 'top', 'bottom'] as const).map(v => <button key={v} onClick={() => setViewMode(v)} className={`px-2 py-1 text-[10px] font-medium rounded ${viewMode === v ? 'bg-white/[0.08] text-white' : 'text-stone-500'}`}>
                        {v === 'all' ? 'All' : v === 'top' ? 'Top 20' : 'Bottom 20'}
                    </button>)}
                </div>}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-600" />
                    <input type="text" placeholder="Filter…" value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-7 pr-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[11px] text-stone-300 placeholder-stone-600 w-36 focus:outline-none focus:ring-1 focus:ring-violet-500/30" />
                </div>
            </div>
        </div>
        <div className="overflow-x-auto max-h-[540px] overflow-y-auto scrollbar-hide">
            <table className="w-full text-xs">
                <thead className="sticky top-0 bg-stone-900/95 backdrop-blur z-10">
                    {(tab === 'overview' || tab === 'sales') && <tr className="border-b border-white/[0.06]">
                        <TH field="name" current={field as string} onClick={() => toggle('name' as any)}>Store</TH>
                        <TH field="franchisee" current={field as string} onClick={() => toggle('franchisee' as any)}>Franchisee</TH>
                        <TH field="region" current={field as string} onClick={() => toggle('region' as any)}>Region</TH>
                        <TH field="revenue" current={field as string} onClick={() => toggle('revenue' as any)}>Revenue</TH>
                        <TH field="growth" current={field as string} onClick={() => toggle('growth' as any)}>Growth</TH>
                        <TH field="avgTicket" current={field as string} onClick={() => toggle('avgTicket' as any)}>Avg Ticket</TH>
                        <TH field="txnCount" current={field as string} onClick={() => toggle('txnCount' as any)}>Txns</TH>
                        {tab === 'overview' && <><TH field="repeatPct" current={field as string} onClick={() => toggle('repeatPct' as any)}>Repeat %</TH>
                        <TH field="noShowPct" current={field as string} onClick={() => toggle('noShowPct' as any)}>No-Show</TH>
                        <TH field="health" current={field as string} onClick={() => toggle('health' as any)}>Health</TH>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Issue</th></>}
                        <th className="px-3 py-2.5 w-6"></th>
                    </tr>}
                    {tab === 'operations' && <tr className="border-b border-white/[0.06]">
                        <TH field="name" current={field as string} onClick={() => toggle('name' as any)}>Store</TH>
                        <TH field="franchisee" current={field as string} onClick={() => toggle('franchisee' as any)}>Franchisee</TH>
                        <TH field="totalAppts" current={field as string} onClick={() => toggle('totalAppts' as any)}>Appts</TH>
                        <TH field="noShowPct" current={field as string} onClick={() => toggle('noShowPct' as any)}>No-Show %</TH>
                        <TH field="txnCount" current={field as string} onClick={() => toggle('txnCount' as any)}>Txns</TH>
                        <TH field="health" current={field as string} onClick={() => toggle('health' as any)}>Health</TH>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Flag</th>
                        <th className="px-3 py-2.5 w-6"></th>
                    </tr>}
                    {tab === 'customers' && <tr className="border-b border-white/[0.06]">
                        <TH field="name" current={field as string} onClick={() => toggle('name' as any)}>Store</TH>
                        <TH field="franchisee" current={field as string} onClick={() => toggle('franchisee' as any)}>Franchisee</TH>
                        <TH field="repeatPct" current={field as string} onClick={() => toggle('repeatPct' as any)}>Repeat %</TH>
                        <TH field="txnCount" current={field as string} onClick={() => toggle('txnCount' as any)}>Customers</TH>
                        <TH field="avgTicket" current={field as string} onClick={() => toggle('avgTicket' as any)}>Avg Value</TH>
                        <TH field="health" current={field as string} onClick={() => toggle('health' as any)}>Health</TH>
                        <th className="px-3 py-2.5 w-6"></th>
                    </tr>}
                    {tab === 'royalties' && <tr className="border-b border-white/[0.06]">
                        <TH field="name" current={field as string} onClick={() => toggle('name' as any)}>Store</TH>
                        <TH field="franchisee" current={field as string} onClick={() => toggle('franchisee' as any)}>Franchisee</TH>
                        <TH field="revenue" current={field as string} onClick={() => toggle('revenue' as any)}>Gross Sales</TH>
                        <TH field="health" current={field as string} onClick={() => toggle('health' as any)}>Health</TH>
                        <th className="px-3 py-2.5 w-6"></th>
                    </tr>}
                    {tab === 'openings' && <tr className="border-b border-white/[0.06]">
                        <TH field="name" current={field as string} onClick={() => toggle('name' as any)}>Location</TH>
                        <TH field="franchisee" current={field as string} onClick={() => toggle('franchisee' as any)}>Franchisee</TH>
                        <TH field="region" current={field as string} onClick={() => toggle('region' as any)}>Region</TH>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Stage</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500">Created</th>
                        <th className="px-3 py-2.5 w-6"></th>
                    </tr>}
                </thead>
                <tbody>
                    {sorted.map(s => {
                        const row = <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-pointer group" onClick={() => onSelect(s.id)}>
                            <td className="px-3 py-2.5 font-semibold text-white whitespace-nowrap max-w-[160px] truncate">{s.name}</td>
                            <td className="px-3 py-2.5 text-stone-400 whitespace-nowrap max-w-[130px] truncate">{s.franchisee}</td>
                            {(tab === 'overview' || tab === 'sales' || tab === 'openings') && <td className="px-3 py-2.5"><span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-stone-400">{s.region}</span></td>}
                            {(tab === 'overview' || tab === 'sales' || tab === 'royalties') && <td className="px-3 py-2.5 font-bold text-emerald-400">{formatCurrency(s.revenue)}</td>}
                            {(tab === 'overview' || tab === 'sales') && <><td className="px-3 py-2.5"><Delta value={s.growth} /></td>
                            <td className="px-3 py-2.5 text-stone-300">{formatCurrency(s.avgTicket)}</td>
                            <td className="px-3 py-2.5 text-stone-300 font-medium">{s.txnCount}</td></>}
                            {tab === 'overview' && <><td className="px-3 py-2.5"><span className={`text-xs font-semibold ${s.repeatPct >= 50 ? 'text-emerald-400' : s.repeatPct >= 30 ? 'text-amber-400' : 'text-stone-500'}`}>{s.repeatPct.toFixed(0)}%</span></td>
                            <td className="px-3 py-2.5"><span className={`text-xs font-semibold ${s.noShowPct > 15 ? 'text-red-400' : s.noShowPct > 8 ? 'text-amber-400' : 'text-stone-500'}`}>{s.noShowPct.toFixed(0)}%</span></td>
                            <td className="px-3 py-2.5"><HealthBadge score={s.health} /></td>
                            <td className="px-3 py-2.5 max-w-[150px]">{s.topIssue ? <span className="text-[10px] text-red-400 truncate block">{s.topIssue}</span> : <span className="text-stone-600 text-[10px]">—</span>}</td></>}
                            {tab === 'operations' && <><td className="px-3 py-2.5 text-stone-300">{s.totalAppts}</td>
                            <td className="px-3 py-2.5"><span className={`font-semibold ${s.noShowPct > 15 ? 'text-red-400' : s.noShowPct > 8 ? 'text-amber-400' : 'text-stone-500'}`}>{s.noShowPct.toFixed(0)}%</span></td>
                            <td className="px-3 py-2.5 text-stone-300">{s.txnCount}</td>
                            <td className="px-3 py-2.5"><HealthBadge score={s.health} /></td>
                            <td className="px-3 py-2.5 max-w-[140px]">{s.topIssue ? <span className="text-[10px] text-red-400 truncate block">{s.topIssue}</span> : <span className="text-stone-600 text-[10px]">—</span>}</td></>}
                            {tab === 'customers' && <><td className="px-3 py-2.5"><span className={`font-semibold ${s.repeatPct >= 50 ? 'text-emerald-400' : s.repeatPct >= 30 ? 'text-amber-400' : 'text-stone-500'}`}>{s.repeatPct.toFixed(0)}%</span></td>
                            <td className="px-3 py-2.5 text-stone-300">{s.txnCount}</td>
                            <td className="px-3 py-2.5 text-stone-300">{formatCurrency(s.avgTicket)}</td>
                            <td className="px-3 py-2.5"><HealthBadge score={s.health} /></td></>}
                            {tab === 'royalties' && <><td className="px-3 py-2.5"><HealthBadge score={s.health} /></td></>}
                            {tab === 'openings' && <><td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                            <td className="px-3 py-2.5 text-stone-500 text-[10px]">{new Date(s.createdAt).toLocaleDateString()}</td></>}
                            <td className="px-3 py-2.5"><ChevronRight className="h-3.5 w-3.5 text-stone-600 group-hover:text-violet-400" /></td>
                        </tr>
                        return row
                    })}
                    {sorted.length === 0 && <tr><td colSpan={12} className="text-center py-12 text-stone-500 text-sm">No stores match</td></tr>}
                </tbody>
            </table>
        </div>
    </Card>
}

// ═══════════════════════════════════════════════════════
// ROW 6 — FINANCIAL SUMMARY + ROYALTY EXCEPTIONS
// ═══════════════════════════════════════════════════════

function FinancialRoyaltySplit({ data, fetchedAt }: { data: DashboardData | null; fetchedAt?: string }) {
    if (!data) return null
    const k = data.kpis; const r = data.royalties
    const avgPerStore = k.activeLocations > 0 ? k.networkRevenue / k.activeLocations : 0
    const avgPerFranchisee = k.totalFranchisees > 0 ? k.networkRevenue / k.totalFranchisees : 0
    const topRoyaltyVariance = [...data.royalties.byFranchisee].filter(f => f.variance > 0).sort((a: any, b: any) => b.variance - a.variance).slice(0, 5)

    return <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT — FINANCIAL SUMMARY (3/5) */}
        <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { l: 'Network Revenue', v: formatCurrency(k.networkRevenue), c: 'text-emerald-400' },
                    { l: 'Prior Period', v: formatCurrency(k.priorRevenue), c: 'text-stone-400' },
                    { l: 'Same-Store Growth', v: `${k.sameStoreGrowth >= 0 ? '+' : ''}${k.sameStoreGrowth.toFixed(1)}%`, c: k.sameStoreGrowth >= 0 ? 'text-emerald-400' : 'text-red-400' },
                    { l: 'Avg / Store', v: formatCurrency(avgPerStore), c: 'text-white' },
                    { l: 'Avg / Franchisee', v: formatCurrency(avgPerFranchisee), c: 'text-white' },
                    { l: 'Total Transactions', v: `${k.totalTransactions}`, c: 'text-white' },
                ].map(x => <Card key={x.l} className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">{x.l}</p>
                    <p className={`text-xl font-black ${x.c}`}>{x.v}</p>
                </Card>)}
            </div>
            {/* Royalties summary */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 border-emerald-500/15"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Collected</p><p className="text-xl font-black text-emerald-400">{formatCurrency(r.collected)}</p></Card>
                <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Due</p><p className="text-xl font-black text-white">{formatCurrency(r.due)}</p></Card>
                <Card className={`p-4 ${r.overdue > 0 ? 'border-red-500/15' : ''}`}><p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">Overdue</p><p className={`text-xl font-black ${r.overdue > 0 ? 'text-red-400' : 'text-stone-600'}`}>{formatCurrency(r.overdue)}</p></Card>
            </div>
        </div>
        {/* RIGHT — ROYALTY EXCEPTIONS (2/5) */}
        <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
                <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /><h3 className="font-bold text-white text-sm">Royalty Exceptions</h3></div>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {topRoyaltyVariance.length === 0 ? (
                        <div className="p-6 text-center"><CheckCircle className="h-7 w-7 mx-auto mb-2 text-emerald-500/50" /><p className="text-xs text-stone-400">No royalty exceptions</p></div>
                    ) : (
                        <div className="p-3 space-y-2">
                            {topRoyaltyVariance.map((f: any) => <div key={f.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-red-500/[0.03] border border-red-500/10 hover:bg-red-500/[0.06] transition-colors">
                                <div className="min-w-0"><p className="text-xs font-medium text-white truncate">{f.name}</p><p className="text-[10px] text-stone-500">Due: {formatCurrency(f.due)} · Paid: {formatCurrency(f.collected)}</p></div>
                                <span className="text-sm font-bold text-red-400 flex-shrink-0">{formatCurrency(f.variance)}</span>
                            </div>)}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    </div>
}

// ═══════════════════════════════════════════════════════
// ROW 7 — BRAND OPERATIONS (gated)
// ═══════════════════════════════════════════════════════

function BrandOperationsRow() {
    const items = [
        { icon: FileText, title: 'Training Completion', state: 'unavailable', desc: 'Employee training and certification tracking. Requires LMS integration.' },
        { icon: BarChart3, title: 'Campaign Adoption', state: 'unavailable', desc: 'Promotion adoption rate across franchise network. Requires campaign engine.' },
        { icon: Table2, title: 'Catalog Consistency', state: 'unavailable', desc: 'Brand catalog sync and pricing compliance. Requires catalog admin data.' },
        { icon: Layers, title: 'Readiness Status', state: 'unavailable', desc: 'Document and operational readiness tracking. Requires compliance engine.' },
    ]
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map(item => <Card key={item.title} className="p-4 opacity-60">
            <div className="flex items-center gap-2 mb-2"><item.icon className="h-4 w-4 text-stone-500" /><h4 className="text-xs font-bold text-stone-300">{item.title}</h4></div>
            <p className="text-[10px] text-stone-500 leading-relaxed mb-2">{item.desc}</p>
            <span className="text-[9px] font-bold uppercase text-stone-600 bg-stone-800 px-1.5 py-0.5 rounded">Unavailable — no live data</span>
        </Card>)}
    </div>
}

// ═══════════════════════════════════════════════════════
// STORE DRAWER — THE "WHY MACHINE"
// ═══════════════════════════════════════════════════════

function StoreDrawerContent({ store, allStores }: { store: StoreData; allStores: StoreData[] }) {
    const s = store
    const metrics = [
        { l: 'Revenue (30d)', v: formatCurrency(s.revenue), c: 'text-emerald-400' },
        { l: 'Prior Period', v: formatCurrency(s.priorRevenue), c: 'text-stone-400' },
        { l: 'Δ Growth', v: `${s.growth >= 0 ? '+' : ''}${s.growth.toFixed(1)}%`, c: s.growth >= 0 ? 'text-emerald-400' : 'text-red-400' },
        { l: 'Avg Ticket', v: formatCurrency(s.avgTicket), c: 'text-white' },
        { l: 'Transactions', v: `${s.txnCount}`, c: 'text-white' },
        { l: 'Appointments', v: `${s.totalAppts}`, c: 'text-white' },
        { l: 'No-Show %', v: `${s.noShowPct.toFixed(1)}%`, c: s.noShowPct > 15 ? 'text-red-400' : 'text-stone-300' },
        { l: 'Repeat Customer %', v: `${s.repeatPct.toFixed(1)}%`, c: s.repeatPct >= 50 ? 'text-emerald-400' : 'text-amber-400' },
    ]
    return <div className="space-y-5">
        {/* Status + Health */}
        <div className="flex items-center gap-2.5">
            <StatusBadge status={s.status} /><HealthBadge score={s.health} size="md" />
            <span className="text-xs text-stone-500">{s.franchisee} · {s.region}</span>
        </div>
        {/* Top Issue — WHY */}
        {s.topIssue && <div className="bg-red-500/[0.06] border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-red-400 uppercase mb-0.5">⚠ Why This Store Is Flagged</p>
            <p className="text-sm text-white font-medium">{s.topIssue}</p>
        </div>}
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
            {metrics.map(m => <div key={m.l} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">{m.l}</p>
                <p className={`text-lg font-black ${m.c}`}>{m.v}</p>
            </div>)}
        </div>
        {/* Address */}
        {s.address && <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
            <p className="text-[10px] font-bold uppercase text-stone-500 mb-0.5">Address</p>
            <p className="text-xs text-stone-300">{s.address}</p>
        </div>}
    </div>
}

// ═══════════════════════════════════════════════════════
// FRANCHISEE DRAWER
// ═══════════════════════════════════════════════════════

function FranchiseeDrawerContent({ franchisee, stores, onStoreClick }: {
    franchisee: FranchiseeData; stores: StoreData[]; onStoreClick: (id: string) => void
}) {
    const f = franchisee; const fStores = stores.filter(s => s.franchiseId === f.id)
    const topStores = [...fStores].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    const bottomStores = [...fStores].sort((a, b) => a.health - b.health).slice(0, 5)
    return <div className="space-y-5">
        <div className="flex items-center gap-2.5"><StatusBadge status={f.status} /><HealthBadge score={f.health} size="md" /><span className="text-xs text-stone-500">{f.region}</span></div>
        {f.topIssue && <div className="bg-red-500/[0.06] border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-red-400 uppercase mb-0.5">⚠ Top Issue</p>
            <p className="text-sm text-white font-medium">{f.topIssue}</p>
        </div>}
        <div className="grid grid-cols-2 gap-3">
            {[
                { l: 'Revenue', v: formatCurrency(f.monthlyRevenue), c: 'text-emerald-400' },
                { l: 'Prior Period', v: formatCurrency(f.priorRevenue), c: 'text-stone-400' },
                { l: 'Growth', v: `${f.growth >= 0 ? '+' : ''}${f.growth.toFixed(1)}%`, c: f.growth >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { l: 'Avg Ticket', v: formatCurrency(f.avgTicket), c: 'text-white' },
                { l: 'Locations', v: `${f.locationCount}`, c: 'text-white' },
                { l: 'Employees', v: `${f.employeeCount}`, c: 'text-white' },
                { l: 'Transactions', v: `${f.transactionCount}`, c: 'text-white' },
                { l: 'Weak Stores', v: `${f.weakStores}`, c: f.weakStores > 0 ? 'text-red-400' : 'text-stone-500' },
            ].map(m => <div key={m.l} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">{m.l}</p><p className={`text-lg font-black ${m.c}`}>{m.v}</p>
            </div>)}
        </div>
        {/* Royalties */}
        {(f.royaltiesDue > 0 || f.royaltiesCollected > 0) && <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">Royalties Due</p><p className="text-lg font-black text-white">{formatCurrency(f.royaltiesDue)}</p></div>
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">Collected</p><p className="text-lg font-black text-emerald-400">{formatCurrency(f.royaltiesCollected)}</p></div>
            <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">Variance</p><p className={`text-lg font-black ${f.royaltiesDue - f.royaltiesCollected > 0 ? 'text-red-400' : 'text-stone-600'}`}>{formatCurrency(f.royaltiesDue - f.royaltiesCollected)}</p></div>
        </div>}
        {/* Store fleet */}
        {topStores.length > 0 && <div>
            <p className="text-xs font-bold text-stone-300 mb-2">Top Stores</p>
            <div className="space-y-1.5">{topStores.map(s => <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] cursor-pointer" onClick={() => onStoreClick(s.id)}>
                <div className="flex items-center gap-2 min-w-0"><HealthBadge score={s.health} /><p className="text-xs font-medium text-white truncate">{s.name}</p></div>
                <div className="flex items-center gap-2.5"><span className="text-xs font-bold text-emerald-400">{formatCurrency(s.revenue)}</span><Delta value={s.growth} /></div>
            </div>)}</div>
        </div>}
        {bottomStores.length > 0 && bottomStores[0].id !== topStores[0]?.id && <div>
            <p className="text-xs font-bold text-stone-300 mb-2">Weakest Stores</p>
            <div className="space-y-1.5">{bottomStores.filter(s => s.health < 80).map(s => <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/[0.02] hover:bg-red-500/[0.05] border border-red-500/10 cursor-pointer" onClick={() => onStoreClick(s.id)}>
                <div className="flex items-center gap-2 min-w-0"><HealthBadge score={s.health} /><p className="text-xs font-medium text-white truncate">{s.name}</p>{s.topIssue && <span className="text-[9px] text-red-400 truncate ml-1">{s.topIssue}</span>}</div>
                <Delta value={s.growth} />
            </div>)}</div>
        </div>}
    </div>
}

// ═══════════════════════════════════════════════════════
// REGION DRAWER
// ═══════════════════════════════════════════════════════

function RegionDrawerContent({ region, franchisees, stores, onFranchiseeClick, onStoreClick }: {
    region: RegionData; franchisees: FranchiseeData[]; stores: StoreData[]
    onFranchiseeClick: (id: string) => void; onStoreClick: (id: string) => void
}) {
    const rFranchisees = franchisees.filter(f => f.region === region.region).sort((a, b) => b.monthlyRevenue - a.monthlyRevenue)
    const rStores = stores.filter(s => s.region === region.region)
    const weakestStores = [...rStores].sort((a, b) => a.health - b.health).filter(s => s.health < 80).slice(0, 5)
    return <div className="space-y-5">
        <div className="flex items-center gap-2.5"><ConcernBadge level={region.concern} /><span className="text-xs text-stone-500">{region.stores} stores · {region.franchiseeCount} franchisees</span></div>
        <div className="grid grid-cols-2 gap-3">
            {[
                { l: 'Revenue', v: formatCurrency(region.revenue), c: 'text-emerald-400' },
                { l: 'Growth', v: `${region.growth >= 0 ? '+' : ''}${region.growth.toFixed(1)}%`, c: region.growth >= 0 ? 'text-emerald-400' : 'text-red-400' },
                { l: 'Weak Stores', v: `${region.weakStores}`, c: region.weakStores > 0 ? 'text-red-400' : 'text-stone-500' },
                { l: 'Openings', v: `${region.openings}`, c: 'text-amber-400' },
            ].map(m => <div key={m.l} className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">{m.l}</p><p className={`text-lg font-black ${m.c}`}>{m.v}</p>
            </div>)}
        </div>
        {rFranchisees.length > 0 && <div><p className="text-xs font-bold text-stone-300 mb-2">Franchisees in Region</p>
            <div className="space-y-1.5">{rFranchisees.map(f => <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] cursor-pointer" onClick={() => onFranchiseeClick(f.id)}>
                <div className="flex items-center gap-2 min-w-0"><HealthBadge score={f.health} /><p className="text-xs font-medium text-white truncate">{f.name}</p><span className="text-[10px] text-stone-500">{f.locationCount} loc</span></div>
                <span className="text-xs font-bold text-emerald-400">{formatCurrency(f.monthlyRevenue)}</span>
            </div>)}</div>
        </div>}
        {weakestStores.length > 0 && <div><p className="text-xs font-bold text-stone-300 mb-2">Weakest Stores</p>
            <div className="space-y-1.5">{weakestStores.map(s => <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/[0.02] hover:bg-red-500/[0.05] border border-red-500/10 cursor-pointer" onClick={() => onStoreClick(s.id)}>
                <div className="flex items-center gap-2 min-w-0"><HealthBadge score={s.health} /><p className="text-xs font-medium text-white truncate">{s.name}</p></div>
                <Delta value={s.growth} />
            </div>)}</div>
        </div>}
    </div>
}

// ═══════════════════════════════════════════════════════
// SECTION ANCHOR BAR
// ═══════════════════════════════════════════════════════

const SECTIONS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'attention', label: 'Attention', icon: Zap },
    { id: 'franchisees', label: 'Franchisees', icon: Users },
    { id: 'regions', label: 'Regions', icon: Globe },
    { id: 'stores', label: 'Stores', icon: Store },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'operations', label: 'Operations', icon: Layers },
]

function AnchorBar({ active }: { active: string }) {
    return <div className="sticky top-14 z-30 bg-[var(--background)]/95 backdrop-blur-lg border-b border-white/[0.04]">
        <div className="max-w-[1800px] mx-auto px-6">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
                {SECTIONS.map(s => <button key={s.id}
                    onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${active === s.id ? 'bg-violet-500/15 text-violet-400' : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.04]'}`}>
                    <s.icon className="h-3.5 w-3.5" />{s.label}
                </button>)}
            </div>
        </div>
    </div>
}

// ═══════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════

export default function FranchisorCommandCenter() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeSection, setActiveSection] = useState('overview')
    const [drawerStore, setDrawerStore] = useState<string | null>(null)
    const [drawerFranchisee, setDrawerFranchisee] = useState<string | null>(null)
    const [drawerRegion, setDrawerRegion] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/brand/dashboard')
            if (res.ok) setData(await res.json())
        } catch (e) { console.error('Dashboard:', e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchData(); const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])

    useEffect(() => {
        const ids = SECTIONS.map(s => s.id)
        const obs = ids.map(id => {
            const el = document.getElementById(id); if (!el) return null
            const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActiveSection(id) }, { rootMargin: '-20% 0px -70% 0px' })
            o.observe(el); return o
        })
        return () => obs.forEach(o => o?.disconnect())
    }, [data])

    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

    const kpiActions: Record<string, () => void> = {
        financials: () => scrollTo('financials'),
        stores: () => scrollTo('stores'),
        rollout: () => scrollTo('attention'),
        franchiseesWorst: () => scrollTo('franchisees'),
        attention: () => scrollTo('attention'),
    }

    const selectedStore = data?.stores.find(s => s.id === drawerStore) || null
    const selectedFranchisee = data?.franchisees.find(f => f.id === drawerFranchisee) || null
    const selectedRegion = data?.regions.find(r => r.region === drawerRegion) || null

    if (loading && !data) return <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--theme-accent)' }} /><p className="text-sm text-stone-500">Loading CEO dashboard…</p></div>
    </div>

    return <>
        <AnchorBar active={activeSection} />
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute top-[-8%] right-[-4%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none" style={{ backgroundColor: 'var(--theme-accent-muted)' }} />
            <div className="relative z-10 px-6 py-6 space-y-7 max-w-[1800px] mx-auto">

                {/* ═══ ROW 0+1 — HEADER + KPI ═══ */}
                <section id="overview" className="scroll-mt-28 space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center"><Crown className="h-4.5 w-4.5 text-violet-400" /></div>
                            <div>
                                <div className="flex items-center gap-2"><h1 className="text-xl font-black text-white tracking-tight">{data?.name || 'Brand HQ'}</h1>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border bg-violet-500/15 text-violet-400 border-violet-500/20">CEO Dashboard</span></div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-stone-500">{data?.kpis?.totalFranchisees || 0} franchisees · {data?.kpis?.totalLocations || 0} locations · {data?.kpis?.totalEmployees || 0} staff</p>
                                    <DataFresh at={data?.fetchedAt} />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {data?.brandCode && <span className="px-2 py-1 rounded-md bg-violet-500/15 border border-violet-500/20 text-violet-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer hover:bg-violet-500/25 transition-colors"
                                onClick={() => navigator.clipboard.writeText(data.brandCode!)}>{data.brandCode} <Copy className="h-3 w-3 opacity-50" /></span>}
                            <button onClick={fetchData} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 rounded-lg border border-white/[0.06] transition-all text-xs font-medium">
                                <Activity className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />Refresh
                            </button>
                        </div>
                    </div>
                    <KpiStrip k={data?.kpis || null} fetchedAt={data?.fetchedAt} actions={kpiActions} />
                </section>

                {/* ═══ ROW 2 — ATTENTION + ROLLOUT (60/40) ═══ */}
                <section id="attention" className="scroll-mt-28">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{ minHeight: '320px' }}>
                        <div className="lg:col-span-3"><NeedsAttentionPanel items={data?.attentionItems || []} fetchedAt={data?.fetchedAt} /></div>
                        <div className="lg:col-span-2"><RolloutSnapshot rollout={data?.rollout || null} fetchedAt={data?.fetchedAt} /></div>
                    </div>
                </section>

                {/* ═══ ROW 3 — FRANCHISEE LEADERBOARD ═══ */}
                <section id="franchisees" className="scroll-mt-28">
                    <SectionHead title="Franchisee Performance Leaderboard" icon={Users} badge={data?.franchisees?.filter(f => f.status === 'critical' || f.status === 'warning').length} right={<DataFresh at={data?.fetchedAt} />} />
                    <FranchiseeLeaderboard franchisees={data?.franchisees || []} fetchedAt={data?.fetchedAt} onSelect={setDrawerFranchisee} />
                </section>

                {/* ═══ ROW 4 — REGIONS + TOP MOVERS (55/45) ═══ */}
                <section id="regions" className="scroll-mt-28">
                    <SectionHead title="Network Intelligence" icon={Globe} />
                    <div className="grid grid-cols-1 lg:grid-cols-9 gap-5" style={{ minHeight: '300px' }}>
                        <div className="lg:col-span-5"><RegionPerformanceTable regions={data?.regions || []} fetchedAt={data?.fetchedAt} onSelect={setDrawerRegion} /></div>
                        <div className="lg:col-span-4"><TopMoversPanel movers={data?.recentMovers || []} onClickFranchisee={setDrawerFranchisee} onClickStore={setDrawerStore} /></div>
                    </div>
                </section>

                {/* ═══ ROW 5 — STORE-WISE REPORTING CENTER ═══ */}
                <section id="stores" className="scroll-mt-28">
                    <SectionHead title="Store Performance Deep Dive" icon={Store} badge={data?.stores?.length} right={<DataFresh at={data?.fetchedAt} />} />
                    <StoreReportingCenter stores={data?.stores || []} onSelect={setDrawerStore} fetchedAt={data?.fetchedAt} />
                </section>

                {/* ═══ ROW 6 — FINANCIAL / ROYALTIES ═══ */}
                <section id="financials" className="scroll-mt-28">
                    <SectionHead title="Financial & Royalties Summary" icon={DollarSign} right={<DataFresh at={data?.fetchedAt} />} />
                    <FinancialRoyaltySplit data={data} fetchedAt={data?.fetchedAt} />
                </section>

                {/* ═══ ROW 7 — BRAND OPERATIONS (gated) ═══ */}
                <section id="operations" className="scroll-mt-28">
                    <SectionHead title="Brand Operations" icon={Layers} />
                    <BrandOperationsRow />
                </section>

                <div className="h-8" />
            </div>
        </div>

        {/* ═══ STORE DRAWER ═══ */}
        <DrawerPanel open={!!drawerStore} onClose={() => setDrawerStore(null)} title={selectedStore?.name || 'Store'} subtitle={selectedStore?.address || 'Store details'} width="xl">
            {selectedStore && <StoreDrawerContent store={selectedStore} allStores={data?.stores || []} />}
        </DrawerPanel>

        {/* ═══ FRANCHISEE DRAWER ═══ */}
        <DrawerPanel open={!!drawerFranchisee} onClose={() => setDrawerFranchisee(null)} title={selectedFranchisee?.name || 'Franchisee'} subtitle="30-day performance · store fleet" width="xl">
            {selectedFranchisee && <FranchiseeDrawerContent franchisee={selectedFranchisee} stores={data?.stores || []}
                onStoreClick={(id) => { setDrawerFranchisee(null); setTimeout(() => setDrawerStore(id), 200) }} />}
        </DrawerPanel>

        {/* ═══ REGION DRAWER ═══ */}
        <DrawerPanel open={!!drawerRegion} onClose={() => setDrawerRegion(null)} title={selectedRegion?.region || 'Region'} subtitle={`${selectedRegion?.stores || 0} stores · ${selectedRegion?.franchiseeCount || 0} franchisees`} width="xl">
            {selectedRegion && <RegionDrawerContent region={selectedRegion} franchisees={data?.franchisees || []} stores={data?.stores || []}
                onFranchiseeClick={(id) => { setDrawerRegion(null); setTimeout(() => setDrawerFranchisee(id), 200) }}
                onStoreClick={(id) => { setDrawerRegion(null); setTimeout(() => setDrawerStore(id), 200) }} />}
        </DrawerPanel>
    </>
}
