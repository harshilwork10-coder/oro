'use client';

import { useState, useEffect } from 'react';
import { Clock, Package, Check, Truck } from 'lucide-react';

export default function BackorderPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch_data() {
            try { const res = await fetch('/api/inventory/backorder'); if (res.ok) { const d = await res.json(); setData(d.backorders || d.data || []); } } catch {}
            setLoading(false);
        }
        fetch_data();
    }, []);

    const statusColors: Record<string, string> = { PENDING: 'text-amber-400 bg-amber-500/10', ORDERED: 'text-blue-400 bg-blue-500/10', PARTIAL: 'text-purple-400 bg-purple-500/10', RECEIVED: 'text-emerald-400 bg-emerald-500/10', CANCELLED: 'text-red-400 bg-red-500/10' };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3"><Clock size={28} className="text-amber-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Backorders</h1><p className="text-sm text-[var(--text-muted)]">Track items on backorder from suppliers</p></div></div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : !data?.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Package size={48} className="mx-auto mb-3 opacity-30" /><p>No backorders</p></div>
            ) : (
                <div className="space-y-3">{data.map((b: any, i: number) => (
                    <div key={b.id || i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-[var(--text-primary)]">{b.itemName || b.item?.name || b.name || 'Item'}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[b.status] || 'text-[var(--text-muted)]'}`}>{b.status}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                            <span>Qty: {b.quantity || b.quantityOrdered || '—'}</span>
                            {b.expectedDate && <span>ETA: {new Date(b.expectedDate).toLocaleDateString()}</span>}
                            {b.supplier && <span>{b.supplier}</span>}
                        </div>
                    </div>
                ))}</div>
            )}
        </div>
    );
}
