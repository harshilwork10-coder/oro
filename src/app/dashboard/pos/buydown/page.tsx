'use client';

import { useState, useEffect } from 'react';
import { Tag, Plus, Search, Package, X } from 'lucide-react';

export default function BuydownPage() {
    const [buydowns, setBuydowns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [form, setForm] = useState({ productId: '', productName: '', manufacturer: '', buydownAmount: '', startDate: '', endDate: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetch_data() {
            try { const res = await fetch('/api/pos/buydown'); if (res.ok) { const d = await res.json(); setBuydowns(d.buydowns || d.data || []); } } catch {}
            setLoading(false);
        }
        fetch_data();
    }, []);

    async function searchProducts(q: string) {
        setProductSearch(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try { const res = await fetch(`/api/inventory/products?search=${encodeURIComponent(q)}&take=10`); if (res.ok) { const d = await res.json(); setSearchResults(d.data || d.products || []); } } catch {}
    }

    async function handleCreate() {
        if (!form.productId || !form.buydownAmount) return;
        setSaving(true);
        try {
            const res = await fetch('/api/pos/buydown', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, buydownAmount: Number(form.buydownAmount) }) });
            if (res.ok) { setShowCreate(false); setForm({ productId: '', productName: '', manufacturer: '', buydownAmount: '', startDate: '', endDate: '' }); const r = await fetch('/api/pos/buydown'); if (r.ok) { const d = await r.json(); setBuydowns(d.buydowns || d.data || []); } }
        } catch {}
        setSaving(false);
    }

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Tag size={28} className="text-emerald-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Buydown / Manufacturer Promos</h1><p className="text-sm text-[var(--text-muted)]">Manufacturer-funded price reductions at POS</p></div></div>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"><Plus size={16} /> New Buydown</button>
            </div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : !buydowns.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Tag size={48} className="mx-auto mb-3 opacity-30" /><p>No buydowns configured</p></div>
            ) : (
                <div className="space-y-2">{buydowns.map((b: any, i: number) => (
                    <div key={b.id || i} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <div><div className="text-sm font-medium text-[var(--text-primary)]">{b.productName || b.product?.name || 'Product'}</div><div className="text-xs text-[var(--text-muted)]">{b.manufacturer || '—'}{b.startDate ? ` • ${new Date(b.startDate).toLocaleDateString()} – ${b.endDate ? new Date(b.endDate).toLocaleDateString() : 'Ongoing'}` : ''}</div></div>
                        <div className="text-right"><div className="text-sm font-bold text-emerald-400">-{fmt(b.buydownAmount || b.amount || 0)}</div><span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive !== false ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-muted)]'}`}>{b.isActive !== false ? 'Active' : 'Inactive'}</span></div>
                    </div>
                ))}</div>
            )}

            {showCreate && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">New Buydown</h2><button onClick={() => setShowCreate(false)}><X size={20} className="text-[var(--text-muted)]" /></button></div>
                        <div className="space-y-3">
                            <input value={productSearch} onChange={e => searchProducts(e.target.value)} placeholder="Search product..." className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" />
                            {searchResults.length > 0 && <div className="border border-[var(--border)] rounded-lg max-h-24 overflow-y-auto">{searchResults.map(p => (<button key={p.id} onClick={() => { setForm({ ...form, productId: p.id, productName: p.name }); setProductSearch(p.name); setSearchResults([]); }} className="w-full text-left p-2 text-sm hover:bg-[var(--surface-hover)] text-[var(--text-primary)]">{p.name}</button>))}</div>}
                            <input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} placeholder="Manufacturer" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" />
                            <input type="number" step="0.01" min="0" value={form.buydownAmount} onChange={e => setForm({ ...form, buydownAmount: e.target.value })} placeholder="Buydown amount ($)" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" />
                            <div className="grid grid-cols-2 gap-2"><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" /><input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" /></div>
                            <button onClick={handleCreate} disabled={saving || !form.productId || !form.buydownAmount} className="w-full py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">{saving ? 'Creating...' : 'Create Buydown'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
