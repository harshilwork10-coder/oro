'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, Clock, DollarSign, Shield } from 'lucide-react';
import { DISCREPANCY_REASON_CODES } from '@/lib/constants/reason-codes';

interface ClosedShift {
    id: string; startTime: string; endTime: string; startingCash: number;
    endingCash: number | null; expectedCash: number | null; variance: number | null;
    status: string; notes: string | null;
    employee: { name: string };
}

export default function DrawerDiscrepancyPage() {
    const [shifts, setShifts] = useState<ClosedShift[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShift, setSelectedShift] = useState<ClosedShift | null>(null);
    const [action, setAction] = useState<'approve' | 'reopen' | null>(null);
    const [reasonCode, setReasonCode] = useState('');
    const [reasonNote, setReasonNote] = useState('');
    const [managerPin, setManagerPin] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function fetchShifts() {
        setLoading(true);
        try {
            const res = await fetch('/api/pos/shift?status=CLOSED&days=7');
            if (res.ok) {
                const data = await res.json();
                setShifts(data.sessions || []);
            }
        } catch { /* ignore */ }
        setLoading(false);
    }

    useEffect(() => { fetchShifts(); }, []);

    async function handleApproveVariance() {
        if (!selectedShift || !reasonCode) return;
        if (reasonCode === 'OTHER' && !reasonNote.trim()) { setError('Note required for "Other"'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/pos/shift/variance-approval', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: selectedShift.id,
                    managerPin: managerPin || undefined,
                    notes: `[${reasonCode}] ${reasonNote}`.trim()
                })
            });
            if (res.ok) { setSelectedShift(null); setAction(null); setReasonCode(''); setReasonNote(''); setManagerPin(''); fetchShifts(); }
            else { const d = await res.json(); setError(d.error || 'Failed'); }
        } catch { setError('Request failed'); }
        setSaving(false);
    }

    async function handleReopenShift() {
        if (!selectedShift || !reasonCode) return;
        if (reasonCode === 'OTHER' && !reasonNote.trim()) { setError('Note required for "Other"'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/pos/shift/reopen', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: selectedShift.id,
                    managerPin: managerPin || undefined,
                    reason: `[${reasonCode}] ${reasonNote}`.trim()
                })
            });
            if (res.ok) { setSelectedShift(null); setAction(null); setReasonCode(''); setReasonNote(''); setManagerPin(''); fetchShifts(); }
            else { const d = await res.json(); setError(d.error || 'Failed'); }
        } catch { setError('Request failed'); }
        setSaving(false);
    }

    const fmt = (n: number | null) => n != null ? `$${Math.abs(Number(n)).toFixed(2)}` : '—';
    const hasVariance = (s: ClosedShift) => s.variance != null && Math.abs(Number(s.variance)) > 0.01;
    const reopenReasons = [
        { code: 'ACCIDENTAL_CLOSE', label: 'Accidental Close' },
        { code: 'MISSED_TRANSACTION', label: 'Missed Transaction' },
        { code: 'CASH_COUNT_ERROR', label: 'Cash Count Error' },
        { code: 'MANAGER_REQUEST', label: 'Manager Request' },
        { code: 'OTHER', label: 'Other (specify)' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <Shield size={28} className="text-amber-400" />
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Drawer Discrepancy &amp; Shift Management</h1>
                    <p className="text-sm text-[var(--text-muted)]">Approve variances, reopen closed shifts (last 7 days)</p>
                </div>
            </div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading shifts...</div> : shifts.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Shield size={48} className="mx-auto mb-3 opacity-30" /><p>No closed shifts in the last 7 days</p></div>
            ) : (
                <div className="space-y-3">
                    {shifts.map(s => {
                        const v = Number(s.variance || 0);
                        const isOver = v > 0.01, isShort = v < -0.01;
                        return (
                            <div key={s.id} className={`rounded-xl border bg-[var(--surface)] p-4 ${isShort ? 'border-red-500/30' : isOver ? 'border-amber-500/30' : 'border-[var(--border)]'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">{s.employee?.name || 'Employee'}</span>
                                        <span className="text-xs text-[var(--text-muted)] ml-3">{new Date(s.startTime).toLocaleDateString()} {new Date(s.startTime).toLocaleTimeString()} — {s.endTime ? new Date(s.endTime).toLocaleTimeString() : '?'}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.notes?.includes('[VARIANCE APPROVED]') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[var(--background)] text-[var(--text-muted)]'}`}>
                                        {s.notes?.includes('[VARIANCE APPROVED]') ? 'Approved' : s.notes?.includes('[REOPENED]') ? 'Reopened' : s.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div><span className="text-[var(--text-muted)]">Starting</span><div className="font-medium text-[var(--text-primary)]">{fmt(s.startingCash)}</div></div>
                                    <div><span className="text-[var(--text-muted)]">Expected</span><div className="font-medium text-[var(--text-primary)]">{fmt(s.expectedCash)}</div></div>
                                    <div><span className="text-[var(--text-muted)]">Counted</span><div className="font-medium text-[var(--text-primary)]">{fmt(s.endingCash)}</div></div>
                                    <div><span className="text-[var(--text-muted)]">Variance</span>
                                        <div className={`font-bold ${isShort ? 'text-red-400' : isOver ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {isShort ? '-' : isOver ? '+' : ''}{fmt(v)}
                                        </div>
                                    </div>
                                </div>
                                {(hasVariance(s) || s.status === 'CLOSED') && !s.notes?.includes('[REOPENED]') && (
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                                        {hasVariance(s) && !s.notes?.includes('[VARIANCE APPROVED]') && (
                                            <button onClick={() => { setSelectedShift(s); setAction('approve'); setReasonCode(''); setReasonNote(''); setManagerPin(''); setError(''); }}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/30">
                                                <Check size={12} /> Approve Variance
                                            </button>
                                        )}
                                        <button onClick={() => { setSelectedShift(s); setAction('reopen'); setReasonCode(''); setReasonNote(''); setManagerPin(''); setError(''); }}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30">
                                            <Clock size={12} /> Reopen Shift
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Action Modal */}
            {selectedShift && action && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setSelectedShift(null); setAction(null); }}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                                {action === 'approve' ? 'Approve Variance' : 'Reopen Shift'}
                            </h2>
                            <button onClick={() => { setSelectedShift(null); setAction(null); }}><X size={20} className="text-[var(--text-muted)]" /></button>
                        </div>

                        {error && <div className="p-2 mb-3 text-sm bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">{error}</div>}

                        <div className="space-y-3">
                            <select value={reasonCode} onChange={e => setReasonCode(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]">
                                <option value="">Select reason...</option>
                                {(action === 'approve' ? DISCREPANCY_REASON_CODES : reopenReasons).map(r => (
                                    <option key={r.code} value={r.code}>{r.label}</option>
                                ))}
                            </select>

                            {reasonCode === 'OTHER' && (
                                <input value={reasonNote} onChange={e => setReasonNote(e.target.value)} placeholder="Specify reason..."
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                            )}

                            <input type="password" value={managerPin} onChange={e => setManagerPin(e.target.value)} placeholder="Manager PIN (if not owner)"
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />

                            <button onClick={action === 'approve' ? handleApproveVariance : handleReopenShift} disabled={saving || !reasonCode}
                                className={`w-full py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 ${action === 'approve' ? 'bg-amber-600' : 'bg-blue-600'}`}>
                                {saving ? 'Processing...' : action === 'approve' ? 'Approve Variance' : 'Reopen Shift'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
