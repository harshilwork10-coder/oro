'use client';

import { useState } from 'react';
import { RotateCcw, Search, Package, CreditCard, Gift, AlertTriangle, Check, DollarSign } from 'lucide-react';

interface OriginalItem {
    id: string; name: string; quantity: number; price: number;
    productId: string | null; serviceId: string | null; type: string;
}

export default function RefundPage() {
    const [txId, setTxId] = useState('');
    const [originalTx, setOriginalTx] = useState<any>(null);
    const [items, setItems] = useState<(OriginalItem & { refundQty: number })[]>([]);
    const [refundMethod, setRefundMethod] = useState('ORIGINAL');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    async function lookupTransaction() {
        if (!txId.trim()) return;
        setLoading(true); setError(''); setOriginalTx(null); setItems([]); setResult(null);
        try {
            const res = await fetch(`/api/transactions/${txId}`);
            if (res.ok) {
                const data = await res.json();
                setOriginalTx(data);
                setItems((data.lineItems || []).map((li: any) => ({
                    ...li, name: li.name || li.productId || li.serviceId || 'Item', refundQty: 0
                })));
            } else { setError('Transaction not found'); }
        } catch { setError('Lookup failed'); }
        setLoading(false);
    }

    async function processRefund() {
        const selectedItems = items.filter(i => i.refundQty > 0);
        if (!selectedItems.length) return;
        setLoading(true); setError('');
        try {
            const isFullRefund = selectedItems.every(i => i.refundQty === i.quantity) && selectedItems.length === items.length;
            const res = await fetch('/api/pos/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalTransactionId: originalTx.id,
                    refundType: isFullRefund ? 'FULL' : 'PARTIAL',
                    items: selectedItems.map(i => ({ lineItemId: i.id, quantity: i.refundQty })),
                    reason: reason || 'Customer request',
                    refundMethod: refundMethod === 'ORIGINAL' ? originalTx.paymentMethod : refundMethod
                })
            });
            if (res.ok) {
                setResult(await res.json());
            } else {
                const data = await res.json();
                setError(data.error || 'Refund failed');
            }
        } catch { setError('Refund processing failed'); }
        setLoading(false);
    }

    const totalRefund = items.reduce((s, i) => s + (i.price * i.refundQty), 0);
    const fmt = (n: number) => `$${Math.abs(Number(n)).toFixed(2)}`;

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <RotateCcw size={28} className="text-red-400" />
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Process Refund</h1>
                    <p className="text-sm text-[var(--text-muted)]">Full or partial refund with store credit option</p>
                </div>
            </div>

            {/* Lookup */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input value={txId} onChange={e => setTxId(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && lookupTransaction()}
                        placeholder="Enter Transaction ID..."
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>
                <button onClick={lookupTransaction} disabled={loading}
                    className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                    Lookup
                </button>
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

            {/* Success */}
            {result && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium mb-2"><Check size={18} /> Refund Processed</div>
                    <div className="text-sm text-[var(--text-secondary)]">
                        Refund ID: {result.id} • Total: {fmt(result.total)}
                        {result.storeCreditCode && <span className="ml-3 text-amber-400">Store Credit: {result.storeCreditCode}</span>}
                    </div>
                </div>
            )}

            {/* Original TX / Item selection */}
            {originalTx && !result && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-[var(--text-muted)]">Transaction</span>
                            <span className="text-[var(--text-primary)] font-mono">{originalTx.id?.slice(-10)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-[var(--text-muted)]">Original Total</span>
                            <span className="text-[var(--text-primary)] font-medium">{fmt(originalTx.total)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                            <span className="text-[var(--text-muted)]">Status</span>
                            <span className={`font-medium ${originalTx.status === 'COMPLETED' ? 'text-emerald-400' : 'text-amber-400'}`}>{originalTx.status}</span>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                        <div className="p-3 border-b border-[var(--border)]">
                            <h3 className="font-semibold text-[var(--text-primary)]">Select items to refund</h3>
                        </div>
                        <div className="divide-y divide-[var(--border)]">
                            {items.map((item, i) => (
                                <div key={item.id} className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3 flex-1">
                                        <Package size={16} className="text-[var(--text-muted)]" />
                                        <div>
                                            <div className="text-sm font-medium text-[var(--text-primary)]">{item.name}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{fmt(item.price)} × {item.quantity}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-[var(--text-muted)]">Refund Qty:</label>
                                        <select value={item.refundQty} onChange={e => {
                                            const newItems = [...items];
                                            newItems[i] = { ...item, refundQty: Number(e.target.value) };
                                            setItems(newItems);
                                        }} className="px-2 py-1 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--text-primary)] text-sm">
                                            {Array.from({ length: item.quantity + 1 }, (_, n) => (
                                                <option key={n} value={n}>{n}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Refund method */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                        <h3 className="font-semibold text-[var(--text-primary)]">Refund Method</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setRefundMethod('ORIGINAL')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${refundMethod === 'ORIGINAL' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                                <CreditCard size={14} /> Original Tender
                            </button>
                            <button onClick={() => setRefundMethod('STORE_CREDIT')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${refundMethod === 'STORE_CREDIT' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                                <Gift size={14} /> Store Credit
                            </button>
                            <button onClick={() => setRefundMethod('CASH')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${refundMethod === 'CASH' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                                <DollarSign size={14} /> Cash
                            </button>
                        </div>
                        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for refund..."
                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]" />
                    </div>

                    {/* Process */}
                    {totalRefund > 0 && (
                        <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                            <div>
                                <div className="text-lg font-bold text-red-400">Refund: {fmt(totalRefund)}</div>
                                <div className="text-xs text-[var(--text-muted)]">{items.filter(i => i.refundQty > 0).length} items selected</div>
                            </div>
                            <button onClick={processRefund} disabled={loading}
                                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50">
                                <AlertTriangle size={16} /> Process Refund
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

