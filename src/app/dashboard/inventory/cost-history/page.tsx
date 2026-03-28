'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Search } from 'lucide-react';

export default function CostHistoryPage() {
    const [search, setSearch] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    async function searchHistory(q: string) {
        setSearch(q);
        if (q.length < 2) { setHistory([]); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/inventory/product-history?search=${encodeURIComponent(q)}&type=COST_CHANGE`);
            if (res.ok) { const d = await res.json(); setHistory(d.history || d.data || d.changes || []); }
        } catch {}
        setLoading(false);
    }

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3"><DollarSign size={28} className="text-emerald-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Product Cost History</h1><p className="text-sm text-[var(--text-muted)]">Track cost changes over time</p></div></div>

            <div className="relative"><Search size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" /><input value={search} onChange={e => searchHistory(e.target.value)} placeholder="Search product..." className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" /></div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Searching...</div> : !history.length ? (
                search.length >= 2 ? <div className="p-8 text-center text-[var(--text-muted)]">No cost history found</div> : <div className="p-12 text-center text-[var(--text-muted)]"><DollarSign size={48} className="mx-auto mb-3 opacity-30" /><p>Search for a product to view cost history</p></div>
            ) : (
                <div className="space-y-2">{history.map((h: any, i: number) => {
                    const oldCost = Number(h.oldCost || h.previousCost || 0), newCost = Number(h.newCost || h.currentCost || 0);
                    const increased = newCost > oldCost;
                    return (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                            <div><div className="text-sm font-medium text-[var(--text-primary)]">{h.productName || h.name || 'Product'}</div><div className="text-xs text-[var(--text-muted)]">{new Date(h.createdAt || h.changedAt).toLocaleString()}{h.source && ` • ${h.source}`}</div></div>
                            <div className="flex items-center gap-3">{increased ? <TrendingUp size={14} className="text-red-400" /> : <TrendingDown size={14} className="text-emerald-400" />}<span className="text-sm text-[var(--text-muted)]">{fmt(oldCost)}</span><span className="text-[var(--text-muted)]">→</span><span className={`text-sm font-medium ${increased ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(newCost)}</span></div>
                        </div>
                    );
                })}</div>
            )}
        </div>
    );
}
