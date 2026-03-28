'use client';

import { useState, useEffect } from 'react';
import { Handshake, Package, DollarSign } from 'lucide-react';

export default function ConsignmentPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch_data() {
            try { const res = await fetch('/api/inventory/consignment'); if (res.ok) { const d = await res.json(); setData(d.consignments || d.data || []); } } catch {}
            setLoading(false);
        }
        fetch_data();
    }, []);

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3"><Handshake size={28} className="text-indigo-400" /><div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Consignment</h1><p className="text-sm text-[var(--text-muted)]">Track consignment inventory — pay vendors when items sell</p></div></div>

            {loading ? <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div> : !data.length ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><Package size={48} className="mx-auto mb-3 opacity-30" /><p>No consignment items</p></div>
            ) : (
                <div className="space-y-3">{data.map((c: any, i: number) => (
                    <div key={c.id || i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium text-[var(--text-primary)]">{c.vendorName || c.vendor?.name || 'Vendor'}</div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-muted)] bg-[var(--background)]'}`}>{c.status || 'ACTIVE'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div><span className="text-[var(--text-muted)]">Items</span><div className="font-medium text-[var(--text-primary)]">{c.totalItems || c.items?.length || 0}</div></div>
                            <div><span className="text-[var(--text-muted)]">Sold</span><div className="font-medium text-emerald-400">{c.soldCount || 0}</div></div>
                            <div><span className="text-[var(--text-muted)]">Owed</span><div className="font-medium text-amber-400">{fmt(c.amountOwed || 0)}</div></div>
                        </div>
                    </div>
                ))}</div>
            )}
        </div>
    );
}
