'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, ArrowRightLeft, ShoppingBasket, Target, Lightbulb, Package } from 'lucide-react';

const TREND_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
    GROWING: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400', icon: TrendingUp },
    DECLINING: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: TrendingDown },
    STABLE: { bg: 'bg-stone-500/10 border-stone-500/30', text: 'text-stone-400', icon: ArrowRightLeft },
    NEW: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', icon: TrendingUp },
    GONE: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-500', icon: TrendingDown },
};

export default function RevenueIntelligencePage() {
    const [shifts, setShifts] = useState<any>(null);
    const [basket, setBasket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'shifts' | 'basket' | 'placement'>('shifts');

    useEffect(() => {
        Promise.all([
            fetch('/api/analytics/category-shifts').then(r => r.json()),
            fetch('/api/analytics/market-basket').then(r => r.json()),
        ]).then(([s, b]) => {
            setShifts(s);
            setBasket(b);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
                <div className="text-center">
                    <BarChart3 size={48} className="mx-auto mb-4 text-orange-400 animate-pulse" />
                    <p className="text-[var(--text-muted)]">Analyzing revenue patterns...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Target size={28} className="text-orange-400" />
                    <div>
                        <h1 className="text-2xl font-bold">Revenue Intelligence</h1>
                        <p className="text-sm text-[var(--text-muted)]">Category trends, buyer patterns, and placement optimization</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                    {[
                        { id: 'shifts', label: '📈 Category Shifts', icon: TrendingUp },
                        { id: 'basket', label: '🛒 Basket Analysis', icon: ShoppingBasket },
                        { id: 'placement', label: '🎯 Shelf Placement', icon: Target },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-orange-600 text-white' : 'bg-[var(--surface)] text-[var(--text-muted)] hover:text-white'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ─── TAB: Category Shifts ─── */}
                {tab === 'shifts' && shifts && (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <p className="text-xs text-[var(--text-muted)]">Total Revenue</p>
                                <p className="text-xl font-black">${shifts.totalRevenue?.current?.toLocaleString()}</p>
                                <p className={`text-sm ${shifts.totalRevenue?.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {shifts.totalRevenue?.change >= 0 ? '+' : ''}{shifts.totalRevenue?.change}%
                                </p>
                            </div>
                            <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/5">
                                <p className="text-xs text-green-400">Growing</p>
                                <p className="text-xl font-black text-green-400">{shifts.summary?.growing}</p>
                                <p className="text-sm text-[var(--text-muted)]">{shifts.summary?.topGrowing}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                                <p className="text-xs text-red-400">Declining</p>
                                <p className="text-xl font-black text-red-400">{shifts.summary?.declining}</p>
                                <p className="text-sm text-[var(--text-muted)]">{shifts.summary?.topDeclining}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <p className="text-xs text-[var(--text-muted)]">Stable</p>
                                <p className="text-xl font-black">{shifts.summary?.stable}</p>
                                <p className="text-sm text-[var(--text-muted)]">categories</p>
                            </div>
                        </div>

                        {/* Actions */}
                        {shifts.actions?.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                                    <Lightbulb size={14} className="text-yellow-400" /> Recommended Actions
                                </h3>
                                {shifts.actions.map((a: any, i: number) => (
                                    <div key={i} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
                                        <span className="text-xl">{a.emoji}</span>
                                        <div>
                                            <p className="font-semibold text-sm">{a.action}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{a.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Category Table */}
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--surface)]">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-[var(--text-muted)]">Category</th>
                                        <th className="text-right px-3 py-3 text-[var(--text-muted)]">Revenue</th>
                                        <th className="text-right px-3 py-3 text-[var(--text-muted)]">Change</th>
                                        <th className="text-right px-3 py-3 text-[var(--text-muted)]">Share</th>
                                        <th className="text-center px-3 py-3 text-[var(--text-muted)]">Trend</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(shifts.categories || []).map((cat: any, i: number) => {
                                        const tc = TREND_COLORS[cat.trend] || TREND_COLORS.STABLE;
                                        const Icon = tc.icon;
                                        return (
                                            <tr key={i} className="border-t border-[var(--border)]">
                                                <td className="px-4 py-2.5 font-medium">{cat.category}</td>
                                                <td className="px-3 py-2.5 text-right">${cat.currentRevenue.toLocaleString()}</td>
                                                <td className={`px-3 py-2.5 text-right font-medium ${tc.text}`}>
                                                    {cat.revenueChange > 0 ? '+' : ''}{cat.revenueChange}%
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-[var(--text-muted)]">
                                                    {cat.shareOfWallet}%
                                                    {cat.shareChange !== 0 && (
                                                        <span className={`ml-1 text-xs ${cat.shareChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            ({cat.shareChange > 0 ? '+' : ''}{cat.shareChange}%)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                                                        <Icon size={10} /> {cat.trend}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ─── TAB: Basket Analysis ─── */}
                {tab === 'basket' && basket && (
                    <div className="space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <p className="text-xs text-[var(--text-muted)]">Total Transactions</p>
                                <p className="text-xl font-black">{basket.basketStats?.totalTransactions?.toLocaleString()}</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <p className="text-xs text-[var(--text-muted)]">Multi-Item Baskets</p>
                                <p className="text-xl font-black">{basket.basketStats?.multiItemPercent}%</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <p className="text-xs text-[var(--text-muted)]">Avg Basket Size</p>
                                <p className="text-xl font-black">{basket.basketStats?.avgBasketSize} items</p>
                            </div>
                            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                                <p className="text-xs text-[var(--text-muted)]">Top Pairs Found</p>
                                <p className="text-xl font-black">{basket.topPairs?.length}</p>
                            </div>
                        </div>

                        {/* Top Pairs */}
                        <div className="p-5 rounded-xl border border-[var(--border)]">
                            <h3 className="font-semibold flex items-center gap-2 mb-4">
                                <ShoppingBasket size={18} className="text-blue-400" /> Frequently Bought Together
                            </h3>
                            <div className="space-y-2">
                                {(basket.topPairs || []).slice(0, 15).map((pair: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-[var(--surface)]">
                                        <span className="text-[var(--text-muted)] w-6 text-right">#{i + 1}</span>
                                        <span className="flex-1">
                                            <span className="font-medium">{pair.productA}</span>
                                            <span className="text-orange-400 mx-2">+</span>
                                            <span className="font-medium">{pair.productB}</span>
                                        </span>
                                        <span className="text-[var(--text-muted)] text-xs">{pair.frequency}x</span>
                                        {pair.crossCategory && (
                                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">cross-category</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Category Affinities */}
                        <div className="p-5 rounded-xl border border-[var(--border)]">
                            <h3 className="font-semibold flex items-center gap-2 mb-4">
                                <ArrowRightLeft size={18} className="text-purple-400" /> Category Affinities (Lift Score)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {(basket.categoryAffinities || []).map((aff: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-[var(--surface)]">
                                        <span className="font-medium flex-1">{aff.categoryA} × {aff.categoryB}</span>
                                        <span className={`font-bold ${aff.lift > 2 ? 'text-green-400' : aff.lift > 1 ? 'text-blue-400' : 'text-[var(--text-muted)]'}`}>
                                            {aff.lift}x lift
                                        </span>
                                        <span className="text-[var(--text-muted)] text-xs">{aff.percentage}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── TAB: Placement ─── */}
                {tab === 'placement' && (
                    <div className="space-y-4">
                        <div className="p-5 rounded-xl border border-[var(--border)]">
                            <h3 className="font-semibold flex items-center gap-2 mb-4">
                                <Target size={18} className="text-orange-400" /> Smart Shelf Placement Suggestions
                            </h3>
                            <p className="text-sm text-[var(--text-muted)] mb-4">
                                Based on your actual sales data — which products and categories to place together for maximum sales.
                            </p>

                            {/* From basket analysis */}
                            <div className="space-y-3">
                                {(basket?.placementSuggestions || []).map((s: any, i: number) => (
                                    <div key={`b-${i}`} className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                                        <div className="flex items-start gap-3">
                                            <Package size={18} className="text-blue-400 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-sm">{s.suggestion}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">{s.reason}</p>
                                                <p className="text-xs text-blue-400 mt-1">{s.impact}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* From category shifts */}
                                {(shifts?.actions || []).map((a: any, i: number) => (
                                    <div key={`s-${i}`} className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                        <div className="flex items-start gap-3">
                                            <span className="text-xl">{a.emoji}</span>
                                            <div>
                                                <p className="font-semibold text-sm">{a.action}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">{a.detail}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Endcap suggestions */}
                                <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5">
                                    <div className="flex items-start gap-3">
                                        <Target size={18} className="text-green-400 mt-0.5" />
                                        <div>
                                            <p className="font-semibold text-sm">Counter/Endcap Strategy</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                Place your top cross-category pairs at endcaps and near the register.
                                                Items from frequently bought together pairs drive impulse purchases when visually adjacent.
                                            </p>
                                            <div className="mt-2 space-y-1">
                                                {(basket?.topPairs || []).filter((p: any) => p.crossCategory).slice(0, 3).map((p: any, j: number) => (
                                                    <p key={j} className="text-xs text-green-400">
                                                        → {p.productA} near {p.productB} ({p.frequency} co-purchases)
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
