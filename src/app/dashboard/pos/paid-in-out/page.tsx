'use client';

import { useState, useEffect } from 'react';
import { DollarSign, ArrowDownLeft, ArrowUpRight, Clock, Plus, X } from 'lucide-react';

interface PaidActivity {
    id: string; type: string; amount: number; reason: string; note: string | null;
    timestamp: string; employee: { name: string };
}

export default function PaidInOutPage() {
    const [activities, setActivities] = useState<PaidActivity[]>([]);
    const [totalIn, setTotalIn] = useState(0);
    const [totalOut, setTotalOut] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [type, setType] = useState<'PAID_IN' | 'PAID_OUT'>('PAID_IN');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [shiftId, setShiftId] = useState('');
    const [loading, setLoading] = useState(true);

    async function fetchActivities() {
        if (!shiftId) { setLoading(false); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/pos/paid-in-out?shiftId=${shiftId}`);
            if (res.ok) {
                const data = await res.json();
                setActivities(data.activities || []);
                setTotalIn(data.totalIn || 0);
                setTotalOut(data.totalOut || 0);
            }
        } catch { /* ignore */ }
        setLoading(false);
    }

    // Try to get current shift
    useEffect(() => {
        async function getShift() {
            try {
                const res = await fetch('/api/pos/shift?status=OPEN');
                if (res.ok) {
                    const data = await res.json();
                    if (data.session?.id) setShiftId(data.session.id);
                }
            } catch { /* ignore */ }
        }
        getShift();
    }, []);

    useEffect(() => { if (shiftId) fetchActivities(); }, [shiftId]);

    async function handleSubmit() {
        if (!amount || !reason || !shiftId) return;
        setSaving(true);
        try {
            const res = await fetch('/api/pos/paid-in-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, amount: Number(amount), reason, note: note || undefined, cashDrawerSessionId: shiftId })
            });
            if (res.ok) {
                setShowForm(false);
                setAmount(''); setReason(''); setNote('');
                fetchActivities();
            }
        } catch { /* ignore */ }
        setSaving(false);
    }

    const fmt = (n: number) => `$${Math.abs(n).toFixed(2)}`;
    const reasons = type === 'PAID_IN'
        ? ['Vendor Payment Received', 'Customer Tip', 'Returned Change', 'Miscellaneous In', 'Other']
        : ['Vendor Payment', 'Store Supply Run', 'Employee Advance', 'Petty Cash', 'Miscellaneous Out', 'Other'];

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <DollarSign size={28} className="text-[var(--primary)]" />
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Paid In / Paid Out</h1>
                        <p className="text-sm text-[var(--text-muted)]">Record cash added to or removed from the drawer</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(true)} disabled={!shiftId}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                    <Plus size={16} /> Record
                </button>
            </div>

            {!shiftId && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
                    No open shift found. Open a cash drawer session to record paid in/out.
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1"><ArrowDownLeft size={16} />Paid In</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">{fmt(totalIn)}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center gap-2 text-red-400 mb-1"><ArrowUpRight size={16} />Paid Out</div>
                    <div className="text-2xl font-bold text-[var(--text-primary)]">{fmt(totalOut)}</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1"><DollarSign size={16} />Net</div>
                    <div className={`text-2xl font-bold ${totalIn - totalOut >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalIn - totalOut >= 0 ? '+' : '-'}{fmt(totalIn - totalOut)}
                    </div>
                </div>
            </div>

            {/* History */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border)]">
                    <h3 className="font-semibold text-[var(--text-primary)]">Activity History</h3>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>
                ) : activities.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">No paid in/out activity this shift</div>
                ) : (
                    <div className="divide-y divide-[var(--border)]">
                        {activities.map(a => (
                            <div key={a.id} className="flex items-center justify-between p-3 hover:bg-[var(--surface-hover)]">
                                <div className="flex items-center gap-3">
                                    {a.type === 'PAID_IN'
                                        ? <ArrowDownLeft size={16} className="text-emerald-400" />
                                        : <ArrowUpRight size={16} className="text-red-400" />}
                                    <div>
                                        <div className="text-sm font-medium text-[var(--text-primary)]">{a.reason}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{a.employee?.name} • {new Date(a.timestamp).toLocaleTimeString()}</div>
                                    </div>
                                </div>
                                <span className={`font-medium ${a.type === 'PAID_IN' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {a.type === 'PAID_IN' ? '+' : '-'}{fmt(a.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Record Paid In / Out</h2>
                            <button onClick={() => setShowForm(false)}><X size={20} className="text-[var(--text-muted)]" /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button onClick={() => setType('PAID_IN')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'PAID_IN' ? 'bg-emerald-600 text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>Paid In</button>
                                <button onClick={() => setType('PAID_OUT')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === 'PAID_OUT' ? 'bg-red-600 text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>Paid Out</button>
                            </div>
                            <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount ($)" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                            <select value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]">
                                <option value="">Select reason...</option>
                                {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                            <button onClick={handleSubmit} disabled={saving || !amount || !reason} className="w-full py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">{saving ? 'Recording...' : 'Record'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
