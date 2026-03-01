'use client';

import { useState, useEffect } from 'react';
import { Utensils, Zap, Coffee, Plus, Check, Sparkles } from 'lucide-react';

interface Category {
    name: string;
    productCount: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
}

interface SuggestedCombo {
    name: string;
    categories: string[];
    suggestedPrice: number;
    reason: string;
}

export default function ComboBuilderPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [suggestions, setSuggestions] = useState<SuggestedCombo[]>([]);
    const [comboName, setComboName] = useState('');
    const [comboType, setComboType] = useState('PICK_ANY');
    const [selectedCats, setSelectedCats] = useState<string[]>([]);
    const [comboPrice, setComboPrice] = useState<number | ''>('');
    const [created, setCreated] = useState<any>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetch('/api/deals/combos')
            .then(r => r.json())
            .then(data => {
                setCategories(data.categories || []);
                setSuggestions(data.suggestedCombos || []);
            });
    }, []);

    const toggleCat = (cat: string) => {
        setSelectedCats(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const useSuggestion = (s: SuggestedCombo) => {
        setComboName(s.name);
        setSelectedCats(s.categories);
        setComboPrice(s.suggestedPrice);
    };

    const createCombo = async () => {
        if (!comboName || !comboPrice || selectedCats.length < 1) return;
        setCreating(true);
        const res = await fetch('/api/deals/combos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: comboName,
                comboType,
                categories: selectedCats,
                comboPrice,
            }),
        });
        const data = await res.json();
        setCreated(data);
        setCreating(false);
    };

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Utensils size={28} className="text-orange-400" />
                    <div>
                        <h1 className="text-2xl font-bold">Combo Builder</h1>
                        <p className="text-sm text-[var(--text-muted)]">Create drink + snack combos to increase average ticket size</p>
                    </div>
                </div>

                {/* Quick Suggestions */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase flex items-center gap-2">
                        <Sparkles size={14} className="text-yellow-400" /> Suggested Combos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => useSuggestion(s)}
                                className="p-4 rounded-xl border border-[var(--border)] hover:border-orange-500/50 text-left transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm">{s.name}</span>
                                    <span className="text-orange-400 font-bold">${s.suggestedPrice}</span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-1">{s.reason}</p>
                                <div className="flex gap-1 mt-2">
                                    {s.categories.map((cat, j) => (
                                        <span key={j} className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">{cat}</span>
                                    ))}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Builder */}
                <div className="p-5 rounded-xl border border-[var(--border)] space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Plus size={18} className="text-green-400" /> Build Your Combo
                    </h3>

                    {/* Name */}
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">Combo Name</label>
                        <input
                            value={comboName}
                            onChange={e => setComboName(e.target.value)}
                            placeholder="e.g. Drink + Snack Deal"
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-2">Combo Type</label>
                        <div className="flex gap-2">
                            {[
                                { id: 'PICK_ANY', label: 'Pick Any', icon: Zap, desc: 'Any item from selected categories' },
                                { id: 'MULTI_BUY', label: 'Multi-Buy', icon: Coffee, desc: 'Multiple from same category' },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setComboType(t.id)}
                                    className={`flex-1 p-3 rounded-lg border text-left transition-all ${comboType === t.id ? 'border-orange-500 bg-orange-500/10' : 'border-[var(--border)] hover:border-orange-500/50'}`}
                                >
                                    <t.icon size={16} className={comboType === t.id ? 'text-orange-400' : 'text-[var(--text-muted)]'} />
                                    <p className="font-medium text-sm mt-1">{t.label}</p>
                                    <p className="text-xs text-[var(--text-muted)]">{t.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category Selection */}
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-2">
                            Select Categories ({comboType === 'MULTI_BUY' ? 'pick 1' : 'pick 2+'})
                        </label>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                            {categories.slice(0, 16).map(cat => (
                                <button
                                    key={cat.name}
                                    onClick={() => toggleCat(cat.name)}
                                    className={`p-2 rounded-lg border text-center text-xs transition-all ${selectedCats.includes(cat.name) ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-orange-500/50'}`}
                                >
                                    <p className="font-medium truncate">{cat.name}</p>
                                    <p className="text-[10px] opacity-60">{cat.productCount} items · ${cat.avgPrice}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price */}
                    <div>
                        <label className="text-xs text-[var(--text-muted)] block mb-1">Combo Price ($)</label>
                        <input
                            type="number"
                            value={comboPrice}
                            onChange={e => setComboPrice(e.target.value ? parseFloat(e.target.value) : '')}
                            placeholder="4.99"
                            step="0.01"
                            className="w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-lg font-bold text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>

                    {/* Create */}
                    <button
                        onClick={createCombo}
                        disabled={!comboName || !comboPrice || selectedCats.length < 1 || creating}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        {creating ? 'Creating...' : '🎯 Create Combo Deal'}
                    </button>
                </div>

                {/* Success */}
                {created?.success && (
                    <div className="p-5 rounded-xl border border-green-500/30 bg-green-500/10 space-y-2">
                        <div className="flex items-center gap-2">
                            <Check size={20} className="text-green-400" />
                            <span className="font-bold text-green-400">Combo Created!</span>
                        </div>
                        <p className="text-sm font-medium">{created.combo?.name}</p>
                        <div className="flex gap-4 text-sm">
                            <span>Combo: <strong className="text-orange-400">${created.combo?.comboPrice}</strong></span>
                            <span>Individual: <strong>${created.combo?.individualPrice}</strong></span>
                            <span className="text-green-400">Save ${created.combo?.savings} ({created.combo?.discountPct}% off)</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{created.insight}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
