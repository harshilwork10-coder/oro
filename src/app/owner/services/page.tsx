'use client';

import { useState } from 'react';
import {
    Search, Plus, Scissors, DollarSign, Clock, MoreHorizontal,
    Edit2, Trash2, ToggleLeft, ToggleRight
} from 'lucide-react';

const MOCK_CATEGORIES = ['All', 'Threading', 'Waxing', 'Spa', 'Hair', 'Nails', 'Additions'];

const MOCK_SERVICES = [
    { id: 1, name: 'Eyebrow Threading', category: 'Threading', price: 12, duration: 10, active: true },
    { id: 2, name: 'Upper Lip', category: 'Threading', price: 6, duration: 5, active: true },
    { id: 3, name: 'Full Face Threading', category: 'Threading', price: 35, duration: 25, active: true },
    { id: 4, name: 'Full Arm Wax', category: 'Waxing', price: 30, duration: 20, active: true },
    { id: 5, name: 'Full Leg Wax', category: 'Waxing', price: 45, duration: 30, active: true },
    { id: 6, name: 'Bikini Wax', category: 'Waxing', price: 35, duration: 20, active: true },
    { id: 7, name: 'Express Facial', category: 'Spa', price: 40, duration: 30, active: true },
    { id: 8, name: 'Deluxe Facial', category: 'Spa', price: 65, duration: 60, active: true },
    { id: 9, name: 'Eyebrow Tinting', category: 'Additions', price: 15, duration: 10, active: true },
    { id: 10, name: 'Henna Tattoo', category: 'Additions', price: 20, duration: 15, active: false },
    { id: 11, name: 'Men\'s Haircut', category: 'Hair', price: 25, duration: 30, active: true },
    { id: 12, name: 'Women\'s Blowout', category: 'Hair', price: 45, duration: 45, active: true },
];

export default function ServicesPage() {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = MOCK_SERVICES.filter(s => {
        const matchCategory = selectedCategory === 'All' || s.category === selectedCategory;
        const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCategory && matchSearch;
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Services</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{MOCK_SERVICES.length} total services</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                    <Plus size={16} />
                    Add Service
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Search services..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>
                <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)] overflow-x-auto">
                    {MOCK_CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${selectedCategory === cat
                                ? 'bg-[var(--primary)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((service) => (
                    <div
                        key={service.id}
                        className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)]/30 transition-all ${!service.active ? 'opacity-50' : ''}`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                    <Scissors size={18} className="text-[var(--primary)]" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{service.name}</h3>
                                    <span className="text-xs text-[var(--text-muted)]">{service.category}</span>
                                </div>
                            </div>
                            <button className="p-1 hover:bg-[var(--surface-hover)] rounded">
                                <MoreHorizontal size={16} className="text-[var(--text-muted)]" />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1 text-[var(--primary)] font-semibold">
                                    <DollarSign size={14} />
                                    {service.price.toFixed(2)}
                                </span>
                                <span className="flex items-center gap-1 text-[var(--text-muted)]">
                                    <Clock size={14} />
                                    {service.duration}min
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                {service.active ? (
                                    <ToggleRight size={20} className="text-emerald-400" />
                                ) : (
                                    <ToggleLeft size={20} className="text-[var(--text-muted)]" />
                                )}
                                <span className={`text-xs font-medium ${service.active ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
                                    {service.active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
