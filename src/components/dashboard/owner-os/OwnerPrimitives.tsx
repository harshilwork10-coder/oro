'use client'

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import {
    Activity, ArrowUpDown, ChevronRight, CheckCircle, X,
    TrendingUp, TrendingDown, Zap, Search, ArrowUp, ArrowDown,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// 1. DATA FRESHNESS LABEL
// ═══════════════════════════════════════════════════════════════

export function DataFresh({ at, label }: { at?: string; label?: string }) {
    const t = at ? new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null
    return (
        <span className="flex items-center gap-1.5 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium uppercase tracking-wide text-emerald-400">{label || 'Live'}</span>
            {t && <span className="text-stone-600">· {t}</span>}
        </span>
    )
}

// ═══════════════════════════════════════════════════════════════
// 2. DELTA BADGE
// ═══════════════════════════════════════════════════════════════

export function Delta({ value, suffix = '%', invert = false }: { value: number; suffix?: string; invert?: boolean }) {
    if (value === 0) return <span className="text-xs text-stone-600">—</span>
    const positive = invert ? value < 0 : value >= 0
    return (
        <span className={`text-xs font-bold flex items-center gap-0.5 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {value >= 0 ? '+' : ''}{value.toFixed(1)}{suffix}
        </span>
    )
}

// ═══════════════════════════════════════════════════════════════
// 3. HEALTH SCORE BADGE
// ═══════════════════════════════════════════════════════════════

export function HealthBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
    const c = score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
        : score >= 60 ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
            : 'bg-red-500/15 text-red-400 border-red-500/20'
    const sz = size === 'lg' ? 'px-2.5 py-1 text-sm' : size === 'md' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-0.5 text-[10px]'
    return <span className={`inline-flex items-center justify-center rounded border font-bold ${sz} ${c}`}>{score}</span>
}

// ═══════════════════════════════════════════════════════════════
// 4. STATUS BADGE
// ═══════════════════════════════════════════════════════════════

export function StatusBadge({ status, label }: { status: string; label?: string }) {
    const m: Record<string, string> = {
        active: 'bg-emerald-500/15 text-emerald-400', critical: 'bg-red-500/15 text-red-400',
        warning: 'bg-amber-500/15 text-amber-400', pending: 'bg-stone-700 text-stone-400',
        idle: 'bg-stone-700 text-stone-400', healthy: 'bg-emerald-500/15 text-emerald-400',
        ACTIVE: 'bg-emerald-500/15 text-emerald-400', PROVISIONING_PENDING: 'bg-amber-500/15 text-amber-400',
    }
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${m[status] || 'bg-stone-700 text-stone-400'}`}>{label || status}</span>
}

// ═══════════════════════════════════════════════════════════════
// 5. SEVERITY DOT
// ═══════════════════════════════════════════════════════════════

export function SeverityDot({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
    const c = severity === 'critical' ? 'bg-red-500' : severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
    return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c}`} />
}

// ═══════════════════════════════════════════════════════════════
// 6. CARD PRIMITIVE
// ═══════════════════════════════════════════════════════════════

export function Card({ className = '', children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
    return (
        <div className={`bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-xl ${onClick ? 'cursor-pointer hover:bg-white/[0.03] transition-colors' : ''} ${className}`} onClick={onClick}>
            {children}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// 7. SECTION HEADER
// ═══════════════════════════════════════════════════════════════

export function SectionHead({ title, icon: Icon, badge, right }: {
    title: string; icon: any; badge?: number; right?: ReactNode
}) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
                {(badge ?? 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">{badge}</span>
                )}
            </div>
            {right}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// 8. KPI STRIP (6 cards)
// ═══════════════════════════════════════════════════════════════

export interface OwnerKpiDef {
    title: string
    value: string | number
    delta?: number | null
    deltaSuffix?: string
    deltaInvert?: boolean
    sub: string
    variant: 'success' | 'warning' | 'danger' | 'accent' | 'muted'
    icon: any
    pulse?: boolean
    onClick?: () => void
}

const kpiVariants: Record<string, { border: string; iconBg: string; ic: string }> = {
    success: { border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10', ic: 'text-emerald-400' },
    warning: { border: 'border-amber-500/20', iconBg: 'bg-amber-500/10', ic: 'text-amber-400' },
    danger: { border: 'border-red-500/20', iconBg: 'bg-red-500/10', ic: 'text-red-400' },
    accent: { border: 'border-violet-500/20', iconBg: 'bg-violet-500/10', ic: 'text-violet-400' },
    muted: { border: 'border-white/[0.06]', iconBg: 'bg-white/[0.06]', ic: 'text-stone-400' },
}

export function OwnerKpiStrip({ kpis, fetchedAt }: { kpis: OwnerKpiDef[]; fetchedAt?: string }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((kpi, i) => {
                const v = kpiVariants[kpi.variant] || kpiVariants.muted
                const Ic = kpi.icon
                return (
                    <div key={i} onClick={kpi.onClick} className={`relative rounded-xl border p-4 bg-stone-900/50 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] ${kpi.onClick ? 'cursor-pointer' : ''} group ${v.border}`}>
                        {kpi.pulse && <span className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse top-2.5 right-2.5" />}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${v.iconBg}`}>
                            <Ic className={`h-3.5 w-3.5 ${v.ic}`} />
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">{kpi.title}</p>
                        <p className="text-xl font-black text-white tracking-tight leading-none">{kpi.value}</p>
                        <p className="text-[10px] text-stone-500 mt-1.5 leading-snug">{kpi.sub}</p>
                        {kpi.delta !== null && kpi.delta !== undefined && kpi.delta !== 0 && (
                            <div className="mt-1"><Delta value={kpi.delta} suffix={kpi.deltaSuffix} invert={kpi.deltaInvert} /></div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// 9. ACTION CENTER (left panel, 60% width)
// ═══════════════════════════════════════════════════════════════

export interface ActionItem {
    type: string
    severity: 'critical' | 'warning' | 'info'
    title: string
    description: string
    location?: string
    category: string
    impact?: string
    cta?: string
    ctaHref?: string
    recommendedAction?: string
}

export function OwnerActionCenter({ items, title, fetchedAt }: {
    items: ActionItem[]; title?: string; fetchedAt?: string
}) {
    const sevBg: Record<string, string> = {
        critical: 'border-red-500/15 bg-red-500/[0.04]',
        warning: 'border-amber-500/15 bg-amber-500/[0.04]',
        info: 'border-blue-500/15 bg-blue-500/[0.04]',
    }
    const display = items.slice(0, 7)

    return (
        <Card className="h-full flex flex-col">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">{title || 'Needs Attention Today'}</h3>
                    {items.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">{items.length}</span>
                    )}
                </div>
                <DataFresh at={fetchedAt} />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {display.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center px-6">
                        <CheckCircle className="h-8 w-8 text-emerald-500/50 mb-2" />
                        <p className="font-medium text-stone-400 text-sm">Nothing urgent</p>
                        <p className="text-[11px] text-stone-600 mt-0.5">Operating within normal thresholds</p>
                    </div>
                ) : (
                    <div className="p-3 space-y-2">
                        {display.map((item, i) => (
                            <div key={i} className={`rounded-lg border px-3.5 py-3 transition-colors hover:bg-white/[0.02] ${sevBg[item.severity]}`}>
                                <div className="flex items-start gap-2.5">
                                    <SeverityDot severity={item.severity} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold text-white leading-snug">{item.title}</p>
                                        <p className="text-[11px] text-stone-400 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            {item.location && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/[0.05] text-stone-400">{item.location}</span>
                                            )}
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/[0.05] text-stone-500 uppercase">{item.category}</span>
                                        </div>
                                        {item.recommendedAction && (
                                            <p className="text-[10px] text-violet-400 mt-1.5 font-medium">→ {item.recommendedAction}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    )
}

// ═══════════════════════════════════════════════════════════════
// 10. EXCEPTION RAIL (right panel, 40% width)
// ═══════════════════════════════════════════════════════════════

export interface ExceptionItem {
    id: string
    type: string
    severity: 'critical' | 'warning' | 'info'
    title: string
    description: string
    location?: string
    value?: string | number
    icon?: any
    color?: string
}

export function OwnerExceptionRail({ items, title, fetchedAt, emptyTitle, emptySubtitle }: {
    items: ExceptionItem[]; title?: string; fetchedAt?: string
    emptyTitle?: string; emptySubtitle?: string
}) {
    const display = items.slice(0, 6)
    const sevBg: Record<string, string> = {
        critical: 'border-red-500/15 bg-red-500/[0.04]',
        warning: 'border-amber-500/15 bg-amber-500/[0.04]',
        info: 'border-blue-500/15 bg-blue-500/[0.04]',
    }

    return (
        <Card className="h-full flex flex-col">
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-400" />
                    <h3 className="font-bold text-white text-sm">{title || 'Exceptions'}</h3>
                </div>
                <DataFresh at={fetchedAt} />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {display.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center px-6">
                        <CheckCircle className="h-8 w-8 text-emerald-500/50 mb-2" />
                        <p className="font-medium text-stone-400 text-sm">{emptyTitle || 'No exceptions'}</p>
                        <p className="text-[11px] text-stone-600 mt-0.5">{emptySubtitle || 'All systems operating normally'}</p>
                    </div>
                ) : (
                    <div className="p-3 space-y-2">
                        {display.map((item) => (
                            <div key={item.id} className={`rounded-lg border px-3.5 py-2.5 transition-colors hover:bg-white/[0.02] ${sevBg[item.severity]}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-2 min-w-0 flex-1">
                                        <SeverityDot severity={item.severity} />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                                            <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">{item.description}</p>
                                        </div>
                                    </div>
                                    {item.value && <span className="text-xs font-bold text-stone-300 flex-shrink-0 ml-2">{item.value}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    )
}

// ═══════════════════════════════════════════════════════════════
// 11. SECTION ANCHOR BAR
// ═══════════════════════════════════════════════════════════════

export interface AnchorSection {
    id: string
    label: string
    icon: any
}

export function SectionAnchorBar({ sections, active }: { sections: AnchorSection[]; active: string }) {
    return (
        <div className="sticky top-14 z-30 bg-[var(--background)]/95 backdrop-blur-lg border-b border-white/[0.04]">
            <div className="max-w-[1800px] mx-auto px-6">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
                    {sections.map(s => (
                        <button key={s.id}
                            onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${active === s.id ? 'bg-violet-500/15 text-violet-400' : 'text-stone-500 hover:text-stone-300 hover:bg-white/[0.04]'}`}>
                            <s.icon className="h-3.5 w-3.5" />{s.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function useActiveSection(sectionIds: string[]) {
    const [active, setActive] = useState(sectionIds[0] || '')
    useEffect(() => {
        const observers = sectionIds.map(id => {
            const el = document.getElementById(id)
            if (!el) return null
            const obs = new IntersectionObserver(([e]) => {
                if (e.isIntersecting) setActive(id)
            }, { rootMargin: '-20% 0px -70% 0px' })
            obs.observe(el)
            return obs
        })
        return () => observers.forEach(o => o?.disconnect())
    }, [sectionIds.join(',')])
    return active
}

// ═══════════════════════════════════════════════════════════════
// 12. RIGHT DRAWER
// ═══════════════════════════════════════════════════════════════

export function OwnerDrawer({ open, onClose, title, subtitle, children, width = 'xl' }: {
    open: boolean; onClose: () => void; title: string; subtitle?: string
    children: ReactNode; width?: 'md' | 'lg' | 'xl'
}) {
    const w = width === 'xl' ? 'max-w-2xl' : width === 'lg' ? 'max-w-xl' : 'max-w-md'
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full ${w} bg-stone-950 border-l border-white/[0.06] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                    <div>
                        <h2 className="text-lg font-bold text-white">{title}</h2>
                        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
                        <X className="h-4 w-4 text-stone-400" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {children}
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// 13. SMART TABLE (sortable, filterable, with presets)
// ═══════════════════════════════════════════════════════════════

export function useSortable<T>(data: T[], defaultField: keyof T, defaultDir: 'asc' | 'desc' = 'desc') {
    const [field, setField] = useState<keyof T>(defaultField)
    const [dir, setDir] = useState<'asc' | 'desc'>(defaultDir)
    const toggle = useCallback((f: keyof T) => {
        if (field === f) setDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setField(f); setDir('desc') }
    }, [field])
    const sorted = useMemo(() => [...data].sort((a, b) => {
        const av = a[field] as any ?? 0, bv = b[field] as any ?? 0
        if (typeof av === 'string') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
        return dir === 'asc' ? av - bv : bv - av
    }), [data, field, dir])
    return { sorted, field, dir, toggle }
}

export function SortTH({ field, current, onClick, children }: {
    field: string; current: string; onClick: () => void; children: ReactNode
}) {
    return (
        <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-500 cursor-pointer hover:text-stone-300 transition-colors select-none" onClick={onClick}>
            <span className="flex items-center gap-1">
                {children}
                {current === field && <ArrowUpDown className="h-2.5 w-2.5 text-violet-400" />}
            </span>
        </th>
    )
}

export interface SmartTablePreset {
    id: string
    label: string
}

export function SmartTableToolbar({ presets, activePreset, onPreset, searchValue, onSearch, fetchedAt, right }: {
    presets?: SmartTablePreset[]; activePreset?: string; onPreset?: (id: string) => void
    searchValue?: string; onSearch?: (v: string) => void; fetchedAt?: string; right?: ReactNode
}) {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b border-white/[0.06] gap-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {presets?.map(p => (
                    <button key={p.id} onClick={() => onPreset?.(p.id)}
                        className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all whitespace-nowrap ${activePreset === p.id ? 'bg-violet-500/15 text-violet-400' : 'text-stone-500 hover:text-stone-300'}`}>
                        {p.label}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                {right}
                {onSearch && (
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-stone-600" />
                        <input type="text" placeholder="Filter…" value={searchValue || ''} onChange={e => onSearch(e.target.value)}
                            className="pl-7 pr-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[11px] text-stone-300 placeholder-stone-600 w-36 focus:outline-none focus:ring-1 focus:ring-violet-500/30" />
                    </div>
                )}
                {fetchedAt && <DataFresh at={fetchedAt} />}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// 14. OWNER METRIC CARD (small stat card for grids)
// ═══════════════════════════════════════════════════════════════

export function MetricCard({ label, value, color = 'text-white', sub }: {
    label: string; value: string | number; color?: string; sub?: string
}) {
    return (
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">{label}</p>
            <p className={`text-lg font-black ${color}`}>{value}</p>
            {sub && <p className="text-[10px] text-stone-500 mt-0.5">{sub}</p>}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// 15. OWNER TOP BAR
// ═══════════════════════════════════════════════════════════════

export function OwnerTopBar({ title, subtitle, badge, badgeColor, icon: Icon, fetchedAt, onRefresh, refreshing, children }: {
    title: string; subtitle: string; badge?: string; badgeColor?: string
    icon: any; fetchedAt?: string; onRefresh?: () => void; refreshing?: boolean; children?: ReactNode
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                    <Icon className="h-4.5 w-4.5 text-violet-400" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-black text-white tracking-tight">{title}</h1>
                        {badge && (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeColor || 'bg-violet-500/15 text-violet-400 border-violet-500/20'}`}>
                                {badge}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-stone-500">{subtitle}</p>
                        <DataFresh at={fetchedAt} />
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {children}
                {onRefresh && (
                    <button onClick={onRefresh} disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 rounded-lg border border-white/[0.06] transition-all text-xs font-medium">
                        <Activity className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />Refresh
                    </button>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// 16. OWNER PAGE SHELL (replaces DashboardShell — full-width, no sidebar)
// ═══════════════════════════════════════════════════════════════

export function OwnerPageShell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute top-[-8%] right-[-4%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
                style={{ backgroundColor: 'var(--theme-accent-muted)' }} />
            <div className="relative z-10 px-6 py-6 space-y-7 max-w-[1800px] mx-auto">
                {children}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// 17. TAB BAR (for reporting center tabs)
// ═══════════════════════════════════════════════════════════════

export interface TabDef {
    id: string
    label: string
    count?: number
}

export function TabBar({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (id: string) => void }) {
    return (
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(t => (
                <button key={t.id} onClick={() => onChange(t.id)}
                    className={`relative flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all whitespace-nowrap ${active === t.id ? 'bg-violet-500/15 text-violet-400' : 'text-stone-500 hover:text-stone-300'}`}>
                    {t.label}
                    {t.count !== undefined && (
                        <span className={`ml-0.5 px-1 py-0 rounded-full text-[9px] font-bold ${active === t.id ? 'bg-violet-500/20 text-violet-400' : 'bg-stone-800 text-stone-500'}`}>{t.count}</span>
                    )}
                </button>
            ))}
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════
// 18. LOADING SPINNER
// ═══════════════════════════════════════════════════════════════

export function OwnerLoading({ label }: { label?: string }) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--theme-accent)' }} />
                <p className="text-sm text-stone-500">{label || 'Loading dashboard…'}</p>
            </div>
        </div>
    )
}
