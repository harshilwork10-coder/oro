'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle, AlertCircle, Activity, Clock,
    RefreshCw, ChevronRight, Building2, MapPin, Users,
    CheckCircle, TrendingDown, WifiOff, Loader2
} from 'lucide-react';
import Link from 'next/link';

interface ExceptionItem {
    id: string;
    locationId: string;
    locationName: string;
    locationCity: string;
    locationState: string;
    franchiseName: string;
    franchiseeContact: string;
    region: string | null;
    type: 'NO_DEVICES' | 'NO_ACTIVITY' | 'HIGH_NOSHOW' | 'STUCK_PROVISION';
    severity: 'CRITICAL' | 'WARNING';
    message: string;
    daysOpen: number;
    actionUrl: string;
}

interface ExceptionSummary {
    critical: number;
    warning: number;
    total: number;
}

const TYPE_META: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
    NO_DEVICES: { label: 'Offline', icon: WifiOff, color: 'text-red-400' },
    NO_ACTIVITY: { label: 'No Activity', icon: Activity, color: 'text-orange-400' },
    HIGH_NOSHOW: { label: 'High No-Shows', icon: TrendingDown, color: 'text-amber-400' },
    STUCK_PROVISION: { label: 'Stuck in Setup', icon: Clock, color: 'text-purple-400' },
};

type FilterType = 'ALL' | 'CRITICAL' | 'WARNING' | 'NO_DEVICES' | 'NO_ACTIVITY' | 'HIGH_NOSHOW' | 'STUCK_PROVISION';

