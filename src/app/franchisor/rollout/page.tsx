'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    GitBranch, AlertTriangle, CheckCircle2, Clock, RefreshCw,
    MapPin, Loader2, ChevronDown, ChevronRight, Building2,
    Zap, Package, Wifi, ShieldAlert, Users, TrendingUp, XCircle
} from 'lucide-react';

type RolloutStage =
    | 'ADDED'
    | 'APPROVED'
    | 'PROVISIONING'
    | 'SHIPPED'
    | 'PAIRED'
    | 'TRAINED'
    | 'FIRST_SALE'
    | 'BLOCKED';

interface FranchiseRollout {
    franchiseId: string;
    franchiseName: string;
    region: string | null;
    stage: RolloutStage;
    stageRank: number;
    isStuck: boolean;
    isBlocked: boolean;
    blockers: string[];
    locationCount: number;
    stationCount: number;
    pairedStations: number;
    firstSaleAt: string | null;
    createdAt: string;
    daysSinceCreated: number;
}

interface RolloutData {
    total: number;
    stuckCount: number;
    blockedCount: number;
    stageSummary: Record<RolloutStage, number>;
    franchises: FranchiseRollout[];
}

const STAGE_ORDER: RolloutStage[] = [
    'ADDED', 'APPROVED', 'PROVISIONING', 'SHIPPED', 'PAIRED', 'TRAINED', 'FIRST_SALE', 'BLOCKED'
];

const STAGE_CONFIG: Record<RolloutStage, {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    description: string;
}> = {
    ADDED: {
        label: 'Added',
        icon: Building2,
        color: 'text-[var(--text-muted)]',
        bg: 'bg-[var(--surface)]',
        border: 'border-[var(--border)]',
        description: 'Franchise created, pending approval',
    },
    APPROVED: {
        label: 'Approved',
        icon: CheckCircle2,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        description: 'Application approved, awaiting provisioning',
    },
    PROVISIONING: {
        label: 'Provisioning',
        icon: Clock,
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/30',
        description: 'Hardware and software being configured',
    },
    SHIPPED: {
        label: 'Shipped',
        icon: Package,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        description: 'Hardware on the way to location',
    },
    PAIRED: {
        label: 'Paired',
        icon: Wifi,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        description: 'POS station successfully paired',
    },
    TRAINED: {
        label: 'Trained',
        icon: Users,
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/30',
        description: 'Location active and staff trained',
    },
    FIRST_SALE: {
        label: 'Live',
        icon: TrendingUp,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        description: 'First sale recorded — franchisee is live',
    },
    BLOCKED: {
        label: 'Blocked',
        icon: XCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        description: 'Requires immediate HQ attention',
    },
};

