'use client';

import { useState, useEffect } from 'react';
import { Gift, Plus, Search, CreditCard, X } from 'lucide-react';

interface StoreCredit { id: string; code: string; initialBalance: number; currentBalance: number; customerId: string | null; createdAt: string; isActive: boolean; notes: string; }

export default function StoreCreditPage() {
    const [credits, setCredits] = useState<StoreCredit[]>([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [lookupCode, setLookupCode] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ amount: '', reason: '', customerId: '', expiresInDays: '' });
    const [saving, setSaving] = useState(false);

    async function fetchCredits(code?: string) {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (code) params.set('code', code);
            const res = await fetch(`/api/pos/store-credit?${params}`);
            if (res.ok) { const d = await res.json(); setCredits(d.credits || []); setTotalBalance(d.totalBalance || 0); }
        } catch { /* ignore */ }
        setLoading(false);
    }

    useEffect(() => { fetchCredits(); }, []);

    async function handleCreate() {
        if (!form.amount) return;
        setSaving(true);
        try {
            const res = await fetch('/api/pos/store-credit', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(form.amount), reason: form.reason || undefined, customerId: form.customerId || undefined, expiresInDays: form.expiresInDays ? Number(form.expiresInDays) : undefined })
            });
            if (res.ok) { setShowCreate(false); setForm({ amount: '', reason: '', customerId: '', expiresInDays: '' }); fetchCredits(); }
        } catch { /* ignore */ }
        setSaving(false);
    }

    const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Gift size={28} className="text-amber-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Store Credits</h1>
                        <p className="text-sm text-[var(--text-muted)]">Issue, lookup, and manage store credits</p>
                    </div>
                </div>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90">
                    <Plus size={16} /> Issue Credit
                </button>
            </div>

            {/* Summary + Lookup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-sm text-[var(--text-muted)]">Total Outstanding</div>
                    <div className="text-2xl font-bold text-amber-400">{fmt(totalBalance)}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-sm text-[var(--text-muted)]">Active Credits</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">{credits.filter(c => c.isActive && Number(c.currentBalance) > 0).length}</div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input value={lookupCode} onChange={e => setLookupCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchCredits(lookupCode)}
                            placeholder="Lookup code SC-..." className="w-full pl-9 pr-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]" />
                    </div>
                    <button onClick={() => fetchCredits(lookupCode)} className="px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Go</button>
                    {lookupCode && <button onClick={() => { setLookupCode(''); fetchCredits(); }} className="text-xs text-[var(--text-muted)]">Clear</button>}
                </div>
            </div>

            {/* Credits list */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>
                ) : credits.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]"><Gift size={40} className="mx-auto mb-3 opacity-30" /><p>No store credits found</p></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--background)] text-[var(--text-muted)]">
                                <tr><th className="px-4 py-2 text-left">Code</th><th className="px-4 py-2 text-right">Initial</th><th className="px-4 py-2 text-right">Balance</th><th className="px-4 py-2 text-left">Notes</th><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-center">Active</th></tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {credits.map(c => (
                                    <tr key={c.id} className="hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-2 font-mono text-amber-400">{c.code}</td>
                                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{fmt(c.initialBalance)}</td>
                                        <td className="px-4 py-2 text-right font-medium text-[var(--text-primary)]">{fmt(c.currentBalance)}</td>
                                        <td className="px-4 py-2 text-[var(--text-muted)] truncate max-w-[200px]">{c.notes || '—'}</td>
                                        <td className="px-4 py-2 text-[var(--text-muted)]">{new Date(c.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 text-center">{c.isActive ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">✗</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Issue Store Credit</h2>
                            <button onClick={() => setShowCreate(false)}><X size={20} className="text-[var(--text-muted)]" /></button>
                        </div>
                        <div className="space-y-3">
                            <input type="number" step="0.01" min="0.01" placeholder="Amount ($) *" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                            <input placeholder="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                            <input placeholder="Customer ID (optional)" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                            <input type="number" placeholder="Expires in days (optional)" value={form.expiresInDays} onChange={e => setForm({ ...form, expiresInDays: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-[var(--text-secondary)]">Cancel</button>
                            <button onClick={handleCreate} disabled={saving || !form.amount} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50">{saving ? 'Issuing...' : 'Issue Credit'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
