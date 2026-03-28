'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Search, ArrowRight, Check, Copy, RefreshCw } from 'lucide-react';

interface DuplicateGroup {
    barcode: string;
    count: number;
    items: { id: string; name: string; sku: string; price: number; stock: number; isActive: boolean; lastUpdated: string }[];
}

export default function DuplicateUpcPage() {
    const [itemDuplicates, setItemDuplicates] = useState<DuplicateGroup[]>([]);
    const [productDuplicates, setProductDuplicates] = useState<DuplicateGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [merging, setMerging] = useState<string | null>(null);
    const [mergeSuccess, setMergeSuccess] = useState<string | null>(null);

    async function fetchDuplicates() {
        setLoading(true);
        try {
            const res = await fetch('/api/inventory/duplicate-upc');
            if (res.ok) {
                const data = await res.json();
                setItemDuplicates(data.itemDuplicates || []);
                setProductDuplicates(data.productDuplicates || []);
            }
        } catch { /* ignore */ }
        setLoading(false);
    }

    useEffect(() => { fetchDuplicates(); }, []);

    async function handleMerge(sourceId: string, targetId: string, model: 'item' | 'product') {
        setMerging(sourceId);
        try {
            const res = await fetch('/api/inventory/duplicate-upc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceId, targetId, model })
            });
            if (res.ok) {
                setMergeSuccess(sourceId);
                setTimeout(() => { setMergeSuccess(null); fetchDuplicates(); }, 1500);
            }
        } catch { /* ignore */ }
        setMerging(null);
    }

    const fmt = (n: number) => `$${Number(n || 0).toFixed(2)}`;
    const totalGroups = itemDuplicates.length + productDuplicates.length;

    function renderGroup(group: DuplicateGroup, model: 'item' | 'product') {
        return (
            <div key={`${model}-${group.barcode}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="p-3 bg-amber-500/5 border-b border-[var(--border)] flex items-center gap-2">
                    <Copy size={14} className="text-amber-400" />
                    <span className="font-mono text-sm text-amber-400">{group.barcode}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-2">{group.count} duplicates • {model}</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {group.items.map((item, i) => (
                        <div key={item.id} className="flex items-center justify-between p-3 hover:bg-[var(--surface-hover)]">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</span>
                                    {!item.isActive && <span className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">Inactive</span>}
                                </div>
                                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                                    SKU: {item.sku || '—'} • Price: {fmt(item.price)} • Stock: {item.stock}
                                </div>
                            </div>
                            {i > 0 && (
                                <div className="flex items-center gap-2 ml-3">
                                    {mergeSuccess === item.id ? (
                                        <span className="text-xs text-emerald-400 flex items-center gap-1"><Check size={14} /> Merged</span>
                                    ) : (
                                        <button
                                            onClick={() => handleMerge(item.id, group.items[0].id, model)}
                                            disabled={merging === item.id}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 transition-colors"
                                        >
                                            <ArrowRight size={12} /> Merge into #{1}
                                        </button>
                                    )}
                                </div>
                            )}
                            {i === 0 && (
                                <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full ml-3">Keep</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle size={28} className="text-amber-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Duplicate UPC Detection</h1>
                        <p className="text-sm text-[var(--text-muted)]">Find and merge items with duplicate barcodes</p>
                    </div>
                </div>
                <button onClick={fetchDuplicates} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Rescan
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-2xl font-bold text-[var(--text-primary)]">{totalGroups}</div>
                    <div className="text-sm text-[var(--text-muted)]">Duplicate Groups</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-2xl font-bold text-amber-400">{itemDuplicates.length}</div>
                    <div className="text-sm text-[var(--text-muted)]">Item Duplicates</div>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="text-2xl font-bold text-blue-400">{productDuplicates.length}</div>
                    <div className="text-sm text-[var(--text-muted)]">Product Duplicates</div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Scanning for duplicates...</div>
            ) : totalGroups === 0 ? (
                <div className="text-center py-12">
                    <Check size={48} className="mx-auto mb-3 text-emerald-400" />
                    <p className="text-[var(--text-primary)] font-medium">No duplicate barcodes found</p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Your catalog is clean</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {itemDuplicates.map(g => renderGroup(g, 'item'))}
                    {productDuplicates.map(g => renderGroup(g, 'product'))}
                </div>
            )}
        </div>
    );
}
