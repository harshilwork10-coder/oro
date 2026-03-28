'use client';

import { useState } from 'react';
import { DollarSign, ArrowUp, ArrowDown, Percent, Eye, Check, AlertTriangle } from 'lucide-react';

interface PreviewItem {
    itemId: string; name: string; sku: string; category: string;
    oldValue: number; newValue: number; change: number;
}

export default function BulkPriceUpdatePage() {
    const [field, setField] = useState<'price' | 'cost'>('price');
    const [adjustmentType, setAdjustmentType] = useState('PERCENT_INCREASE');
    const [adjustmentValue, setAdjustmentValue] = useState('');
    const [preview, setPreview] = useState<PreviewItem[] | null>(null);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [applied, setApplied] = useState(false);

    const fmt = (n: number) => `$${n.toFixed(2)}`;

    async function handlePreview() {
        if (!adjustmentValue) return;
        setLoading(true); setApplied(false);
        try {
            const res = await fetch('/api/inventory/bulk-price-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adjustmentType, adjustmentValue: Number(adjustmentValue), field, preview: true })
            });
            if (res.ok) {
                const data = await res.json();
                setPreview(data.changes || []);
                setSummary(data);
            }
        } catch { /* ignore */ }
        setLoading(false);
    }

    async function handleApply() {
        if (!adjustmentValue) return;
        setLoading(true);
        try {
            const res = await fetch('/api/inventory/bulk-price-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adjustmentType, adjustmentValue: Number(adjustmentValue), field, preview: false })
            });
            if (res.ok) {
                setApplied(true);
                setPreview(null);
            }
        } catch { /* ignore */ }
        setLoading(false);
    }

    const types = [
        { value: 'PERCENT_INCREASE', label: '% Increase', icon: ArrowUp, color: 'text-emerald-400' },
        { value: 'PERCENT_DECREASE', label: '% Decrease', icon: ArrowDown, color: 'text-red-400' },
        { value: 'FIXED_INCREASE', label: '$ Increase', icon: ArrowUp, color: 'text-emerald-400' },
        { value: 'FIXED_DECREASE', label: '$ Decrease', icon: ArrowDown, color: 'text-red-400' },
        { value: 'SET_MARKUP', label: 'Set Markup %', icon: Percent, color: 'text-blue-400' },
    ];

    return (
        <div className="p-4 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <DollarSign size={28} className="text-[var(--primary)]" />
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Bulk Price Update</h1>
                    <p className="text-sm text-[var(--text-muted)]">Adjust prices or costs across all products</p>
                </div>
            </div>

            {/* Controls */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
                {/* Field toggle */}
                <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Target Field</label>
                    <div className="flex gap-2">
                        <button onClick={() => setField('price')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${field === 'price' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>Retail Price</button>
                        <button onClick={() => setField('cost')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${field === 'cost' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>Cost</button>
                    </div>
                </div>

                {/* Adjustment type */}
                <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">Adjustment Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {types.map(t => (
                            <button key={t.value} onClick={() => setAdjustmentType(t.value)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${adjustmentType === t.value ? 'bg-[var(--primary)] text-white' : 'bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--primary)]'}`}
                            >
                                <t.icon size={14} /> {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Value */}
                <div>
                    <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                        Value {adjustmentType.includes('PERCENT') || adjustmentType === 'SET_MARKUP' ? '(%)' : '($)'}
                    </label>
                    <input
                        type="number" step="0.01" min="0" value={adjustmentValue}
                        onChange={e => setAdjustmentValue(e.target.value)}
                        placeholder="Enter value..."
                        className="w-full max-w-xs px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={handlePreview} disabled={loading || !adjustmentValue}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    ><Eye size={16} /> Preview Changes</button>
                </div>
            </div>

            {/* Applied confirmation */}
            {applied && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <Check size={20} className="text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Changes applied successfully!</span>
                </div>
            )}

            {/* Preview */}
            {preview && preview.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-[var(--text-primary)]">Preview — {summary?.itemsAffected || 0} items affected</h3>
                            <p className="text-sm text-[var(--text-muted)]">Total impact: {fmt(summary?.totalImpact || 0)} per item</p>
                        </div>
                        <button onClick={handleApply} disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50"
                        >
                            <AlertTriangle size={16} /> Apply to All
                        </button>
                    </div>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--background)] text-[var(--text-muted)] sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left">Product</th>
                                    <th className="px-4 py-2 text-left">Category</th>
                                    <th className="px-4 py-2 text-right">Old {field}</th>
                                    <th className="px-4 py-2 text-right">New {field}</th>
                                    <th className="px-4 py-2 text-right">Change</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {preview.map(item => (
                                    <tr key={item.itemId} className="hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-2 text-[var(--text-primary)]">{item.name}</td>
                                        <td className="px-4 py-2 text-[var(--text-muted)]">{item.category || '—'}</td>
                                        <td className="px-4 py-2 text-right text-[var(--text-secondary)]">{fmt(item.oldValue)}</td>
                                        <td className="px-4 py-2 text-right font-medium text-[var(--text-primary)]">{fmt(item.newValue)}</td>
                                        <td className={`px-4 py-2 text-right font-medium ${item.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {item.change >= 0 ? '+' : ''}{fmt(item.change)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {preview && preview.length === 0 && (
                <div className="text-center py-8 text-[var(--text-muted)]">No items would be affected by this change</div>
            )}
        </div>
    );
}
