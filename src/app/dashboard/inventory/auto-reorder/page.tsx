'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Package, FileText, TrendingDown, Zap } from 'lucide-react';

export default function AutoReorderPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    async function fetchSuggestions() {
        setLoading(true);
        try { const res = await fetch('/api/inventory/auto-reorder'); if (res.ok) setData(await res.json()); } catch {}
        setLoading(false);
    }

    useEffect(() => { fetchSuggestions(); }, []);

    function toggleAll() {
        if (!data?.suggestions) return;
        if (selected.size === data.suggestions.length) setSelected(new Set());
        else setSelected(new Set(data.suggestions.map((s: any) => s.itemId)));
    }

    async function generatePO() {
        if (!selected.size) return;
        setGenerating(true);
        try {
            const items = data.suggestions.filter((s: any) => selected.has(s.itemId)).map((s: any) => ({ itemId: s.itemId, quantity: s.suggestedOrderQty }));
            const res = await fetch('/api/inventory/auto-reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
            if (res.ok) { setSelected(new Set()); fetchSuggestions(); }
        } catch {}
        setGenerating(false);
    }

    const fmt = (n: number) => `$${Number(n).toFixed(2)}`;
    const urgencyColors: Record<string, string> = { CRITICAL: 'text-red-400 bg-red-500/10', HIGH: 'text-amber-400 bg-amber-500/10', NORMAL: 'text-blue-400 bg-blue-500/10' };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Zap size={28} className="text-amber-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Auto-Reorder</h1><p className="text-sm text-[var(--text-muted)]">Items below par level — generate POs automatically</p></div></div>
                <div className="flex gap-2">
                    <button onClick={fetchSuggestions} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><RefreshCw size={18} /></button>
                    {selected.size > 0 && <button onClick={generatePO} disabled={generating} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"><FileText size={16} /> {generating ? 'Creating...' : `Generate PO (${selected.size})`}</button>}
                </div>
            </div>

            {data?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Items to Reorder</div><div className="text-xl font-bold text-[var(--text-primary)]">{data.summary.totalItems}</div></div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Est. Cost</div><div className="text-xl font-bold text-[var(--text-primary)]">{fmt(data.summary.totalEstimatedCost)}</div></div>
                    <div className="rounded-xl border border-red-500/20 bg-[var(--surface)] p-4"><div className="text-sm text-red-400">Critical</div><div className="text-xl font-bold text-red-400">{data.summary.critical}</div></div>
                    <div className="rounded-xl border border-amber-500/20 bg-[var(--surface)] p-4"><div className="text-sm text-amber-400">High</div><div className="text-xl font-bold text-amber-400">{data.summary.high}</div></div>
                </div>
            )}

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : !data?.suggestions?.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Package size={48} className="mx-auto mb-3 opacity-30" /><p>All items are above par level</p></div>
            ) : (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="flex items-center gap-3 p-3 border-b border-[var(--border)]">
                        <input type="checkbox" checked={selected.size === data.suggestions.length} onChange={toggleAll} className="rounded" />
                        <span className="text-sm text-[var(--text-muted)]">{selected.size} selected</span>
                    </div>
                    <div className="divide-y divide-[var(--border)]">{data.suggestions.map((s: any) => (
                        <div key={s.itemId} className="flex items-center gap-3 p-3 hover:bg-[var(--surface-hover)]">
                            <input type="checkbox" checked={selected.has(s.itemId)} onChange={() => { const n = new Set(selected); n.has(s.itemId) ? n.delete(s.itemId) : n.add(s.itemId); setSelected(n); }} className="rounded" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{s.name}</div>
                                <div className="text-xs text-[var(--text-muted)]">{s.category} • {s.barcode || s.sku || '—'}</div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${urgencyColors[s.urgency]}`}>{s.urgency}</span>
                            <div className="text-right text-sm"><div className="text-[var(--text-muted)]">{s.currentStock}/{s.parLevel}</div><div className="text-[var(--text-primary)] font-medium">Order {s.suggestedOrderQty}</div></div>
                            <div className="text-right text-sm text-[var(--text-muted)] w-20">{fmt(s.estimatedCost)}</div>
                        </div>
                    ))}</div>
                </div>
            )}
        </div>
    );
}
