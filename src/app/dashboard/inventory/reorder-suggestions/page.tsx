'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Package, Clock, AlertCircle } from 'lucide-react';

export default function ReorderSuggestionsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch_data() {
            try { const res = await fetch('/api/inventory/reorder-suggestions'); if (res.ok) setData(await res.json()); } catch {}
            setLoading(false);
        }
        fetch_data();
    }, []);

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3"><TrendingUp size={28} className="text-emerald-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Reorder Suggestions</h1><p className="text-sm text-[var(--text-muted)]">AI-powered recommendations based on sales velocity</p></div></div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Analyzing sales data...</div> : !data?.suggestions?.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Package size={48} className="mx-auto mb-3 opacity-30" /><p>No reorder suggestions at this time</p></div>
            ) : (
                <div className="space-y-3">{data.suggestions.map((s: any, i: number) => (
                    <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-[var(--text-primary)]">{s.name || s.itemName}</div>
                            <div className="flex items-center gap-2">
                                {s.daysUntilStockout != null && <span className={`text-xs px-2 py-0.5 rounded-full ${s.daysUntilStockout <= 3 ? 'text-red-400 bg-red-500/10' : s.daysUntilStockout <= 7 ? 'text-amber-400 bg-amber-500/10' : 'text-blue-400 bg-blue-500/10'}`}>{s.daysUntilStockout}d until stockout</span>}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                            <div><span className="text-[var(--text-muted)]">Stock</span><div className="font-medium text-[var(--text-primary)]">{s.currentStock ?? s.stock ?? '—'}</div></div>
                            <div><span className="text-[var(--text-muted)]">Daily Avg</span><div className="font-medium text-[var(--text-primary)]">{s.dailyAvg ?? s.avgDailySales ?? '—'}</div></div>
                            <div><span className="text-[var(--text-muted)]">Suggested Qty</span><div className="font-medium text-emerald-400">{s.suggestedQty ?? s.suggestedOrderQty ?? '—'}</div></div>
                            <div><span className="text-[var(--text-muted)]">Est. Cost</span><div className="font-medium text-[var(--text-primary)]">{fmt(s.estimatedCost || 0)}</div></div>
                        </div>
                    </div>
                ))}</div>
            )}
        </div>
    );
}
