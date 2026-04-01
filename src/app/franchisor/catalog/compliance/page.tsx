'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    CheckCircle2, AlertTriangle, XCircle, RefreshCw,
    ChevronDown, ChevronRight, Building2, MapPin,
    ShieldCheck, Loader2, DollarSign, Package, PlusCircle
} from 'lucide-react';

interface PriceDrift {
    serviceName: string;
    localPrice: number;
    hqPrice: number;
}

interface FranchiseeCompliance {
    franchiseId: string;
    franchiseName: string;
    region: string | null;
    totalServices: number;
    linkedToHQ: number;
    localOnly: number;
    missing: number;
    priceDrifts: number;
    complianceScore: number;
    status: 'COMPLIANT' | 'DRIFTING' | 'CRITICAL';
    localOnlyNames: string[];
    missingNames: string[];
    priceDriftDetails: PriceDrift[];
}

interface ComplianceData {
    hqCatalogSize: number;
    franchiseeCount: number;
    summary: {
        avgComplianceScore: number;
        criticalCount: number;
        driftingCount: number;
        compliantCount: number;
    };
    franchisees: FranchiseeCompliance[];
}

const STATUS_CONFIG = {
    COMPLIANT: {
        label: 'Compliant',
        icon: CheckCircle2,
        badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
        row: '',
    },
    DRIFTING: {
        label: 'Drifting',
        icon: AlertTriangle,
        badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
        row: 'bg-amber-500/3',
    },
    CRITICAL: {
        label: 'Critical',
        icon: XCircle,
        badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
        row: 'bg-red-500/3',
    },
};

function ScoreBar({ score }: { score: number }) {
    const color = score >= 90 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-xs font-bold text-[var(--text-primary)] w-8 text-right">{score}%</span>
        </div>
    );
}

