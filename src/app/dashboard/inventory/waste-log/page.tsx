'use client';

import { useState, useEffect } from 'react';
import { Trash2, Search, Plus, Package, AlertTriangle } from 'lucide-react';
import { ADJUSTMENT_REASON_CODES } from '@/lib/constants/reason-codes';

export default function WasteLogPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [form, setForm] = useState({ itemId: '', itemName: '', quantity: 1, reason: '', notes: '', costPerUnit: 0 });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetch_data() {
            try { const res = await fetch('/api/inventory/waste-log'); if (res.ok) { const d = await res.json(); setLogs(d.logs || d.data || []); } } catch {}
            setLoading(false);
        }
        fetch_data();
    }, []);

    async function searchProducts(q: string) {
        setProductSearch(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try { const res = await fetch(`/api/inventory/products?search=${encodeURIComponent(q)}&take=10`); if (res.ok) { const d = await res.json(); setSearchResults(d.data || d.products || []); } } catch {}
    }

    async function handleSubmit() {
        if (!form.itemId || !form.reason) return;
        setSaving(true);
        try {
            const res = await fetch('/api/inventory/waste-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (res.ok) { setShowAdd(false); setForm({ itemId: '', itemName: '', quantity: 1, reason: '', notes: '', costPerUnit: 0 }); const r = await fetch('/api/inventory/waste-log'); if (r.ok) { const d = await r.json(); setLogs(d.logs || d.data || []); } }
        } catch {}
        setSaving(false);
    }

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
    const wasteReasons = ADJUSTMENT_REASON_CODES.filter(r => ['DAMAGE', 'EXPIRED', 'THEFT', 'WASTE', 'OTHER'].includes(r.code));

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Trash2 size={28} className="text-red-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Waste &amp; Shrink Log</h1><p className="text-sm text-[var(--text-muted)]">Record waste, damage, expired, and theft losses</p></div></div>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90"><Plus size={16} /> Log Waste</button>
            </div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : !logs.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Trash2 size={48} className="mx-auto mb-3 opacity-30" /><p>No waste records</p></div>
            ) : (
                <div className="space-y-2">{logs.map((l: any, i: number) => (
                    <div key={l.id || i} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <div><div className="text-sm font-medium text-[var(--text-primary)]">{l.itemName || l.item?.name || 'Item'}</div><div className="text-xs text-[var(--text-muted)]">{l.reason} • {new Date(l.createdAt).toLocaleDateString()}{l.notes ? ` — ${l.notes}` : ''}</div></div>
                        <div className="text-right"><div className="text-sm font-medium text-red-400">-{l.quantity}</div><div className="text-xs text-[var(--text-muted)]">{fmt(l.costImpact || l.quantity * (l.costPerUnit || 0))} loss</div></div>
                    </div>
                ))}</div>
            )}

            {showAdd && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Log Waste / Loss</h2>
                        <div className="space-y-3">
                            <div className="relative"><input value={productSearch} onChange={e => searchProducts(e.target.value)} placeholder="Search product..." className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                                {searchResults.length > 0 && <div className="absolute z-10 w-full mt-1 border border-[var(--border)] rounded-lg bg-[var(--surface)] max-h-32 overflow-y-auto">{searchResults.map(p => (<button key={p.id} onClick={() => { setForm({ ...form, itemId: p.id, itemName: p.name, costPerUnit: Number(p.cost || 0) }); setProductSearch(p.name); setSearchResults([]); }} className="w-full text-left p-2 text-sm hover:bg-[var(--surface-hover)] text-[var(--text-primary)]">{p.name}</button>))}</div>}
                            </div>
                            <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} placeholder="Quantity" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" />
                            <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]">
                                <option value="">Select reason...</option>
                                {wasteReasons.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                            </select>
                            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" />
                            <button onClick={handleSubmit} disabled={saving || !form.itemId || !form.reason} className="w-full py-2 bg-red-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50">{saving ? 'Recording...' : 'Record Loss'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