export default function ExceptionsPage() {
    const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
    const [summary, setSummary] = useState<ExceptionSummary>({ critical: 0, warning: 0, total: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [regionFilter, setRegionFilter] = useState<string>('ALL');
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

    const fetchExceptions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/franchisor/portfolio/exceptions');
            if (res.ok) {
                const data = await res.json();
                setExceptions(data.exceptions || []);
                setSummary(data.summary || { critical: 0, warning: 0, total: 0 });
                setLastRefreshed(new Date());
            }
        } catch (err) {
            console.error('[Exceptions] fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchExceptions(); }, [fetchExceptions]);

    // Derive unique regions from data
    const regions = ['ALL', ...Array.from(new Set(exceptions.map(e => e.region).filter(Boolean))) as string[]];

    // Apply filters
    const filtered = exceptions.filter(e => {
        const severityMatch = filter === 'ALL' || filter === e.severity || filter === e.type;
        const regionMatch = regionFilter === 'ALL' || e.region === regionFilter;
        return severityMatch && regionMatch;
    });

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <span className="p-2 bg-red-500/20 rounded-lg">
                            <AlertTriangle size={22} className="text-red-400" />
                        </span>
                        Problem Store Board
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Stores that need attention right now
                        {lastRefreshed && (
                            <span className="ml-2 text-[var(--text-muted)]">
                                · Refreshed {lastRefreshed.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchExceptions}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg text-sm transition-colors"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <button
                    onClick={() => setFilter('ALL')}
                    className={`glass-panel rounded-xl border p-4 text-left transition-all ${filter === 'ALL' ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] hover:border-[var(--border-hover)]'}`}
                >
                    <div className="text-3xl font-bold text-[var(--text-primary)]">{summary.total}</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1">Total Issues</div>
                </button>
                <button
                    onClick={() => setFilter('CRITICAL')}
                    className={`glass-panel rounded-xl border p-4 text-left transition-all ${filter === 'CRITICAL' ? 'border-red-400 bg-red-500/5' : 'border-[var(--border)] hover:border-red-400/50'}`}
                >
                    <div className="text-3xl font-bold text-red-400">{summary.critical}</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <AlertCircle size={12} className="text-red-400" /> Critical
                    </div>
                </button>
                <button
                    onClick={() => setFilter('WARNING')}
                    className={`glass-panel rounded-xl border p-4 text-left transition-all ${filter === 'WARNING' ? 'border-amber-400 bg-amber-500/5' : 'border-[var(--border)] hover:border-amber-400/50'}`}
                >
                    <div className="text-3xl font-bold text-amber-400">{summary.warning}</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-1">
                        <AlertTriangle size={12} className="text-amber-400" /> Warning
                    </div>
                </button>
                <div className={`glass-panel rounded-xl border p-4 ${summary.total === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--border)]'}`}>
                    {summary.total === 0 ? (
                        <>
                            <div className="text-3xl font-bold text-emerald-400">✓</div>
                            <div className="text-sm text-emerald-400 mt-1">All Clear</div>
                        </>
                    ) : (
                        <>
                            <div className="text-3xl font-bold text-[var(--text-primary)]">
                                {exceptions.filter(e => e.type === 'STUCK_PROVISION').length}
                            </div>
                            <div className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-1">
                                <Clock size={12} className="text-purple-400" /> Stuck in Setup
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Type Filter Pills + Region Filter */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                    {(['ALL', 'NO_DEVICES', 'NO_ACTIVITY', 'HIGH_NOSHOW', 'STUCK_PROVISION'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {f === 'ALL' ? 'All Types' : (TYPE_META[f]?.label || f)}
                        </button>
                    ))}
                </div>

                {regions.length > 1 && (
                    <select
                        value={regionFilter}
                        onChange={e => setRegionFilter(e.target.value)}
                        className="ml-auto px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                        {regions.map(r => (
                            <option key={r} value={r}>{r === 'ALL' ? 'All Regions' : r}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Exceptions Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-[var(--text-muted)]" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-16 text-center">
                    <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                    <h3 className="text-xl font-semibold text-emerald-400 mb-2">
                        {filter === 'ALL' && regionFilter === 'ALL' ? 'All Stores Clear' : 'No Issues for Selected Filter'}
                    </h3>
                    <p className="text-[var(--text-muted)] text-sm">
                        {filter === 'ALL' && regionFilter === 'ALL'
                            ? 'No stores currently have active exceptions. Great network health!'
                            : 'Try changing the filter to see other issues.'}
                    </p>
                </div>
            ) : (
                <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Severity</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Location</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Issue</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Franchisee</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Region</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Days</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((ex) => {
                                const meta = TYPE_META[ex.type];
                                const Icon = meta?.icon || AlertTriangle;
                                return (
                                    <tr
                                        key={ex.id}
                                        className={`border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors ${ex.severity === 'CRITICAL' ? 'bg-red-500/3' : ''}`}
                                    >
                                        {/* Severity */}
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${ex.severity === 'CRITICAL'
                                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                }`}>
                                                {ex.severity === 'CRITICAL'
                                                    ? <AlertCircle size={11} />
                                                    : <AlertTriangle size={11} />}
                                                {ex.severity}
                                            </span>
                                        </td>

                                        {/* Location */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Building2 size={14} className="text-[var(--text-muted)] shrink-0" />
                                                <div>
                                                    <p className="font-medium text-[var(--text-primary)]">{ex.locationName}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        {[ex.locationCity, ex.locationState].filter(Boolean).join(', ')}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Issue */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Icon size={14} className={meta?.color || 'text-[var(--text-muted)]'} />
                                                <div>
                                                    <p className="font-medium text-[var(--text-primary)]">{meta?.label || ex.type}</p>
                                                    <p className="text-xs text-[var(--text-muted)] max-w-xs">{ex.message}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Franchisee */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                <Users size={12} />
                                                <span className="text-xs">{ex.franchiseName}</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5 pl-4">{ex.franchiseeContact}</p>
                                        </td>

                                        {/* Region */}
                                        <td className="px-4 py-3">
                                            {ex.region ? (
                                                <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                                    <MapPin size={11} />
                                                    {ex.region}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-[var(--text-muted)]">—</span>
                                            )}
                                        </td>

                                        {/* Days Open */}
                                        <td className="px-4 py-3">
                                            {ex.daysOpen > 0 ? (
                                                <span className={`text-sm font-bold ${ex.daysOpen > 14 ? 'text-red-400' : ex.daysOpen > 7 ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                                                    {ex.daysOpen}d
                                                </span>
                                            ) : (
                                                <span className="text-xs text-[var(--text-muted)]">MTD</span>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td className="px-4 py-3">
                                            <Link
                                                href={ex.actionUrl}
                                                className="flex items-center gap-1 text-xs text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium"
                                            >
                                                Location 360
                                                <ChevronRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)] flex items-center justify-between">
                        <span>Showing {filtered.length} of {exceptions.length} issues</span>
                        <span>Auto-detects: offline devices · no activity &gt;48h · no-shows &gt;20% · setup &gt;7 days</span>
                    </div>
                </div>
            )}
        </div>
    );
}
