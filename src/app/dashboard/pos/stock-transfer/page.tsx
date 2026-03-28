'use client';

import { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, Truck, Package, Check, Clock, X, Search } from 'lucide-react';

interface Transfer {
    id: string; transferNumber: string; status: string; totalItems: number; totalValue: number;
    createdAt: string; reason: string;
    fromLocation: { name: string }; toLocation: { name: string };
    items: { id: string; itemName: string; quantitySent: number; unitCost: number }[];
}

export default function StockTransferPage() {
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
    const [toLocationId, setToLocationId] = useState('');
    const [reason, setReason] = useState('');
    const [transferItems, setTransferItems] = useState<{ itemId: string; itemName: string; quantitySent: number; unitCost: number }[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    async function fetchTransfers() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            const res = await fetch(`/api/pos/stock-transfer?${params}`);
            if (res.ok) { const d = await res.json(); setTransfers(d.transfers || []); }
        } catch { /* ignore */ }
        setLoading(false);
    }

    useEffect(() => { fetchTransfers(); }, [statusFilter]);
    useEffect(() => {
        async function fetchLocations() {
            try {
                const res = await fetch('/api/locations');
                if (res.ok) { const d = await res.json(); setLocations(d.locations || d || []); }
            } catch { /* ignore */ }
        }
        fetchLocations();
    }, []);

    async function searchProducts(q: string) {
        setProductSearch(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try {
            const res = await fetch(`/api/inventory/products?search=${encodeURIComponent(q)}&take=10`);
            if (res.ok) { const d = await res.json(); setSearchResults(d.data || d.products || []); }
        } catch { /* ignore */ }
    }

    function addItem(product: any) {
        if (transferItems.find(i => i.itemId === product.id)) return;
        setTransferItems([...transferItems, { itemId: product.id, itemName: product.name, quantitySent: 1, unitCost: Number(product.cost || 0) }]);
        setProductSearch(''); setSearchResults([]);
    }

    async function handleCreate() {
        if (!toLocationId || !transferItems.length) return;
        setSaving(true);
        try {
            const res = await fetch('/api/pos/stock-transfer', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toLocationId, reason: reason || 'Stock Balance', items: transferItems })
            });
            if (res.ok) { setShowCreate(false); setTransferItems([]); setToLocationId(''); setReason(''); fetchTransfers(); }
        } catch { /* ignore */ }
        setSaving(false);
    }

    const fmt = (n: number) => `$${Number(n).toFixed(2)}`;
    const statusColors: Record<string, string> = { PENDING: 'text-amber-400 bg-amber-500/10', APPROVED: 'text-blue-400 bg-blue-500/10', SHIPPED: 'text-purple-400 bg-purple-500/10', RECEIVED: 'text-emerald-400 bg-emerald-500/10', CANCELLED: 'text-red-400 bg-red-500/10' };

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ArrowRightLeft size={28} className="text-purple-400" />
                    <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Stock Transfers</h1>
                    <p className="text-sm text-[var(--text-muted)]">Transfer inventory between locations</p></div>
                </div>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90"><Plus size={16} /> New Transfer</button>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
                {['', 'PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED','CANCELLED'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}
                    >{s || 'ALL'}</button>
                ))}
            </div>

            {/* Transfer list */}
            {loading ? (
                <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>
            ) : transfers.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)]"><ArrowRightLeft size={48} className="mx-auto mb-3 opacity-30" /><p>No transfers found</p></div>
            ) : (
                <div className="space-y-3">
                    {transfers.map(t => (
                        <div key={t.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm text-[var(--primary)]">{t.transferNumber}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[t.status] || 'text-[var(--text-muted)]'}`}>{t.status}</span>
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">{new Date(t.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                <span>{t.fromLocation?.name}</span>
                                <Truck size={14} className="text-[var(--text-muted)]" />
                                <span>{t.toLocation?.name}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                                <span>{t.totalItems} items</span>
                                <span>{fmt(t.totalValue)} value</span>
                                <span>{t.reason}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">New Stock Transfer</h2>
                            <button onClick={() => setShowCreate(false)}><X size={20} className="text-[var(--text-muted)]" /></button>
                        </div>
                        <div className="space-y-4">
                            <select value={toLocationId} onChange={e => setToLocationId(e.target.value)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]">
                                <option value="">Select destination location...</option>
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                            <div>
                                <input value={productSearch} onChange={e => searchProducts(e.target.value)} placeholder="Search products to add..." className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]" />
                                {searchResults.length > 0 && (
                                    <div className="mt-1 border border-[var(--border)] rounded-lg max-h-32 overflow-y-auto">
                                        {searchResults.map(p => (
                                            <button key={p.id} onClick={() => addItem(p)} className="w-full text-left p-2 text-sm hover:bg-[var(--surface-hover)] text-[var(--text-primary)]">{p.name}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {transferItems.length > 0 && (
                                <div className="space-y-2">
                                    {transferItems.map((item, i) => (
                                        <div key={item.itemId} className="flex items-center justify-between p-2 bg-[var(--background)] rounded-lg">
                                            <span className="text-sm text-[var(--text-primary)]">{item.itemName}</span>
                                            <div className="flex items-center gap-2">
                                                <input type="number" min="1" value={item.quantitySent} onChange={e => { const newItems = [...transferItems]; newItems[i].quantitySent = Number(e.target.value); setTransferItems(newItems); }}
                                                    className="w-16 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded text-center text-sm text-[var(--text-primary)]" />
                                                <button onClick={() => setTransferItems(transferItems.filter((_, j) => j !== i))}><X size={14} className="text-red-400" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-[var(--text-secondary)]">Cancel</button>
                            <button onClick={handleCreate} disabled={saving || !toLocationId || !transferItems.length} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">{saving ? 'Creating...' : 'Create Transfer'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
