'use client';

import { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Clock, Trophy, Package, BarChart3, Lightbulb } from 'lucide-react';

interface Insight {
    emoji: string;
    title: string;
    detail: string;
    type: string;
}

const INSIGHT_COLORS: Record<string, string> = {
    opportunity: 'border-blue-500/30 bg-blue-500/5',
    staffing: 'border-purple-500/30 bg-purple-500/5',
    growth: 'border-green-500/30 bg-green-500/5',
    alert: 'border-red-500/30 bg-red-500/5',
    inventory: 'border-amber-500/30 bg-amber-500/5',
    positive: 'border-emerald-500/30 bg-emerald-500/5',
    info: 'border-stone-500/30 bg-stone-500/5',
};

export default function AIInsightsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/analytics/smart-insights')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="text-center">
                    <Brain size={48} className="mx-auto mb-4 text-purple-400 animate-pulse" />
                    <p className="text-[var(--text-muted)]">Analyzing your sales data...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;
    const o = data.overview || {};

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Brain size={28} className="text-purple-400" />
                    <div>
                        <h1 className="text-2xl font-bold">AI Insights</h1>
                        <p className="text-sm text-[var(--text-muted)]">Smart analytics from your last 30 days of sales</p>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)] uppercase">30-Day Revenue</p>
                        <p className="text-2xl font-black text-[var(--text-primary)] mt-1">${o.currentRevenue?.toLocaleString()}</p>
                        <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${o.revenueChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {o.revenueChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {o.revenueChange >= 0 ? '+' : ''}{o.revenueChange}% vs prior
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)] uppercase">Transactions</p>
                        <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{o.totalTransactions?.toLocaleString()}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{Math.round((o.totalTransactions || 0) / 30)}/day avg</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)] uppercase">Avg Ticket</p>
                        <p className="text-2xl font-black text-[var(--text-primary)] mt-1">${o.avgTicket?.toFixed(2)}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">per transaction</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <p className="text-xs text-[var(--text-muted)] uppercase">Avg Margin</p>
                        <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{o.avgMargin}%</p>
                        <p className={`text-sm mt-1 ${o.avgMargin > 30 ? 'text-green-400' : 'text-amber-400'}`}>
                            {o.avgMargin > 30 ? '✅ Healthy' : '⚠️ Review pricing'}
                        </p>
                    </div>
                </div>

                {/* Smart Insights */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                        <Lightbulb size={16} className="text-yellow-400" /> AI Recommendations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(data.insights || []).map((insight: Insight, i: number) => (
                            <div key={i} className={`p-4 rounded-xl border ${INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.info}`}>
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{insight.emoji}</span>
                                    <div>
                                        <p className="font-semibold text-[var(--text-primary)]">{insight.title}</p>
                                        <p className="text-sm text-[var(--text-muted)] mt-1">{insight.detail}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Day of Week */}
                    <div className="p-5 rounded-xl border border-[var(--border)]">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                            <BarChart3 size={18} className="text-blue-400" /> Revenue by Day
                        </h3>
                        <div className="space-y-2">
                            {(data.dayOfWeek || []).map((day: any, i: number) => {
                                const maxRev = Math.max(...(data.dayOfWeek || []).map((d: any) => d.revenue))
                                const pct = maxRev > 0 ? (day.revenue / maxRev) * 100 : 0
                                return (
                                    <div key={day.day} className="flex items-center gap-3">
                                        <span className="w-24 text-sm text-[var(--text-muted)]">{day.day}</span>
                                        <div className="flex-1 h-6 bg-[var(--surface)] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${i === 0 ? 'bg-green-500' : i === (data.dayOfWeek || []).length - 1 ? 'bg-red-500/60' : 'bg-blue-500/60'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="w-20 text-sm text-right font-medium">${day.revenue.toFixed(0)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Hourly Heatmap */}
                    <div className="p-5 rounded-xl border border-[var(--border)]">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                            <Clock size={18} className="text-purple-400" /> Hourly Sales Heatmap
                        </h3>
                        <div className="grid grid-cols-8 gap-1">
                            {(data.hourlyHeatmap || []).filter((h: any) => h.hour >= 5 && h.hour <= 23).map((h: any) => {
                                const maxRev = Math.max(...(data.hourlyHeatmap || []).map((x: any) => x.revenue))
                                const intensity = maxRev > 0 ? h.revenue / maxRev : 0
                                return (
                                    <div
                                        key={h.hour}
                                        className="aspect-square rounded-lg flex flex-col items-center justify-center text-xs"
                                        style={{
                                            backgroundColor: `rgba(139, 92, 246, ${0.1 + intensity * 0.8})`,
                                        }}
                                        title={`${h.label}: $${h.revenue.toFixed(0)} (${h.transactions} tx)`}
                                    >
                                        <span className="font-bold text-white/90">{h.label}</span>
                                        <span className="text-white/60 text-[10px]">${h.revenue > 999 ? `${(h.revenue / 1000).toFixed(1)}k` : h.revenue.toFixed(0)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Top Sellers */}
                    <div className="p-5 rounded-xl border border-[var(--border)]">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                            <Trophy size={18} className="text-yellow-400" /> Top 10 Products
                        </h3>
                        <div className="space-y-2">
                            {(data.topSellers || []).map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <span className={`w-6 text-center font-bold ${i < 3 ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`}>
                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                    </span>
                                    <span className="flex-1 truncate text-[var(--text-primary)]">{p.name}</span>
                                    <span className="text-[var(--text-muted)]">{p.unitsSold} sold</span>
                                    <span className="text-green-400 font-medium w-20 text-right">${p.revenue.toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Slow Movers */}
                    <div className="p-5 rounded-xl border border-[var(--border)]">
                        <h3 className="font-semibold flex items-center gap-2 mb-4">
                            <Package size={18} className="text-red-400" /> Slow Movers (Review)
                        </h3>
                        <div className="space-y-2">
                            {(data.slowMovers || []).map((p: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <span className="text-red-400">⚠️</span>
                                    <span className="flex-1 truncate text-[var(--text-primary)]">{p.name}</span>
                                    <span className="text-red-400 text-xs">{p.unitsSold} sold in 30d</span>
                                    <span className="text-[var(--text-muted)] w-16 text-right">${p.revenue.toFixed(0)}</span>
                                </div>
                            ))}
                            {(data.slowMovers || []).length === 0 && (
                                <p className="text-sm text-[var(--text-muted)]">No slow movers — great inventory!</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category Ranking */}
                <div className="p-5 rounded-xl border border-[var(--border)]">
                    <h3 className="font-semibold flex items-center gap-2 mb-4">
                        <BarChart3 size={18} className="text-orange-400" /> Category Revenue
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {(data.categoryRanking || []).map((cat: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-[var(--surface)] text-center">
                                <p className="text-xs text-[var(--text-muted)]">#{i + 1}</p>
                                <p className="font-medium text-sm text-[var(--text-primary)] truncate">{cat.name}</p>
                                <p className="text-green-400 font-bold">${cat.revenue.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
