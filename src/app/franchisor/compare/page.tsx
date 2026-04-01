'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, TrendingDown, Minus, ArrowRightLeft,
    MapPin, Building2, Loader2, RefreshCw, ChevronDown,
    DollarSign, Users, AlertTriangle, BarChart3
} from 'lucide-react';

type Mode = 'location' | 'region';
type RangeKey = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_30';

interface Metrics {
    grossSales: number;
    netSales: number;
    transactionCount: number;
    avgTicket: number;
    tips: number;
    tax: number;
    refunds: number;
    refundCount: number;
    refundRate: number;
    appointments: number;
    noShows: number;
    noShowRate: number;
}

interface CompareEntity {
    label: string;
    address?: string;
    franchiseeName?: string;
    region?: string | null;
    locationCount?: number;
    franchiseeCount?: number;
    metrics: Metrics;
}

interface CompareResult {
    mode: Mode;
    period: string;
    a: CompareEntity;
    b: CompareEntity;
}

interface Location { id: string; name: string; address?: string; franchiseeName?: string; region?: string | null; }

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtNum = (n: number) => n.toLocaleString();

function Delta({ a, b, invert = false }: { a: number; b: number; invert?: boolean }) {
    if (a === 0 && b === 0) return <span className="text-[var(--text-muted)] text-xs">—</span>;
    const diff = b - a;
    const pct = a !== 0 ? Math.round((diff / a) * 1000) / 10 : 100;
    const better = invert ? diff < 0 : diff > 0;
    const worse = invert ? diff > 0 : diff < 0;
    if (diff === 0) return <span className="flex items-center gap-0.5 text-xs text-[var(--text-muted)]"><Minus size={11} /> Tied</span>;
    return (
        <span className={`flex items-center gap-0.5 text-xs font-bold ${better ? 'text-emerald-400' : worse ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
            {better ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {pct > 0 ? '+' : ''}{pct}%
        </span>
    );
}

const RANGE_LABELS: Record<RangeKey, string> = {
    TODAY: 'Today',
    THIS_WEEK: 'This Week',
    THIS_MONTH: 'This Month',
    LAST_30: 'Last 30 Days',
};

const METRICS_CONFIG = [
    { key: 'grossSales', label: 'Gross Sales', format: fmt, icon: DollarSign, highlight: true },
    { key: 'netSales', label: 'Net Sales', format: fmt, icon: DollarSign },
    { key: 'transactionCount', label: 'Transactions', format: fmtNum, icon: BarChart3 },
    { key: 'avgTicket', label: 'Avg Ticket', format: fmt, icon: DollarSign, highlight: true },
    { key: 'tips', label: 'Tips', format: fmt, icon: DollarSign },
    { key: 'refunds', label: 'Refunds', format: fmt, icon: AlertTriangle, invert: true },
    { key: 'refundRate', label: 'Refund Rate', format: fmtPct, icon: AlertTriangle, invert: true },
    { key: 'appointments', label: 'Appointments', format: fmtNum, icon: Users },
    { key: 'noShows', label: 'No-Shows', format: fmtNum, icon: Users, invert: true },
    { key: 'noShowRate', label: 'No-Show Rate', format: fmtPct, icon: Users, invert: true },
] as const;

export default function ComparePage() {
    const [mode, setMode] = useState<Mode>('location');
    const [range, setRange] = useState<RangeKey>('THIS_MONTH');
    const [result, setResult] = useState<CompareResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Location mode selectors
    const [locations, setLocations] = useState<Location[]>([]);
    const [locationsLoading, setLocationsLoading] = useState(false);
    const [selectedA, setSelectedA] = useState('');
    const [selectedB, setSelectedB] = useState('');

    // Region mode selectors
    const [regions, setRegions] = useState<string[]>([]);
    const [regionA, setRegionA] = useState('');
    const [regionB, setRegionB] = useState('');

    // Load locations & regions on mount
    useEffect(() => {
        setLocationsLoading(true);
        Promise.all([
            fetch('/api/franchisor/locations').then(r => r.ok ? r.json() : null),
            fetch('/api/franchisor/franchisees').then(r => r.ok ? r.json() : null),
        ]).then(([locData, frData]) => {
            if (locData?.data) {
                setLocations(locData.data.map((l: Record<string, string>) => ({
                    id: l.id,
                    name: l.name,
                    address: l.address,
                    franchiseeName: l.franchiseeName,
                    region: l.region,
                })));
            }
            if (frData?.data) {
                const regionSet = new Set<string>(
                    frData.data.map((f: Record<string, string>) => f.region).filter(Boolean)
                );
                setRegions(Array.from(regionSet));
            }
        }).finally(() => setLocationsLoading(false));
    }, []);

    const canCompare = mode === 'location'
        ? selectedA && selectedB && selectedA !== selectedB
        : regionA && regionB && regionA !== regionB;

    const compare = useCallback(async () => {
        if (!canCompare) return;
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({
                mode,
                a: mode === 'location' ? selectedA : regionA,
                b: mode === 'location' ? selectedB : regionB,
                range,
            });
            const res = await fetch(`/api/franchisor/compare?${params}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Compare failed');
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Compare failed');
        } finally {
            setLoading(false);
        }
    }, [mode, selectedA, selectedB, regionA, regionB, range, canCompare]);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <span className="p-2 bg-[var(--primary)]/20 rounded-lg">
                            <ArrowRightLeft size={22} className="text-[var(--primary)]" />
                        </span>
                        Compare Mode
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Side-by-side performance comparison across locations and regions</p>
                </div>
            </div>

            {/* Controls */}
            <div className="glass-panel rounded-xl border border-[var(--border)] p-5 mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Mode toggle */}
                    <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wide font-medium">Compare By</label>
                        <div className="flex bg-[var(--background)] border border-[var(--border)] rounded-lg overflow-hidden">
                            {(['location', 'region'] as Mode[]).map(m => (
                                <button
                                    key={m}
                                    onClick={() => { setMode(m); setResult(null); setError(''); }}
                                    className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${mode === m ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                >
                                    {m === 'location' ? <><MapPin size={13} className="inline mr-1.5" />Location</> : <><Building2 size={13} className="inline mr-1.5" />Region</>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selectors A */}
                    <div className="flex-1 min-w-48">
                        <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wide font-medium">
                            {mode === 'location' ? 'Location A' : 'Region A'}
                        </label>
                        {mode === 'location' ? (
                            <div className="relative">
                                <select value={selectedA} onChange={e => setSelectedA(e.target.value)} disabled={locationsLoading}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                                    <option value="">Select location...</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.id} disabled={l.id === selectedB}>
                                            {l.name} {l.franchiseeName ? `— ${l.franchiseeName}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            </div>
                        ) : (
                            <div className="relative">
                                <select value={regionA} onChange={e => setRegionA(e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                                    <option value="">Select region...</option>
                                    {regions.map(r => <option key={r} value={r} disabled={r === regionB}>{r}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            </div>
                        )}
                    </div>

                    <div className="flex items-end pb-0.5">
                        <span className="text-[var(--text-muted)] text-lg font-light">vs</span>
                    </div>

                    {/* Selectors B */}
                    <div className="flex-1 min-w-48">
                        <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wide font-medium">
                            {mode === 'location' ? 'Location B' : 'Region B'}
                        </label>
                        {mode === 'location' ? (
                            <div className="relative">
                                <select value={selectedB} onChange={e => setSelectedB(e.target.value)} disabled={locationsLoading}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                                    <option value="">Select location...</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.id} disabled={l.id === selectedA}>
                                            {l.name} {l.franchiseeName ? `— ${l.franchiseeName}` : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            </div>
                        ) : (
                            <div className="relative">
                                <select value={regionB} onChange={e => setRegionB(e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                                    <option value="">Select region...</option>
                                    {regions.map(r => <option key={r} value={r} disabled={r === regionA}>{r}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                            </div>
                        )}
                    </div>

                    {/* Range */}
                    <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wide font-medium">Period</label>
                        <div className="relative">
                            <select value={range} onChange={e => setRange(e.target.value as RangeKey)}
                                className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                                {(Object.keys(RANGE_LABELS) as RangeKey[]).map(r => (
                                    <option key={r} value={r}>{RANGE_LABELS[r]}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                        </div>
                    </div>

                    {/* Compare button */}
                    <button
                        onClick={compare}
                        disabled={!canCompare || loading}
                        className="flex items-center gap-2 px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                        {loading ? 'Comparing...' : 'Compare'}
                    </button>
                </div>

                {error && <p className="mt-3 text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            </div>

            {/* Results */}
            {!result && !loading && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-16 text-center">
                    <ArrowRightLeft size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-40" />
                    <p className="text-[var(--text-muted)] text-sm">Select two {mode === 'location' ? 'locations' : 'regions'} and click Compare to see the side-by-side analysis.</p>
                </div>
            )}

            {result && (
                <div className="space-y-4">
                    {/* Entity headers */}
                    <div className="grid grid-cols-[1fr_80px_1fr] gap-4 items-center">
                        <div className="glass-panel rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                            <p className="font-bold text-lg text-[var(--text-primary)]">{result.a.label}</p>
                            {result.a.franchiseeName && <p className="text-xs text-[var(--text-muted)] mt-0.5">{result.a.franchiseeName}</p>}
                            {result.a.region && (
                                <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-1">
                                    <MapPin size={10} />{result.a.region}
                                </span>
                            )}
                            {result.a.locationCount !== undefined && (
                                <p className="text-xs text-[var(--text-muted)] mt-1">{result.a.locationCount} location{result.a.locationCount !== 1 ? 's' : ''} · {result.a.franchiseeCount} franchisees</p>
                            )}
                        </div>
                        <div className="text-center">
                            <span className="text-[var(--text-muted)] font-light text-lg">vs</span>
                        </div>
                        <div className="glass-panel rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4">
                            <p className="font-bold text-lg text-[var(--text-primary)]">{result.b.label}</p>
                            {result.b.franchiseeName && <p className="text-xs text-[var(--text-muted)] mt-0.5">{result.b.franchiseeName}</p>}
                            {result.b.region && (
                                <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] mt-1">
                                    <MapPin size={10} />{result.b.region}
                                </span>
                            )}
                            {result.b.locationCount !== undefined && (
                                <p className="text-xs text-[var(--text-muted)] mt-1">{result.b.locationCount} location{result.b.locationCount !== 1 ? 's' : ''} · {result.b.franchiseeCount} franchisees</p>
                            )}
                        </div>
                    </div>

                    {/* Metrics table */}
                    <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                        <div className="grid grid-cols-[200px_1fr_80px_1fr] text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide bg-[var(--surface)] border-b border-[var(--border)]">
                            <div className="px-4 py-3">Metric</div>
                            <div className="px-4 py-3 text-right text-blue-400">{result.a.label}</div>
                            <div className="px-4 py-3 text-center">Delta</div>
                            <div className="px-4 py-3 text-left text-[var(--primary)]">{result.b.label}</div>
                        </div>

                        {METRICS_CONFIG.map(({ key, label, format, icon: Icon, invert, highlight }) => {
                            const valA = result.a.metrics[key as keyof Metrics] ?? 0;
                            const valB = result.b.metrics[key as keyof Metrics] ?? 0;
                            const winner = invert ? (valA < valB ? 'a' : valA > valB ? 'b' : 'tie') : (valA > valB ? 'a' : valA < valB ? 'b' : 'tie');
                            return (
                                <div
                                    key={key}
                                    className={`grid grid-cols-[200px_1fr_80px_1fr] border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors ${highlight ? 'bg-[var(--surface)]/50' : ''}`}
                                >
                                    <div className="px-4 py-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <Icon size={14} className="text-[var(--text-muted)] shrink-0" />
                                        {label}
                                    </div>
                                    <div className={`px-4 py-3 text-right font-mono text-sm font-semibold ${winner === 'a' ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                                        {format(valA)}
                                    </div>
                                    <div className="px-4 py-3 flex items-center justify-center">
                                        <Delta a={valA} b={valB} invert={invert} />
                                    </div>
                                    <div className={`px-4 py-3 text-left font-mono text-sm font-semibold ${winner === 'b' ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                                        {format(valB)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-xs text-[var(--text-muted)] text-right">
                        Period: {RANGE_LABELS[result.period as RangeKey] || result.period} ·
                        Green = better performer ·
                        Delta = B vs A
                    </p>
                </div>
            )}
        </div>
    );
}
