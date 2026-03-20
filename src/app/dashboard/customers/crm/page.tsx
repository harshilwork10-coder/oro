'use client';

import { useState, useEffect } from 'react';
import { Users, Crown, AlertTriangle, Sparkles, Heart, Moon, UserPlus, User, Filter, TrendingUp } from 'lucide-react';

const SEGMENT_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; desc: string }> = {
    Champion: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Crown, desc: 'Top spenders, frequent visitors' },
    Loyal: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Heart, desc: 'Consistent buyers, good spend' },
    Potential: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: Sparkles, desc: 'Recent buyer, could become loyal' },
    Regular: { color: 'text-stone-400', bg: 'bg-stone-500/10', border: 'border-stone-500/30', icon: User, desc: 'Average engagement' },
    'At-Risk': { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle, desc: 'Was loyal, slipping away' },
    Hibernating: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: Moon, desc: 'Haven\'t visited in 60+ days' },
    New: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: UserPlus, desc: 'First purchase within 14 days' },
    Lost: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertTriangle, desc: 'Haven\'t bought in 90+ days' },
};

export default function CustomerCRMPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeSegment, setActiveSegment] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetch('/api/analytics/crm')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <Users size={48} className="text-blue-400 animate-pulse" />
            </div>
        );
    }

    if (!data) return null;
    const o = data.overview || {};
    const customers = (data.customers || []).filter((c: any) => {
        if (activeSegment && c.segment !== activeSegment) return false;
        if (searchQuery && !c.displayPhone.includes(searchQuery) && !c.phone.includes(searchQuery)) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Users size={28} className="text-blue-400" />
                    <div>
                        <h1 className="text-2xl font-bold">Customer CRM</h1>
                        <p className="text-sm text-[var(--text-muted)]">Know your regulars — RFM segmentation & lifetime value</p>
                    </div>
                </div>

                {/* Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)]">Total Customers</p>
                        <p className="text-2xl font-black">{o.totalCustomers}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)]">Total Revenue</p>
                        <p className="text-2xl font-black text-green-400">${o.totalRevenue?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)]">Avg Lifetime Value</p>
                        <p className="text-2xl font-black">${o.avgLifetimeValue?.toFixed(0)}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)]">Avg Visits</p>
                        <p className="text-2xl font-black">{o.avgVisits}</p>
                    </div>
                </div>

                {/* Insights */}
                {data.insights?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {data.insights.map((ins: any, i: number) => (
                            <div key={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <span className="text-xl">{ins.emoji}</span>
                                <p className="font-semibold text-sm mt-1">{ins.title}</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1">{ins.detail}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Segment Cards */}
                <div>
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase mb-3 flex items-center gap-2">
                        <Filter size={14} /> Customer Segments
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button
                            onClick={() => setActiveSegment(null)}
                            className={`p-3 rounded-xl border text-left transition-all ${!activeSegment ? 'border-blue-500 bg-blue-500/10' : 'border-[var(--border)] hover:border-blue-500/50'}`}
                        >
                            <p className="font-bold text-sm">All</p>
                            <p className="text-xs text-[var(--text-muted)]">{o.totalCustomers} customers</p>
                        </button>
                        {(data.segmentSummary || []).map((seg: any) => {
                            const config = SEGMENT_CONFIG[seg.segment] || SEGMENT_CONFIG.Regular;
                            const Icon = config.icon;
                            return (
                                <button
                                    key={seg.segment}
                                    onClick={() => setActiveSegment(activeSegment === seg.segment ? null : seg.segment)}
                                    className={`p-3 rounded-xl border text-left transition-all ${activeSegment === seg.segment ? `${config.border} ${config.bg}` : 'border-[var(--border)] hover:border-blue-500/50'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon size={14} className={config.color} />
                                        <span className={`font-bold text-sm ${config.color}`}>{seg.segment}</span>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">{seg.count} • ${seg.totalSpend.toLocaleString()}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Search */}
                <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="🔍 Search by phone number..."
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl py-2.5 px-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Customer Table */}
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--surface)]">
                            <tr>
                                <th className="text-left px-4 py-3 text-[var(--text-muted)]">Customer</th>
                                <th className="text-center px-3 py-3 text-[var(--text-muted)]">Segment</th>
                                <th className="text-center px-3 py-3 text-[var(--text-muted)]">RFM</th>
                                <th className="text-right px-3 py-3 text-[var(--text-muted)]">Lifetime $</th>
                                <th className="text-right px-3 py-3 text-[var(--text-muted)]">Visits</th>
                                <th className="text-right px-3 py-3 text-[var(--text-muted)]">Avg Ticket</th>
                                <th className="text-right px-3 py-3 text-[var(--text-muted)]">Last Visit</th>
                                <th className="text-left px-3 py-3 text-[var(--text-muted)]">Top Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.slice(0, 50).map((c: any, i: number) => {
                                const config = SEGMENT_CONFIG[c.segment] || SEGMENT_CONFIG.Regular;
                                return (
                                    <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--surface)]">
                                        <td className="px-4 py-2.5 font-medium">{c.displayPhone}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.border} ${config.color} border`}>
                                                {c.segmentEmoji} {c.segment}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="text-xs" title="Recency">R{c.rfm.recency}</span>
                                                <span className="text-xs" title="Frequency">F{c.rfm.frequency}</span>
                                                <span className="text-xs" title="Monetary">M{c.rfm.monetary}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-bold text-green-400">${c.metrics.totalSpend.toLocaleString()}</td>
                                        <td className="px-3 py-2.5 text-right">{c.metrics.visitCount}</td>
                                        <td className="px-3 py-2.5 text-right">${c.metrics.avgTicket.toFixed(2)}</td>
                                        <td className="px-3 py-2.5 text-right text-[var(--text-muted)]">
                                            {c.metrics.daysSinceLastVisit === 0 ? 'Today' : `${c.metrics.daysSinceLastVisit}d ago`}
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-[var(--text-muted)] truncate max-w-[120px]">
                                            {c.topCategories?.[0]?.name || '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {customers.length === 0 && (
                        <div className="p-8 text-center text-[var(--text-muted)]">
                            No customers in this segment
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
