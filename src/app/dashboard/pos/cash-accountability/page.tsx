'use client';

import { useState, useEffect } from 'react';
import { DollarSign, AlertTriangle, Check, TrendingDown, TrendingUp, Clock, RefreshCw } from 'lucide-react';

export default function DrawerDiscrepancyPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showCount, setShowCount] = useState(false);
    const [countType, setCountType] = useState<'DRAWER_COUNT' | 'SAFE_COUNT' | 'SAFE_DROP' | 'BANK_DEPOSIT'>('DRAWER_COUNT');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [denominations, setDenominations] = useState({
        pennies: 0, nickels: 0, dimes: 0, quarters: 0,
        ones: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0
    });

    async function fetchData() {
        setLoading(true);
        try {
            const res = await fetch('/api/pos/safe-count?days=7');
            if (res.ok) setData(await res.json());
        } catch { /* ignore */ }
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, []);

    const calcDenomTotal = () => {
        return denominations.pennies * 0.01 + denominations.nickels * 0.05 +
            denominations.dimes * 0.10 + denominations.quarters * 0.25 +
            denominations.ones * 1 + denominations.fives * 5 + denominations.tens * 10 +
            denominations.twenties * 20 + denominations.fifties * 50 + denominations.hundreds * 100;
    };

    async function handleSubmit() {
        const finalAmount = amount ? Number(amount) : calcDenomTotal();
        if (!finalAmount) return;
        setSaving(true);
        try {
            const res = await fetch('/api/pos/safe-count', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: countType, amount: finalAmount, notes, denominations: countType === 'DRAWER_COUNT' ? denominations : undefined })
            });
            if (res.ok) {
                setShowCount(false); setAmount(''); setNotes('');
                setDenominations({ pennies: 0, nickels: 0, dimes: 0, quarters: 0, ones: 0, fives: 0, tens: 0, twenties: 0, fifties: 0, hundreds: 0 });
                fetchData();
            }
        } catch { /* ignore */ }
        setSaving(false);
    }

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
    const actions = [
        { key: 'DRAWER_COUNT' as const, label: 'Count Drawer', color: 'text-blue-400' },
        { key: 'SAFE_COUNT' as const, label: 'Count Safe', color: 'text-emerald-400' },
        { key: 'SAFE_DROP' as const, label: 'Safe Drop', color: 'text-amber-400' },
        { key: 'BANK_DEPOSIT' as const, label: 'Bank Deposit', color: 'text-purple-400' },
    ];

    const denomInputs = [
        { key: 'hundreds' as const, label: '$100', mult: 100 },
        { key: 'fifties' as const, label: '$50', mult: 50 },
        { key: 'twenties' as const, label: '$20', mult: 20 },
        { key: 'tens' as const, label: '$10', mult: 10 },
        { key: 'fives' as const, label: '$5', mult: 5 },
        { key: 'ones' as const, label: '$1', mult: 1 },
        { key: 'quarters' as const, label: '25¢', mult: 0.25 },
        { key: 'dimes' as const, label: '10¢', mult: 0.10 },
        { key: 'nickels' as const, label: '5¢', mult: 0.05 },
        { key: 'pennies' as const, label: '1¢', mult: 0.01 },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <DollarSign size={28} className="text-[var(--primary)]" />
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cash Accountability</h1>
                        <p className="text-sm text-[var(--text-muted)]">Drawer counts, safe drops, deposits &amp; discrepancy tracking</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><RefreshCw size={18} /></button>
                    <button onClick={() => setShowCount(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90">Record Count</button>
                </div>
            </div>

            {/* Summary cards */}
            {data?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="text-sm text-[var(--text-muted)] mb-1">Last Drawer Count</div>
                        <div className="text-xl font-bold text-[var(--text-primary)]">{data.summary.lastDrawerCount != null ? fmt(data.summary.lastDrawerCount) : '—'}</div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="text-sm text-[var(--text-muted)] mb-1">Last Safe Count</div>
                        <div className="text-xl font-bold text-[var(--text-primary)]">{data.summary.lastSafeCount != null ? fmt(data.summary.lastSafeCount) : '—'}</div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="text-sm text-[var(--text-muted)] mb-1">Total Safe Drops</div>
                        <div className="text-xl font-bold text-amber-400">{fmt(data.summary.totalDrops)}</div>
                    </div>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="text-sm text-[var(--text-muted)] mb-1">Total Deposits</div>
                        <div className="text-xl font-bold text-purple-400">{fmt(data.summary.totalDeposits)}</div>
                    </div>
                </div>
            )}

            {/* History */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border)]"><h3 className="font-semibold text-[var(--text-primary)]">Recent Activity (7 days)</h3></div>
                {loading ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>
                ) : (
                    <div className="divide-y divide-[var(--border)]">
                        {[...(data?.counts || []).map((c: any) => ({ ...c, _type: c.type === 'SAFE' ? 'Safe Count' : 'Drawer Count', _icon: 'count', _color: 'text-blue-400' })),
                          ...(data?.drops || []).map((d: any) => ({ ...d, _type: 'Safe Drop', _icon: 'drop', _color: 'text-amber-400' })),
                          ...(data?.deposits || []).map((d: any) => ({ ...d, _type: 'Bank Deposit', _icon: 'deposit', _color: 'text-purple-400' }))]
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .slice(0, 20)
                            .map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 hover:bg-[var(--surface-hover)]">
                                    <div className="flex items-center gap-3">
                                        <Clock size={14} className={item._color} />
                                        <div>
                                            <div className="text-sm font-medium text-[var(--text-primary)]">{item._type}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">{fmt(item.amount)}</span>
                                </div>
                            ))}
                        {(!data?.counts?.length && !data?.drops?.length && !data?.deposits?.length) && (
                            <div className="p-8 text-center text-[var(--text-muted)]">No cash accountability records in the last 7 days</div>
                        )}
                    </div>
                )}
            </div>

            {/* Count Modal */}
            {showCount && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCount(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Record Count</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                {actions.map(a => (
                                    <button key={a.key} onClick={() => setCountType(a.key)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${countType === a.key ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                                        {a.label}
                                    </button>
                                ))}
                            </div>

                            {countType === 'DRAWER_COUNT' && (
                                <div>
                                    <label className="text-sm text-[var(--text-muted)] mb-2 block">Count by Denomination</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {denomInputs.map(d => (
                                            <div key={d.key} className="flex items-center gap-2">
                                                <span className="text-xs text-[var(--text-muted)] w-10">{d.label}</span>
                                                <input type="number" min="0" value={denominations[d.key]} onChange={e => setDenominations({ ...denominations, [d.key]: Number(e.target.value) })}
                                                    className="flex-1 px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] text-center" />
                                                <span className="text-xs text-[var(--text-muted)] w-16 text-right">{fmt(denominations[d.key] * d.mult)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 p-2 bg-blue-500/10 rounded-lg text-blue-400 text-sm font-medium text-center">
                                        Total: {fmt(calcDenomTotal())}
                                    </div>
                                </div>
                            )}

                            {countType !== 'DRAWER_COUNT' && (
                                <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ($)"
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                            )}

                            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)"
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />

                            <button onClick={handleSubmit} disabled={saving} className="w-full py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                                {saving ? 'Recording...' : 'Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
