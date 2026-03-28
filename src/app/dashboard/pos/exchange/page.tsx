'use client';

import { useState } from 'react';
import { ArrowLeftRight, Search, Package, Check, AlertTriangle } from 'lucide-react';

export default function ExchangePage() {
    const [txId, setTxId] = useState('');
    const [originalTx, setOriginalTx] = useState<any>(null);
    const [returnItems, setReturnItems] = useState<{ itemId: string; quantity: number; name: string; price: number }[]>([]);
    const [newItems, setNewItems] = useState<{ itemId: string; quantity: number; price: number; name: string }[]>([]);
    const [newItemSearch, setNewItemSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const fmt = (n: number) => `$${Math.abs(Number(n)).toFixed(2)}`;

    async function lookupTransaction() {
        if (!txId.trim()) return;
        setLoading(true); setError(''); setOriginalTx(null); setReturnItems([]); setNewItems([]); setResult(null);
        try {
            const res = await fetch(`/api/transactions/${txId}`);
            if (res.ok) { setOriginalTx(await res.json()); }
            else setError('Transaction not found');
        } catch { setError('Lookup failed'); }
        setLoading(false);
    }

    async function searchProducts(q: string) {
        setNewItemSearch(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try {
            const res = await fetch(`/api/inventory/products?search=${encodeURIComponent(q)}&take=10`);
            if (res.ok) { const data = await res.json(); setSearchResults(data.data || data.products || []); }
        } catch { /* ignore */ }
    }

    function toggleReturn(item: any) {
        const existing = returnItems.find(r => r.itemId === item.itemId || r.itemId === item.productId);
        if (existing) {
            setReturnItems(returnItems.filter(r => r.itemId !== existing.itemId));
        } else {
            setReturnItems([...returnItems, { itemId: item.itemId || item.productId, quantity: 1, name: item.name, price: Number(item.price || item.unitPrice) }]);
        }
    }

    function addNewItem(product: any) {
        if (newItems.find(n => n.itemId === product.id)) return;
        setNewItems([...newItems, { itemId: product.id, quantity: 1, price: Number(product.price), name: product.name }]);
        setNewItemSearch(''); setSearchResults([]);
    }

    async function processExchange() {
        if (!returnItems.length || !newItems.length) return;
        setLoading(true); setError('');
        try {
            const res = await fetch('/api/pos/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalTransactionId: originalTx.id,
                    returnItems: returnItems.map(r => ({ itemId: r.itemId, quantity: r.quantity })),
                    newItems: newItems.map(n => ({ itemId: n.itemId, quantity: n.quantity, price: n.price })),
                    reason
                })
            });
            if (res.ok) setResult(await res.json());
            else setError((await res.json()).error || 'Exchange failed');
        } catch { setError('Exchange processing failed'); }
        setLoading(false);
    }

    const returnTotal = returnItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const newTotal = newItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const difference = newTotal - returnTotal;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <ArrowLeftRight size={28} className="text-blue-400" />
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Process Exchange</h1>
                    <p className="text-sm text-[var(--text-muted)]">Return items and give replacement products</p>
                </div>
            </div>

            {/* TX Lookup */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input value={txId} onChange={e => setTxId(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookupTransaction()}
                        placeholder="Original Transaction ID..." className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                </div>
                <button onClick={lookupTransaction} disabled={loading} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">Lookup</button>
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}
            {result && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2"><Check size={18} /> Exchange Processed</div>
                    <div className="text-sm text-[var(--text-secondary)]">{result.action}</div>
                </div>
            )}

            {originalTx && !result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Return items */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                        <div className="p-3 border-b border-[var(--border)] bg-red-500/5"><h3 className="font-semibold text-red-400">Items to Return</h3></div>
                        <div className="divide-y divide-[var(--border)]">
                            {(originalTx.lineItems || originalTx.items || []).map((item: any) => {
                                const isSelected = returnItems.find(r => r.itemId === (item.itemId || item.productId));
                                return (
                                    <button key={item.id} onClick={() => toggleReturn(item)} className={`w-full text-left p-3 transition-colors ${isSelected ? 'bg-red-500/10' : 'hover:bg-[var(--surface-hover)]'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-[var(--text-muted)]" />
                                                <span className="text-sm text-[var(--text-primary)]">{item.name || 'Item'}</span>
                                            </div>
                                            <span className="text-sm text-[var(--text-muted)]">{fmt(item.price || item.unitPrice)}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {returnItems.length > 0 && <div className="p-3 bg-red-500/5 text-sm text-red-400">Return credit: {fmt(returnTotal)}</div>}
                    </div>

                    {/* New items */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                        <div className="p-3 border-b border-[var(--border)] bg-emerald-500/5"><h3 className="font-semibold text-emerald-400">New Items</h3></div>
                        <div className="p-3 border-b border-[var(--border)]">
                            <input value={newItemSearch} onChange={e => searchProducts(e.target.value)} placeholder="Search products..."
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--primary)]" />
                            {searchResults.length > 0 && (
                                <div className="mt-2 border border-[var(--border)] rounded-lg max-h-40 overflow-y-auto">
                                    {searchResults.map(p => (
                                        <button key={p.id} onClick={() => addNewItem(p)} className="w-full text-left p-2 text-sm hover:bg-[var(--surface-hover)] flex justify-between">
                                            <span className="text-[var(--text-primary)]">{p.name}</span>
                                            <span className="text-[var(--text-muted)]">{fmt(p.price)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {newItems.map(item => (
                                <div key={item.itemId} className="flex items-center justify-between p-3">
                                    <span className="text-sm text-[var(--text-primary)]">{item.name}</span>
                                    <span className="text-sm text-[var(--text-muted)]">{fmt(item.price)}</span>
                                </div>
                            ))}
                        </div>
                        {newItems.length > 0 && <div className="p-3 bg-emerald-500/5 text-sm text-emerald-400">New total: {fmt(newTotal)}</div>}
                    </div>
                </div>
            )}

            {originalTx && !result && (returnItems.length > 0 || newItems.length > 0) && (
                <div className="flex items-center justify-between p-4 border border-[var(--border)] bg-[var(--surface)] rounded-xl">
                    <div>
                        <div className="text-sm text-[var(--text-muted)]">Difference</div>
                        <div className={`text-lg font-bold ${difference > 0 ? 'text-amber-400' : difference < 0 ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                            {difference > 0 ? `Customer owes ${fmt(difference)}` : difference < 0 ? `Refund ${fmt(difference)}` : 'Even exchange'}
                        </div>
                    </div>
                    <button onClick={processExchange} disabled={loading || !returnItems.length || !newItems.length}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50">
                        Process Exchange
                    </button>
                </div>
            )}
        </div>
    );
}
