'use client';

import { useState } from 'react';
import { Package, Scissors, Search } from 'lucide-react';

export default function CaseBreakPage() {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [caseQty, setCaseQty] = useState(1);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState('');

    async function searchProducts(q: string) {
        setSearch(q);
        if (q.length < 2) { setResults([]); return; }
        try { const res = await fetch(`/api/inventory/products?search=${encodeURIComponent(q)}&take=10`); if (res.ok) { const d = await res.json(); setResults((d.data || d.products || []).filter((p: any) => p.unitsPerCase > 1)); } } catch {}
    }

    async function handleBreak(item: any) {
        if (caseQty < 1) return;
        setProcessing(true); setMessage('');
        try {
            const res = await fetch('/api/inventory/case-break', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: item.id, caseQty })
            });
            if (res.ok) { const d = await res.json(); setMessage(`✓ Broke ${caseQty} case(s) → ${caseQty * (item.unitsPerCase || 1)} singles added`); setSearch(''); setResults([]); }
            else { const d = await res.json(); setMessage(d.error || 'Failed'); }
        } catch { setMessage('Request failed'); }
        setProcessing(false);
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-2xl">
            <div className="flex items-center gap-3"><Scissors size={28} className="text-purple-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Case Break</h1><p className="text-sm text-[var(--text-muted)]">Break cases into individual units</p></div></div>

            {message && <div className={`p-3 rounded-lg text-sm ${message.startsWith('✓') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{message}</div>}

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                <div className="relative"><Search size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" /><input value={search} onChange={e => searchProducts(e.target.value)} placeholder="Search product with case pack..." className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" /></div>
                {results.length > 0 && <div className="space-y-2">{results.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg">
                        <div><div className="text-sm font-medium text-[var(--text-primary)]">{p.name}</div><div className="text-xs text-[var(--text-muted)]">{p.unitsPerCase} units/case • Stock: {p.stock ?? 0}</div></div>
                        <div className="flex items-center gap-2">
                            <input type="number" min="1" value={caseQty} onChange={e => setCaseQty(Number(e.target.value))} className="w-16 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-center text-sm text-[var(--text-primary)]" />
                            <button onClick={() => handleBreak(p)} disabled={processing} className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-50">{processing ? '...' : 'Break'}</button>
                        </div>
                    </div>
                ))}</div>}
            </div>
        </div>
    );
}
