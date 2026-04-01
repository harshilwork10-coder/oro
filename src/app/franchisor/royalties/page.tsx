'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    DollarSign, AlertTriangle, TrendingUp, Settings2,
    RefreshCw, ChevronRight, Building2, MapPin, Users,
    Loader2, CheckCircle, Lock, Edit3, Save, X
} from 'lucide-react';
import Link from 'next/link';
import { HQAccessGuard } from '@/components/franchisor/HQAccessGuard';

interface RoyaltyConfig {
    percentage: number;
    minimumMonthlyFee: number;
    calculationPeriod: string;
}

interface RoyaltyRow {
    franchiseId: string;
    franchiseName: string;
    region: string | null;
    ownerName: string;
    ownerEmail: string;
    locationCount: number;
    grossSales: number;
    royaltyRate: number;
    royaltyDue: number;
    minimumFee: number;
    status: 'PENDING' | 'OVERDUE' | 'NO_SALES';
    period: string;
}

interface RoyaltySummary {
    totalDue: number;
    totalOverdue: number;
    overdueCount: number;
    franchiseeCount: number;
    period: string;
}

const STATUS_STYLE: Record<string, string> = {
    PENDING: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    OVERDUE: 'bg-red-500/20 text-red-400 border border-red-500/30',
    NO_SALES: 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]',
};

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function RoyaltyDashboardPage() {
    const [rows, setRows] = useState<RoyaltyRow[]>([]);
    const [summary, setSummary] = useState<RoyaltySummary | null>(null);
    const [config, setConfig] = useState<RoyaltyConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [regionFilter, setRegionFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'PENDING' | 'NO_SALES'>('ALL');
    const [editingConfig, setEditingConfig] = useState(false);
    const [draftConfig, setDraftConfig] = useState<RoyaltyConfig>({ percentage: 6, minimumMonthlyFee: 0, calculationPeriod: 'MONTHLY' });
    const [savingConfig, setSavingConfig] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/franchisor/royalties/summary');
            if (res.ok) {
                const data = await res.json();
                setRows(data.franchisees || []);
                setSummary(data.summary || null);
                setConfig(data.config);
                if (data.config) setDraftConfig(data.config);
            }
        } catch (err) {
            console.error('[Royalties] fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    async function saveConfig() {
        setSavingConfig(true);
        try {
            const res = await fetch('/api/franchisor/royalty-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draftConfig)
            });
            if (res.ok) {
                setConfig(draftConfig);
                setEditingConfig(false);
                setToast('Royalty configuration saved.');
                await fetchData(); // Recalculate with new rates
                setTimeout(() => setToast(null), 3000);
            }
        } catch (err) {
            console.error('[Royalties] save config error:', err);
        } finally {
            setSavingConfig(false);
        }
    }

    const regions = ['ALL', ...Array.from(new Set(rows.map(r => r.region).filter(Boolean))) as string[]];

    const filtered = rows.filter(r => {
        const regionMatch = regionFilter === 'ALL' || r.region === regionFilter;
        const statusMatch = statusFilter === 'ALL' || r.status === statusFilter;
        return regionMatch && statusMatch;
    });

    return (
        <HQAccessGuard requiredCap="canAccessRoyalties">
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <span className="p-2 bg-emerald-500/20 rounded-lg">
                            <DollarSign size={22} className="text-emerald-400" />
                        </span>
                        Royalty Dashboard
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        {summary?.period || 'Current Month'} · {summary?.franchiseeCount || 0} franchisees
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setEditingConfig(!editingConfig)}
                        className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg text-sm transition-colors"
                    >
                        <Settings2 size={16} />
                        Configure Rates
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg text-sm transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Config Edit Panel */}
            {editingConfig && (
                <div className="glass-panel rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/5 p-5 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <Lock size={16} className="text-[var(--primary)]" />
                            Royalty Rate Configuration
                        </h3>
                        <button onClick={() => setEditingConfig(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1">Royalty %</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number" min="0" max="100" step="0.5"
                                    value={draftConfig.percentage}
                                    onChange={e => setDraftConfig(p => ({ ...p, percentage: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                                <span className="text-[var(--text-muted)] text-sm">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1">Minimum Monthly Fee</label>
                            <div className="flex items-center gap-1">
                                <span className="text-[var(--text-muted)] text-sm">$</span>
                                <input
                                    type="number" min="0"
                                    value={draftConfig.minimumMonthlyFee}
                                    onChange={e => setDraftConfig(p => ({ ...p, minimumMonthlyFee: parseFloat(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1">Calculation Period</label>
                            <select
                                value={draftConfig.calculationPeriod}
                                onChange={e => setDraftConfig(p => ({ ...p, calculationPeriod: e.target.value }))}
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            >
                                <option value="MONTHLY">Monthly</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="QUARTERLY">Quarterly</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={saveConfig}
                            disabled={savingConfig}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-dark)] disabled:opacity-50"
                        >
                            {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {savingConfig ? 'Saving...' : 'Save Configuration'}
                        </button>
                        <button onClick={() => { setDraftConfig(config || { percentage: 6, minimumMonthlyFee: 0, calculationPeriod: 'MONTHLY' }); setEditingConfig(false); }} className="px-4 py-2 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                    <div className="text-2xl font-bold text-emerald-400">{summary ? fmt(summary.totalDue) : '—'}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Total Royalties Due</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{config ? `${config.percentage}% of gross sales` : 'No config set'}</div>
                </div>
                <button
                    onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
                    className={`glass-panel rounded-xl border p-4 text-left transition-all ${statusFilter === 'OVERDUE' ? 'border-red-400 bg-red-500/5' : 'border-[var(--border)] hover:border-red-400/50'}`}
                >
                    <div className="text-2xl font-bold text-red-400">{summary ? fmt(summary.totalOverdue) : '—'}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Overdue This Month</div>
                    <div className="text-xs text-red-400 mt-0.5">{summary?.overdueCount || 0} franchisees past due</div>
                </button>
                <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                    <div className="text-2xl font-bold text-[var(--text-primary)]">{summary?.franchiseeCount || 0}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Total Franchisees</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{summary?.period}</div>
                </div>
                <div className="glass-panel rounded-xl border border-[var(--border)] p-4">
                    <div className="text-2xl font-bold text-[var(--primary)]">
                        {config ? `${config.percentage}%` : '—'}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Royalty Rate</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {config?.minimumMonthlyFee ? `Min ${fmt(config.minimumMonthlyFee)}/mo` : 'No minimum'}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="flex gap-2">
                    {(['ALL', 'OVERDUE', 'PENDING', 'NO_SALES'] as const).map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s
                                ? s === 'OVERDUE' ? 'bg-red-500 text-white' : 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {s === 'ALL' ? 'All Status' : s === 'NO_SALES' ? 'No Sales' : s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                {regions.length > 1 && (
                    <select
                        value={regionFilter}
                        onChange={e => setRegionFilter(e.target.value)}
                        className="ml-auto px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                        {regions.map(r => <option key={r} value={r}>{r === 'ALL' ? 'All Regions' : r}</option>)}
                    </select>
                )}
            </div>

            {/* Royalty Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-[var(--text-muted)]" />
                </div>
            ) : !config ? (
                <div className="glass-panel rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-16 text-center">
                    <Settings2 size={48} className="mx-auto text-[var(--primary)] mb-4" />
                    <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Configure Royalty Rate First</h3>
                    <p className="text-[var(--text-muted)] text-sm mb-4">Click "Configure Rates" above to set your royalty percentage and minimum fees.</p>
                    <button onClick={() => setEditingConfig(true)} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium">
                        Set Up Royalties
                    </button>
                </div>
            ) : (
                <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Franchisee</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Region</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Gross Sales</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Rate</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Royalty Due</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(row => (
                                <tr key={row.franchiseId} className={`border-b border-[var(--border)] hover:bg-[var(--surface-hover)] transition-colors ${row.status === 'OVERDUE' ? 'bg-red-500/3' : ''}`}>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${STATUS_STYLE[row.status]}`}>
                                            {row.status === 'OVERDUE' && <AlertTriangle size={11} />}
                                            {row.status === 'PENDING' && <TrendingUp size={11} />}
                                            {row.status === 'NO_SALES' && <CheckCircle size={11} />}
                                            {row.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={14} className="text-[var(--text-muted)] shrink-0" />
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{row.franchiseName}</p>
                                                <p className="text-xs text-[var(--text-muted)]">
                                                    <Users size={10} className="inline mr-1" />
                                                    {row.ownerName} · {row.locationCount} location{row.locationCount !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {row.region ? (
                                            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                                                <MapPin size={11} />{row.region}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted)]">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-sm text-[var(--text-primary)]">
                                        {fmt(row.grossSales)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-[var(--text-muted)]">
                                        {row.royaltyRate}%
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`font-bold text-sm font-mono ${row.status === 'OVERDUE' ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {fmt(row.royaltyDue)}
                                        </span>
                                        {row.minimumFee > 0 && row.grossSales * (row.royaltyRate / 100) < row.minimumFee && (
                                            <p className="text-xxs text-[var(--text-muted)] text-right">min fee applied</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link href={`/franchisor/franchisees`} className="flex items-center gap-1 text-xs text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium whitespace-nowrap">
                                            View <ChevronRight size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t border-[var(--border)] bg-[var(--surface)]">
                            <tr>
                                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-[var(--text-primary)] text-right">
                                    Total Due ({filtered.length} of {rows.length} shown):
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="font-bold text-emerald-400 font-mono">
                                        {fmt(filtered.reduce((s, r) => s + r.royaltyDue, 0))}
                                    </span>
                                </td>
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 z-50">
                    <CheckCircle size={16} />
                    {toast}
                </div>
            )}
        </div>
        </HQAccessGuard>
    );
}
