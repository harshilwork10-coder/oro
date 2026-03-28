'use client';

import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, Package, Trash2 } from 'lucide-react';

export default function ExpiryTrackingPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('7');

    async function fetchData() {
        setLoading(true);
        try { const res = await fetch(`/api/inventory/expiry-tracking?days=${filter}`); if (res.ok) { const d = await res.json(); setData(d.items || d.data || []); } } catch {}
        setLoading(false);
    }

    useEffect(() => { fetchData(); }, [filter]);

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Calendar size={28} className="text-red-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Expiry Tracking</h1><p className="text-sm text-[var(--text-muted)]">Items approaching or past expiration date</p></div></div>
                <div className="flex gap-2">{['7', '14', '30', '90'].map(d => (<button key={d} onClick={() => setFilter(d)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === d ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>{d}d</button>))}</div>
            </div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : !data.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Package size={48} className="mx-auto mb-3 opacity-30" /><p>No items expiring in the next {filter} days</p></div>
            ) : (
                <div className="space-y-2">{data.map((item: any, i: number) => {
                    const daysLeft = item.daysUntilExpiry ?? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
                    const expired = daysLeft <= 0;
                    return (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl border bg-[var(--surface)] ${expired ? 'border-red-500/30' : daysLeft <= 3 ? 'border-amber-500/30' : 'border-[var(--border)]'}`}>
                            <div><div className="text-sm font-medium text-[var(--text-primary)]">{item.name || item.productName}</div><div className="text-xs text-[var(--text-muted)]">Stock: {item.stock ?? item.quantity ?? '—'} • {item.barcode || ''}</div></div>
                            <div className="text-right"><div className={`text-sm font-medium ${expired ? 'text-red-400' : daysLeft <= 3 ? 'text-amber-400' : 'text-[var(--text-primary)]'}`}>{expired ? 'EXPIRED' : `${daysLeft}d left`}</div><div className="text-xs text-[var(--text-muted)]">{new Date(item.expiryDate).toLocaleDateString()}</div></div>
                        </div>
                    );
                })}</div>
            )}
        </div>
    );
}
