'use client';

import { useState, useEffect } from 'react';
import { Layers, Plus, X, Search, Package } from 'lucide-react';

export default function MixMatchPage() {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', triggerQty: '3', dealPrice: '', startDate: '', endDate: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetch_data() { try { const res = await fetch('/api/pos/mix-match'); if (res.ok) { const d = await res.json(); setRules(d.rules || d.data || []); } } catch {} setLoading(false); }
        fetch_data();
    }, []);

    async function handleCreate() {
        if (!form.name || !form.dealPrice) return;
        setSaving(true);
        try { const res = await fetch('/api/pos/mix-match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, triggerQty: Number(form.triggerQty), dealPrice: Number(form.dealPrice) }) }); if (res.ok) { setShowCreate(false); setForm({ name: '', triggerQty: '3', dealPrice: '', startDate: '', endDate: '' }); const r = await fetch('/api/pos/mix-match'); if (r.ok) { const d = await r.json(); setRules(d.rules || d.data || []); } } } catch {}
        setSaving(false);
    }

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Layers size={28} className="text-purple-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Mix &amp; Match Pricing</h1><p className="text-sm text-[var(--text-muted)]">Buy X items for $Y — group pricing rules</p></div></div>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"><Plus size={16} /> New Rule</button>
            </div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : !rules.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Layers size={48} className="mx-auto mb-3 opacity-30" /><p>No mix &amp; match rules</p></div>
            ) : (
                <div className="space-y-3">{rules.map((r: any, i: number) => (
                    <div key={r.id || i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex items-center justify-between">
                            <div><div className="text-sm font-medium text-[var(--text-primary)]">{r.name}</div><div className="text-xs text-[var(--text-muted)]">Buy {r.triggerQty || r.quantity} for {fmt(r.dealPrice || r.price)} {r.startDate ? `• ${new Date(r.startDate).toLocaleDateString()} — ${r.endDate ? new Date(r.endDate).toLocaleDateString() : 'Ongoing'}` : ''}</div></div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${r.isActive !== false ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-muted)]'}`}>{r.isActive !== false ? 'Active' : 'Inactive'}</span>
                        </div>
                        {r.products?.length > 0 && <div className="text-xs text-[var(--text-muted)] mt-2">{r.products.length} products in group</div>}
                    </div>
                ))}</div>
            )}

            {showCreate && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">New Mix &amp; Match Rule</h2><button onClick={() => setShowCreate(false)}><X size={20} className="text-[var(--text-muted)]" /></button></div>
                        <div className="space-y-3">
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rule name (e.g. 'Any 3 Sodas')" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" />
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="text-xs text-[var(--text-muted)] block mb-1">Buy Qty</label><input type="number" min="2" value={form.triggerQty} onChange={e => setForm({ ...form, triggerQty: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" /></div>
                                <div><label className="text-xs text-[var(--text-muted)] block mb-1">For Price ($)</label><input type="number" step="0.01" min="0" value={form.dealPrice} onChange={e => setForm({ ...form, dealPrice: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2"><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} placeholder="Start" className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" /><input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} placeholder="End" className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" /></div>
                            <button onClick={handleCreate} disabled={saving || !form.name || !form.dealPrice} className="w-full py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">{saving ? 'Creating...' : 'Create Rule'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
