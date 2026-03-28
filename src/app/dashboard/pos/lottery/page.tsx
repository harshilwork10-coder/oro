'use client';

import { useState, useEffect } from 'react';
import { Ticket, Plus, DollarSign, TrendingUp, TrendingDown, X } from 'lucide-react';

export default function LotteryPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ type: 'SALE', amount: '', gameId: '', ticketNumber: '' });
    const [saving, setSaving] = useState(false);

    async function fetchData() { setLoading(true); try { const res = await fetch('/api/pos/lottery-reconciliation'); if (res.ok) setData(await res.json()); } catch {} setLoading(false); }
    useEffect(() => { fetchData(); }, []);

    async function handleSubmit() {
        if (!form.amount) return;
        setSaving(true);
        try { const res = await fetch('/api/pos/lottery-reconciliation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) }); if (res.ok) { setShowAdd(false); setForm({ type: 'SALE', amount: '', gameId: '', ticketNumber: '' }); fetchData(); } } catch {}
        setSaving(false);
    }

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Ticket size={28} className="text-yellow-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Lottery Reconciliation</h1><p className="text-sm text-[var(--text-muted)]">Track sales, payouts, and daily reconciliation</p></div></div>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"><Plus size={16} /> Record</button>
            </div>

            {data?.summary && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Today Sales</div><div className="text-xl font-bold text-emerald-400">{fmt(data.summary.todaySales || 0)}</div></div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Today Payouts</div><div className="text-xl font-bold text-red-400">{fmt(data.summary.todayPayouts || 0)}</div></div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Net Cash</div><div className="text-xl font-bold text-[var(--text-primary)]">{fmt(data.summary.netCash || 0)}</div></div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="text-sm text-[var(--text-muted)]">Variance</div><div className={`text-xl font-bold ${(data.summary.variance || 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(data.summary.variance || 0)}</div></div>
            </div>}

            {!loading && data?.transactions && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="p-3 border-b border-[var(--border)]"><h3 className="font-semibold text-[var(--text-primary)] text-sm">Recent Transactions</h3></div>
                <div className="divide-y divide-[var(--border)]">{data.transactions.slice(0, 20).map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">{t.type === 'SALE' ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-red-400" />}<div><div className="text-sm text-[var(--text-primary)]">{t.type}</div><div className="text-xs text-[var(--text-muted)]">{new Date(t.createdAt).toLocaleString()}</div></div></div>
                        <span className={`font-medium text-sm ${t.type === 'SALE' ? 'text-emerald-400' : 'text-red-400'}`}>{t.type === 'SALE' ? '+' : '-'}{fmt(t.amount)}</span>
                    </div>
                ))}</div>
            </div>}

            {showAdd && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold text-[var(--text-primary)]">Record Lottery</h2><button onClick={() => setShowAdd(false)}><X size={20} className="text-[var(--text-muted)]" /></button></div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">{['SALE', 'PAYOUT'].map(t => (<button key={t} onClick={() => setForm({ ...form, type: t })} className={`px-3 py-2 rounded-lg text-sm ${form.type === t ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>{t}</button>))}</div>
                            <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Amount ($)" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)]" />
                            <button onClick={handleSubmit} disabled={saving || !form.amount} className="w-full py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">{saving ? 'Recording...' : 'Record'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
