'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Percent, ArrowRight, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';

interface CategoryStat {
    id: string;
    name: string;
    productCount: number;
    priceRange: { min: number; max: number; avg: number } | null;
    avgCost: number | null;
    avgMargin: number | null;
}

interface PreviewProduct {
    id: string;
    name: string;
    barcode: string | null;
    currentPrice: number;
    newPrice: number;
    change: number;
    changePercent: number;
}

const ADJUSTMENT_TYPES = [
    { id: 'PERCENT_INCREASE', label: 'Raise by %', icon: '📈', color: 'text-green-400' },
    { id: 'PERCENT_DECREASE', label: 'Lower by %', icon: '📉', color: 'text-red-400' },
    { id: 'FIXED_INCREASE', label: 'Add $', icon: '💲', color: 'text-green-400' },
    { id: 'FIXED_DECREASE', label: 'Subtract $', icon: '💰', color: 'text-red-400' },
    { id: 'SET_MARGIN', label: 'Set margin %', icon: '📊', color: 'text-blue-400' },
    { id: 'ROUND_UP', label: 'Round to .X9', icon: '🔄', color: 'text-purple-400' },
];

export default function PriceBookPage() {
    const [categories, setCategories] = useState<CategoryStat[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [adjustmentType, setAdjustmentType] = useState<string>('PERCENT_INCREASE');
    const [value, setValue] = useState<number>(5);
    const [preview, setPreview] = useState<PreviewProduct[]>([]);
    const [previewSummary, setPreviewSummary] = useState<any>(null);
    const [applying, setApplying] = useState(false);
    const [applied, setApplied] = useState<any>(null);

    useEffect(() => {
        fetch('/api/inventory/price-book')
            .then(r => r.json())
            .then(data => setCategories(data.categories || []))
            .catch(() => { });
    }, []);

    const handlePreview = async () => {
        if (!selectedCategory) return;
        const res = await fetch('/api/inventory/price-book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'adjust',
                categoryId: selectedCategory,
                adjustmentType,
                value,
                preview: true,
            }),
        });
        const data = await res.json();
        setPreview(data.products || []);
        setPreviewSummary(data.summary || null);
        setApplied(null);
    };

    const handleApply = async () => {
        if (!selectedCategory) return;
        setApplying(true);
        const res = await fetch('/api/inventory/price-book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'adjust',
                categoryId: selectedCategory,
                adjustmentType,
                value,
                preview: false,
            }),
        });
        const data = await res.json();
        setApplied(data);
        setPreview([]);
        setApplying(false);
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <DollarSign size={28} className="text-green-400" />
                    <div>
                        <h1 className="text-2xl font-bold">Price Book Manager</h1>
                        <p className="text-sm text-[var(--text-muted)]">Bulk price changes by category — preview before applying</p>
                    </div>
                </div>

                {/* Category Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        className={`p-4 rounded-xl border text-left transition-all ${selectedCategory === 'ALL'
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-[var(--border)] hover:border-blue-500/50'
                            }`}
                    >
                        <p className="font-bold text-blue-400">📦 All Products</p>
                        <p className="text-xs text-[var(--text-muted)]">{categories.reduce((s, c) => s + c.productCount, 0)} items</p>
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`p-4 rounded-xl border text-left transition-all ${selectedCategory === cat.id
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-[var(--border)] hover:border-orange-500/50'
                                }`}
                        >
                            <p className="font-medium text-[var(--text-primary)]">{cat.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-[var(--text-muted)]">{cat.productCount} items</span>
                                {cat.priceRange && (
                                    <span className="text-xs text-green-400">${cat.priceRange.avg.toFixed(2)} avg</span>
                                )}
                                {cat.avgMargin !== null && (
                                    <span className="text-xs text-blue-400">{cat.avgMargin}% margin</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Adjustment Controls */}
                {selectedCategory && (
                    <div className="p-5 rounded-xl border border-[var(--border)] space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Percent size={18} /> Adjustment Type
                        </h3>

                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {ADJUSTMENT_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setAdjustmentType(type.id)}
                                    className={`p-3 rounded-lg border text-center text-sm transition-all ${adjustmentType === type.id
                                            ? 'border-orange-500 bg-orange-500/10'
                                            : 'border-[var(--border)] hover:border-orange-500/50'
                                        }`}
                                >
                                    <span className="text-lg">{type.icon}</span>
                                    <p className={`text-xs font-medium mt-1 ${adjustmentType === type.id ? type.color : 'text-[var(--text-muted)]'}`}>
                                        {type.label}
                                    </p>
                                </button>
                            ))}
                        </div>

                        {adjustmentType !== 'ROUND_UP' && (
                            <div className="flex items-center gap-4">
                                <label className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
                                    {adjustmentType.includes('PERCENT') || adjustmentType === 'SET_MARGIN' ? 'Percentage:' : 'Amount ($):'}
                                </label>
                                <input
                                    type="number"
                                    value={value}
                                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                                    step={adjustmentType.includes('FIXED') ? 0.25 : 1}
                                    min={0}
                                    className="w-32 bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <span className="text-lg font-bold text-[var(--text-muted)]">
                                    {adjustmentType.includes('PERCENT') || adjustmentType === 'SET_MARGIN' ? '%' : '$'}
                                </span>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handlePreview}
                                className="px-6 py-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
                            >
                                👀 Preview Changes
                            </button>
                            {preview.length > 0 && (
                                <button
                                    onClick={handleApply}
                                    disabled={applying}
                                    className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                >
                                    {applying ? (
                                        <><RotateCcw size={14} className="animate-spin" /> Applying...</>
                                    ) : (
                                        <><ArrowRight size={14} /> Apply to {preview.length} Products</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Applied Success */}
                {applied?.success && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                        <CheckCircle size={20} className="text-green-400" />
                        <div>
                            <p className="text-sm font-medium text-green-400">{applied.message}</p>
                            <p className="text-xs text-[var(--text-muted)]">Applied at {new Date(applied.appliedAt).toLocaleString()}</p>
                        </div>
                    </div>
                )}

                {/* Preview Table */}
                {preview.length > 0 && (
                    <div className="space-y-3">
                        {previewSummary && (
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                                <AlertTriangle size={16} className="text-amber-400" />
                                <span className="text-sm text-amber-400 font-medium">Preview — Not yet applied</span>
                                <span className="text-sm text-[var(--text-muted)]">
                                    Avg change: <span className={previewSummary.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}>${previewSummary.avgChange.toFixed(2)}</span>
                                </span>
                                <span className="text-sm text-[var(--text-muted)]">
                                    Revenue impact: <span className={previewSummary.totalRevImpact >= 0 ? 'text-green-400' : 'text-red-400'}>${previewSummary.totalRevImpact.toFixed(2)}/unit</span>
                                </span>
                            </div>
                        )}

                        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--surface)]">
                                    <tr>
                                        <th className="text-left px-4 py-2.5 text-[var(--text-secondary)]">Product</th>
                                        <th className="text-right px-4 py-2.5 text-[var(--text-secondary)]">Current</th>
                                        <th className="text-center px-4 py-2.5 text-[var(--text-secondary)]"></th>
                                        <th className="text-right px-4 py-2.5 text-[var(--text-secondary)]">New</th>
                                        <th className="text-right px-4 py-2.5 text-[var(--text-secondary)]">Change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map(p => (
                                        <tr key={p.id} className="border-t border-[var(--border)]">
                                            <td className="px-4 py-2 text-[var(--text-primary)]">{p.name}</td>
                                            <td className="px-4 py-2 text-right text-[var(--text-muted)]">${p.currentPrice.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-center">
                                                {p.change >= 0
                                                    ? <TrendingUp size={14} className="inline text-green-400" />
                                                    : <TrendingDown size={14} className="inline text-red-400" />
                                                }
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold text-[var(--text-primary)]">${p.newPrice.toFixed(2)}</td>
                                            <td className={`px-4 py-2 text-right font-medium ${p.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {p.change >= 0 ? '+' : ''}{p.changePercent.toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
