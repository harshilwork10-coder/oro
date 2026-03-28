'use client';

import { useState, useEffect } from 'react';
import { Truck, Plus, Search, Phone, Mail, MapPin, Package, X } from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    _count?: { purchaseOrders: number; products: number };
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', contactName: '', email: '', phone: '', address: '' });
    const [saving, setSaving] = useState(false);

    async function fetchSuppliers() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            const res = await fetch(`/api/inventory/suppliers?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setSuppliers(data.data || []);
            }
        } catch { /* ignore */ }
        setLoading(false);
    }

    useEffect(() => { fetchSuppliers(); }, [search]);

    async function handleCreate() {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch('/api/inventory/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setShowCreate(false);
                setForm({ name: '', contactName: '', email: '', phone: '', address: '' });
                fetchSuppliers();
            }
        } catch { /* ignore */ }
        setSaving(false);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Truck size={24} className="text-[var(--primary)]" />
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Suppliers</h1>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                    <Plus size={16} /> Add Supplier
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search suppliers..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
                />
            </div>

            {/* Supplier List */}
            {loading ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Loading suppliers...</div>
            ) : suppliers.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                    <Truck size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No suppliers found</p>
                    <p className="text-sm mt-1">Add your first supplier to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppliers.map(s => (
                        <div key={s.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--primary)]/50 transition-colors">
                            <h3 className="font-semibold text-[var(--text-primary)] text-lg">{s.name}</h3>
                            {s.contactName && (
                                <p className="text-sm text-[var(--text-secondary)] mt-1">{s.contactName}</p>
                            )}
                            <div className="mt-3 space-y-1.5">
                                {s.email && (
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                        <Mail size={14} /> {s.email}
                                    </div>
                                )}
                                {s.phone && (
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                        <Phone size={14} /> {s.phone}
                                    </div>
                                )}
                                {s.address && (
                                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                                        <MapPin size={14} /> {s.address}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
                                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                    <Package size={12} /> {s._count?.products || 0} products
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">
                                    {s._count?.purchaseOrders || 0} POs
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Supplier</h2>
                            <button onClick={() => setShowCreate(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={20} /></button>
                        </div>
                        <div className="space-y-3">
                            <input placeholder="Supplier Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]" />
                            <input placeholder="Contact Name" value={form.contactName} onChange={e => setForm({ ...form, contactName: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]" />
                            <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]" />
                            <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]" />
                            <input placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]" />
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                            <button onClick={handleCreate} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">{saving ? 'Saving...' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