export default function CatalogCompliancePage() {
    const [data, setData] = useState<ComplianceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'DRIFTING' | 'COMPLIANT'>('ALL');
    const [regionFilter, setRegionFilter] = useState('ALL');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/franchisor/catalog/compliance');
            if (res.ok) setData(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const regions = data
        ? ['ALL', ...Array.from(new Set(data.franchisees.map(f => f.region).filter(Boolean))) as string[]]
        : ['ALL'];

    const filtered = data?.franchisees.filter(f => {
        const statusMatch = statusFilter === 'ALL' || f.status === statusFilter;
        const regionMatch = regionFilter === 'ALL' || f.region === regionFilter;
        return statusMatch && regionMatch;
    }) ?? [];

    const scoreColor = (s: number) => s >= 90 ? 'text-emerald-400' : s >= 60 ? 'text-amber-400' : 'text-red-400';

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <span className="p-2 bg-emerald-500/20 rounded-lg">
                            <ShieldCheck size={22} className="text-emerald-400" />
                        </span>
                        Catalog Compliance
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Brand standard alignment — who is in sync, who has drifted
                    </p>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg text-sm transition-colors">
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
                    <ShieldCheck size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
                    <p className="text-[var(--text-muted)]">No compliance data available.</p>
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                            <div className={`text-3xl font-bold ${scoreColor(data.summary.avgComplianceScore)}`}>
                                {data.summary.avgComplianceScore}%
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Avg Compliance Score</div>
                            <div className="text-xs text-[var(--text-muted)] mt-0.5">{data.franchiseeCount} franchisees · {data.hqCatalogSize} HQ services</div>
                        </div>
                        <button onClick={() => setStatusFilter(statusFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
                            className={`glass-panel rounded-xl border p-4 text-left transition-all ${statusFilter === 'CRITICAL' ? 'border-red-400 bg-red-500/5' : 'border-[var(--border)] hover:border-red-400/40'}`}>
                            <div className="text-3xl font-bold text-red-400">{data.summary.criticalCount}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Critical</div>
                            <div className="text-xs text-red-400 mt-0.5">Below 60% alignment</div>
                        </button>
                        <button onClick={() => setStatusFilter(statusFilter === 'DRIFTING' ? 'ALL' : 'DRIFTING')}
                            className={`glass-panel rounded-xl border p-4 text-left transition-all ${statusFilter === 'DRIFTING' ? 'border-amber-400 bg-amber-500/5' : 'border-[var(--border)] hover:border-amber-400/40'}`}>
                            <div className="text-3xl font-bold text-amber-400">{data.summary.driftingCount}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Drifting</div>
                            <div className="text-xs text-amber-400 mt-0.5">60–89% alignment</div>
                        </button>
                        <button onClick={() => setStatusFilter(statusFilter === 'COMPLIANT' ? 'ALL' : 'COMPLIANT')}
                            className={`glass-panel rounded-xl border p-4 text-left transition-all ${statusFilter === 'COMPLIANT' ? 'border-emerald-400 bg-emerald-500/5' : 'border-[var(--border)] hover:border-emerald-400/40'}`}>
                            <div className="text-3xl font-bold text-emerald-400">{data.summary.compliantCount}</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">Compliant</div>
                            <div className="text-xs text-emerald-400 mt-0.5">90%+ alignment</div>
                        </button>
                    </div>

                    {/* No HQ catalog notice */}
                    {data.hqCatalogSize === 0 && (
                        <div className="glass-panel rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-5 flex items-start gap-3">
                            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">No HQ Catalog Found</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                    Compliance requires a GlobalService catalog. Go to Brand Catalog → add services to the HQ master catalog.
                                    Once HQ services exist, franchisee drift will be automatically detected.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <div className="flex gap-2">
                            {(['ALL', 'CRITICAL', 'DRIFTING', 'COMPLIANT'] as const).map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s
                                        ? s === 'ALL' ? 'bg-[var(--primary)] text-white'
                                            : s === 'CRITICAL' ? 'bg-red-500 text-white'
                                                : s === 'DRIFTING' ? 'bg-amber-500 text-white'
                                                    : 'bg-emerald-500 text-white'
                                        : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        {regions.length > 1 && (
                            <div className="relative ml-auto">
                                <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
                                    className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs appearance-none pr-7 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                                    {regions.map(r => <option key={r} value={r}>{r === 'ALL' ? 'All Regions' : r}</option>)}
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {/* Compliance table with expandable rows */}
                    <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Franchisee</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Compliance</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">HQ Linked</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Missing</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Local Only</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Price Drifts</th>
                                    <th className="px-4 py-3 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">No franchisees match the current filter.</td></tr>
                                ) : filtered.map(f => {
                                    const cfg = STATUS_CONFIG[f.status];
                                    const StatusIcon = cfg.icon;
                                    const isExpanded = expandedId === f.franchiseId;
                                    const hasDrillDown = f.localOnlyNames.length > 0 || f.missingNames.length > 0 || f.priceDriftDetails.length > 0;
                                    return (
                                        <>
                                            <tr key={f.franchiseId}
                                                className={`border-b border-[var(--border)] transition-colors ${cfg.row} ${hasDrillDown ? 'cursor-pointer hover:bg-[var(--surface-hover)]' : ''}`}
                                                onClick={() => hasDrillDown && setExpandedId(isExpanded ? null : f.franchiseId)}
                                            >
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${cfg.badge}`}>
                                                        <StatusIcon size={11} />
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 size={14} className="text-[var(--text-muted)] shrink-0" />
                                                        <div>
                                                            <p className="font-semibold text-[var(--text-primary)]">{f.franchiseName}</p>
                                                            {f.region && (
                                                                <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                                                    <MapPin size={10} />{f.region}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 w-40">
                                                    <ScoreBar score={f.complianceScore} />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{f.linkedToHQ}</span>
                                                    <span className="text-xs text-[var(--text-muted)]"> / {data.hqCatalogSize}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-sm font-bold ${f.missing > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>{f.missing}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-sm font-bold ${f.localOnly > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>{f.localOnly}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-sm font-bold ${f.priceDrifts > 0 ? 'text-orange-400' : 'text-[var(--text-muted)]'}`}>{f.priceDrifts}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {hasDrillDown && (
                                                        <ChevronRight size={15} className={`text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                    )}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr key={`${f.franchiseId}-detail`} className="border-b border-[var(--border)] bg-[var(--surface)]">
                                                    <td colSpan={8} className="px-6 py-4">
                                                        <div className="grid grid-cols-3 gap-6">
                                                            {f.missingNames.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-bold text-red-400 flex items-center gap-1 mb-2">
                                                                        <XCircle size={12} /> Missing HQ Services
                                                                    </p>
                                                                    <ul className="space-y-1">
                                                                        {f.missingNames.map(n => (
                                                                            <li key={n} className="text-xs text-[var(--text-secondary)] pl-2 border-l-2 border-red-500/40">{n}</li>
                                                                        ))}
                                                                        {f.missing > f.missingNames.length && (
                                                                            <li className="text-xs text-[var(--text-muted)]">+ {f.missing - f.missingNames.length} more</li>
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {f.localOnlyNames.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-bold text-amber-400 flex items-center gap-1 mb-2">
                                                                        <PlusCircle size={12} /> Local-Only Services
                                                                    </p>
                                                                    <ul className="space-y-1">
                                                                        {f.localOnlyNames.map(n => (
                                                                            <li key={n} className="text-xs text-[var(--text-secondary)] pl-2 border-l-2 border-amber-500/40">{n}</li>
                                                                        ))}
                                                                        {f.localOnly > f.localOnlyNames.length && (
                                                                            <li className="text-xs text-[var(--text-muted)]">+ {f.localOnly - f.localOnlyNames.length} more</li>
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            {f.priceDriftDetails.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-bold text-orange-400 flex items-center gap-1 mb-2">
                                                                        <DollarSign size={12} /> Price Drift
                                                                    </p>
                                                                    <ul className="space-y-1.5">
                                                                        {f.priceDriftDetails.map(d => (
                                                                            <li key={d.serviceName} className="text-xs text-[var(--text-secondary)] pl-2 border-l-2 border-orange-500/40">
                                                                                <span className="font-medium">{d.serviceName}</span>
                                                                                <span className="text-[var(--text-muted)]"> — Local: ${d.localPrice} vs HQ: ${d.hqPrice}</span>
                                                                            </li>
                                                                        ))}
                                                                        {f.priceDrifts > f.priceDriftDetails.length && (
                                                                            <li className="text-xs text-[var(--text-muted)]">+ {f.priceDrifts - f.priceDriftDetails.length} more</li>
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex gap-4 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5"><Package size={12} /> <strong>HQ Linked</strong> — services from HQ catalog</span>
                        <span className="flex items-center gap-1.5"><XCircle size={12} className="text-red-400" /> <strong>Missing</strong> — HQ service not active at this franchise</span>
                        <span className="flex items-center gap-1.5"><PlusCircle size={12} className="text-amber-400" /> <strong>Local Only</strong> — not in HQ catalog</span>
                        <span className="flex items-center gap-1.5"><DollarSign size={12} className="text-orange-400" /> <strong>Price Drift</strong> — local price differs from HQ standard</span>
                    </div>
                </>
            )}
        </div>
    );
}
