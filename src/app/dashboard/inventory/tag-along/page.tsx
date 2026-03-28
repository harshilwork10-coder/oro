'use client';

import { useState, useEffect } from 'react';
import { Link2, Plus, X, Search, Package } from 'lucide-react';

export default function TagAlongPage() {
    const [pairs, setPairs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [triggerSearch, setTriggerSearch] = useState('');
    const [suggestSearch, setSuggestSearch] = useState('');
    const [triggerResults, setTriggerResults] = useState<any[]>([]);
    const [suggestResults, setSuggestResults] = useState<any[]>([]);
    const [form, setForm] = useState({ triggerItemId: '', triggerName: '', suggestedItemId: '', suggestedName: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetch_data() {
            try { const res = await fetch('/api/inventory/tag-along'); if (res.ok) { const d = await res.json(); setPairs(d.tagAlongs || d.data || []); } } catch {}
            setLoading(false);
        }
        fetch_data();
    }, []);

    async function searchProducts(q: string, type: 'trigger' | 'suggest') {
        if (type === 'trigger') setTriggerSearch(q); else setSuggestSearch(q);
        if (q.length < 2) { type === 'trigger' ? setTriggerResults([]) : setSuggestResults([]); return; }
        try { const res = await fetch(`/api/inventory/products?search=${encodeURIComponent(q)}&take=8`); if (res.ok) { const d = await res.json(); type === 'trigger' ? setTriggerResults(d.data || d.products || []) : setSuggestResults(d.data || d.products || []); } } catch {}
    }

    async function handleCreate() {
        if (!form.triggerItemId || !form.suggestedItemId) return;
        setSaving(true);
        try {
            const res = await fetch('/api/inventory/tag-along', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (res.ok) { setShowAdd(false); setForm({ triggerItemId: '', triggerName: '', suggestedItemId: '', suggestedName: '' }); const r = await fetch('/api/inventory/tag-along'); if (r.ok) { const d = await r.json(); setPairs(d.tagAlongs || d.data || []); } }
        } catch {}
        setSaving(false);
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Link2 size={28} className="text-cyan-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Tag-Along Items</h1><p className="text-sm text-[var(--text-muted)]">When customer buys X, suggest Y</p></div></div>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"><Plus size={16} /> Add Pair</button>
            </div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : !pairs.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Link2 size={48} className="mx-auto mb-3 opacity-30" /><p>No tag-along pairs configured</p></div>
            ) : (
                <div className="space-y-2">{pairs.map((p: any, i: number) => (
                    <div key={p.id || i} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-[var(--text-primary)] font-medium">{p.triggerName || p.triggerItem?.name || 'Trigger'}</span>
                            <span className="text-[var(--text-muted)]">→</span>
                            <span className="text-cyan-400 font-medium">{p.suggestedName || p.suggestedItem?.name || 'Suggested'}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive !== false ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-muted)] bg-[var(--background)]'}`}>{p.isActive !== false ? 'Active' : 'Inactive'}</span>
                    </div>
                ))}</div>
            )}

            {showAdd && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Tag-Along Pair</h2><button onClick={() => setShowAdd(false)}><X size={20} className="text-[var(--text-muted)]" /></button></div>
                        <div className="space-y-3">
                            <div><label className="text-xs text-[var(--text-muted)] block mb-1">When customer buys...</label>
                                <input value={triggerSearch} onChange={e => searchProducts(e.target.value, 'trigger')} placeholder="Search trigger product..." className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm" />
                                {triggerResults.length > 0 && <div className="mt-1 border border-[var(--border)] rounded-lg max-h-24 overflow-y-auto">{triggerResults.map(p => (<button key={p.id} onClick={() => { setForm({ ...form, triggerItemId: p.id, triggerName: p.name }); setTriggerSearch(p.name); setTriggerResults([]); }} className="w-full text-left p-2 text-sm hover:bg-[var(--surface-hover)] text-[var(--text-primary)]">{p.name}</button>))}</div>}
                            </div>
                            <div><label className="text-xs text-[var(--text-muted)] block mb-1">Suggest...</label>
                                <input value={suggestSearch} onChange={e => searchProducts(e.target.value, 'suggest')} placeholder="Search suggested product..." className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm" />
                                {suggestResults.length > 0 && <div className="mt-1 border border-[var(--border)] rounded-lg max-h-24 overflow-y-auto">{suggestResults.map(p => (<button key={p.id} onClick={() => { setForm({ ...form, suggestedItemId: p.id, suggestedName: p.name }); setSuggestSearch(p.name); setSuggestResults([]); }} className="w-full text-left p-2 text-sm hover:bg-[var(--surface-hover)] text-[var(--text-primary)]">{p.name}</button>))}</div>}
                            </div>
                            <button onClick={handleCreate} disabled={saving || !form.triggerItemId || !form.suggestedItemId} className="w-full py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">{saving ? 'Creating...' : 'Create Pair'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