function StageChip({ stage, size = 'sm' }: { stage: RolloutStage; size?: 'sm' | 'xs' }) {
    const cfg = STAGE_CONFIG[stage];
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-bold border ${cfg.bg} ${cfg.color} ${cfg.border} ${size === 'xs' ? 'text-xs' : 'text-xs'}`}>
            <Icon size={size === 'xs' ? 10 : 11} />
            {cfg.label}
        </span>
    );
}

function StageColumn({
    stage,
    franchises,
    expandedId,
    onToggle,
}: {
    stage: RolloutStage;
    franchises: FranchiseRollout[];
    expandedId: string | null;
    onToggle: (id: string) => void;
}) {
    const cfg = STAGE_CONFIG[stage];
    const Icon = cfg.icon;

    return (
        <div className={`flex-1 min-w-[180px] rounded-xl border ${cfg.border} flex flex-col`}>
            {/* Column header */}
            <div className={`px-3 py-3 border-b ${cfg.border} ${cfg.bg} rounded-t-xl`}>
                <div className={`flex items-center gap-2 font-semibold text-sm ${cfg.color}`}>
                    <Icon size={15} />
                    {cfg.label}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{franchises.length} store{franchises.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Cards */}
            <div className="flex-1 px-2 py-2 space-y-2 min-h-24">
                {franchises.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4 opacity-50">—</p>
                ) : franchises.map(f => {
                    const isExpanded = expandedId === f.franchiseId;
                    return (
                        <div
                            key={f.franchiseId}
                            className={`rounded-lg border text-xs cursor-pointer transition-all ${
                                f.isBlocked
                                    ? 'border-red-500/40 bg-red-500/5 hover:bg-red-500/10'
                                    : f.isStuck
                                        ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
                                        : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                            }`}
                            onClick={() => onToggle(f.franchiseId)}
                        >
                            <div className="flex items-start justify-between px-2.5 py-2 gap-1">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-[var(--text-primary)] truncate leading-tight">
                                        {f.franchiseName}
                                    </p>
                                    {f.region && (
                                        <p className="flex items-center gap-0.5 text-[var(--text-muted)] mt-0.5 truncate">
                                            <MapPin size={9} />
                                            {f.region}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {f.isStuck && !f.isBlocked && (
                                        <span title="Stuck — 30+ days without progressing" className="text-amber-400">
                                            <AlertTriangle size={11} />
                                        </span>
                                    )}
                                    {f.isBlocked && (
                                        <span className="text-red-400">
                                            <ShieldAlert size={11} />
                                        </span>
                                    )}
                                    <ChevronRight
                                        size={12}
                                        className={`text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    />
                                </div>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                                <div className="px-2.5 pb-2.5 border-t border-[var(--border)] pt-2 space-y-1.5">
                                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                                        <Building2 size={10} />
                                        <span>{f.locationCount} location{f.locationCount !== 1 ? 's' : ''}</span>
                                        <Wifi size={10} className="ml-auto" />
                                        <span>{f.pairedStations}/{f.stationCount} paired</span>
                                    </div>
                                    <div className="text-[var(--text-muted)]">
                                        <Clock size={10} className="inline mr-1" />
                                        {f.daysSinceCreated}d since added
                                    </div>
                                    {f.firstSaleAt && (
                                        <div className="text-emerald-400">
                                            <TrendingUp size={10} className="inline mr-1" />
                                            First sale {new Date(f.firstSaleAt).toLocaleDateString()}
                                        </div>
                                    )}
                                    {f.blockers.length > 0 && (
                                        <div className="space-y-1 pt-1 border-t border-[var(--border)]">
                                            {f.blockers.map((b, i) => (
                                                <p key={i} className="text-red-400 flex items-start gap-1">
                                                    <AlertTriangle size={9} className="shrink-0 mt-0.5" />
                                                    {b}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function RolloutPage() {
    const [data, setData] = useState<RolloutData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [regionFilter, setRegionFilter] = useState('ALL');
    const [showOnlyStuck, setShowOnlyStuck] = useState(false);
    const [activeView, setActiveView] = useState<'swimlane' | 'table'>('swimlane');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/franchisor/rollout');
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const regions = data
        ? ['ALL', ...Array.from(new Set(
            data.franchises.map(f => f.region).filter(Boolean) as string[]
        ))]
        : ['ALL'];

    const filtered = data?.franchises.filter(f => {
        if (regionFilter !== 'ALL' && f.region !== regionFilter) return false;
        if (showOnlyStuck && !f.isStuck && !f.isBlocked) return false;
        return true;
    }) ?? [];

    // Group by stage for swimlane
    const byStage = STAGE_ORDER.reduce((acc, stage) => {
        acc[stage] = filtered.filter(f => f.stage === stage);
        return acc;
    }, {} as Record<RolloutStage, FranchiseRollout[]>);

    const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <span className="p-2 bg-violet-500/20 rounded-lg">
                            <GitBranch size={22} className="text-violet-400" />
                        </span>
                        Rollout Timeline
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Track every franchisee from onboarding to first sale
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg text-sm transition-colors"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 size={32} className="animate-spin text-[var(--text-muted)]" />
                </div>
            ) : !data ? (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-16 text-center">
                    <GitBranch size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
                    <p className="text-[var(--text-muted)]">No rollout data available.</p>
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                            <div className="text-3xl font-bold text-[var(--text-primary)]">{data.total}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Total Franchisees</div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                {data.stageSummary.FIRST_SALE} live · {data.stageSummary.APPROVED + data.stageSummary.PROVISIONING + data.stageSummary.SHIPPED + data.stageSummary.PAIRED + data.stageSummary.TRAINED} in progress
                            </div>
                        </div>
                        <button
                            onClick={() => setShowOnlyStuck(prev => !prev)}
                            className={`glass-panel rounded-xl border p-4 text-left transition-all ${showOnlyStuck ? 'border-amber-400 bg-amber-500/5' : 'border-[var(--border)] hover:border-amber-400/40'}`}
                        >
                            <div className="text-3xl font-bold text-amber-400">{data.stuckCount}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Stuck</div>
                            <div className="text-xs text-amber-400 mt-0.5">30+ days without progressing</div>
                        </button>
                        <button
                            onClick={() => {
                                if (regionFilter === 'ALL') setShowOnlyStuck(false);
                            }}
                            className="glass-panel rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-left"
                        >
                            <div className="text-3xl font-bold text-red-400">{data.blockedCount}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Blocked</div>
                            <div className="text-xs text-red-400 mt-0.5">Requires immediate attention</div>
                        </button>
                        <div className="glass-panel rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                            <div className="text-3xl font-bold text-emerald-400">{data.stageSummary.FIRST_SALE}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Live & Selling</div>
                            <div className="text-xs text-emerald-400 mt-0.5">
                                {data.total > 0
                                    ? `${Math.round((data.stageSummary.FIRST_SALE / data.total) * 100)}% completion rate`
                                    : 'No franchisees yet'}
                            </div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-3 mb-5 flex-wrap">
                        {/* View toggle */}
                        <div className="flex bg-[var(--background)] border border-[var(--border)] rounded-lg overflow-hidden">
                            {(['swimlane', 'table'] as const).map(v => (
                                <button
                                    key={v}
                                    onClick={() => setActiveView(v)}
                                    className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                                        activeView === v
                                            ? 'bg-[var(--primary)] text-white'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    {v === 'swimlane' ? '⬛ Swimlane' : '☰ Table'}
                                </button>
                            ))}
                        </div>

                        {/* Stuck filter */}
                        <button
                            onClick={() => setShowOnlyStuck(prev => !prev)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                showOnlyStuck
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <AlertTriangle size={12} />
                            Stuck / Blocked only
                        </button>

                        {/* Region filter */}
                        {regions.length > 1 && (
                            <div className="relative ml-auto">
                                <select
                                    value={regionFilter}
                                    onChange={e => setRegionFilter(e.target.value)}
                                    className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                >
                                    {regions.map(r => (
                                        <option key={r} value={r}>{r === 'ALL' ? 'All Regions' : r}</option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {activeView === 'swimlane' ? (
                        /* ── Swimlane view ── */
                        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
                            {STAGE_ORDER.map(stage => (
                                <StageColumn
                                    key={stage}
                                    stage={stage}
                                    franchises={byStage[stage]}
                                    expandedId={expandedId}
                                    onToggle={toggleExpand}
                                />
                            ))}
                        </div>
                    ) : (
                        /* ── Table view ── */
                        <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Franchisee</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Stage</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Locations</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Stations</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Days</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Blockers</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-[var(--text-muted)]">
                                                No franchisees match current filters.
                                            </td>
                                        </tr>
                                    ) : filtered
                                        .sort((a, b) => {
                                            // Blocked first, then by stuck, then by stageRank desc
                                            if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;
                                            if (a.isStuck !== b.isStuck) return a.isStuck ? -1 : 1;
                                            return a.stageRank - b.stageRank;
                                        })
                                        .map(f => (
                                            <tr
                                                key={f.franchiseId}
                                                className={`border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors ${
                                                    f.isBlocked ? 'bg-red-500/3' : f.isStuck ? 'bg-amber-500/3' : ''
                                                }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {f.isBlocked
                                                            ? <ShieldAlert size={14} className="text-red-400 shrink-0" />
                                                            : f.isStuck
                                                                ? <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                                                                : <Building2 size={14} className="text-[var(--text-muted)] shrink-0" />
                                                        }
                                                        <div>
                                                            <p className="font-semibold text-[var(--text-primary)]">{f.franchiseName}</p>
                                                            {f.region && (
                                                                <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                                                    <MapPin size={10} />{f.region}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StageChip stage={f.stage} />
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)]">
                                                    {f.locationCount}
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs text-[var(--text-secondary)]">
                                                    {f.pairedStations}/{f.stationCount}
                                                    <span className="text-[var(--text-muted)] ml-1">paired</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    <span className={`font-semibold ${f.daysSinceCreated >= 30 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                                                        {f.daysSinceCreated}d
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {f.blockers.length > 0 ? (
                                                        <div className="space-y-0.5">
                                                            {f.blockers.map((b, i) => (
                                                                <p key={i} className="text-xs text-red-400 flex items-center gap-1">
                                                                    <AlertTriangle size={10} />{b}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-[var(--text-muted)]">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="mt-5 flex flex-wrap gap-4 items-center text-xs text-[var(--text-muted)]">
                        {STAGE_ORDER.filter(s => s !== 'BLOCKED').map(stage => {
                            const cfg = STAGE_CONFIG[stage];
                            const Icon = cfg.icon;
                            return (
                                <span key={stage} className={`flex items-center gap-1 ${cfg.color}`}>
                                    <Icon size={11} />
                                    {cfg.label}: {cfg.description}
                                </span>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
