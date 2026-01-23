'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2, Phone, Mail, Globe, Users, X, Loader2 } from 'lucide-react';

interface Dealer {
    id: string;
    dealerName: string;
    logoUrl: string | null;
    supportPhone: string | null;
    supportEmail: string | null;
    supportUrl: string | null;
    clientCount: number;
    createdAt: string;
}

export default function DealersPage() {
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Dealer | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        dealerName: '',
        logoUrl: '',
        supportPhone: '',
        supportEmail: '',
        supportUrl: ''
    });

    useEffect(() => {
        fetchDealers();
    }, []);

    async function fetchDealers() {
        try {
            const res = await fetch('/api/provider/dealers');
            const data = await res.json();
            if (data.success) {
                setDealers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch dealers:', error);
        } finally {
            setLoading(false);
        }
    }

    function openAddModal() {
        setEditing(null);
        setForm({ dealerName: '', logoUrl: '', supportPhone: '', supportEmail: '', supportUrl: '' });
        setShowModal(true);
    }

    function openEditModal(dealer: Dealer) {
        setEditing(dealer);
        setForm({
            dealerName: dealer.dealerName,
            logoUrl: dealer.logoUrl || '',
            supportPhone: dealer.supportPhone || '',
            supportEmail: dealer.supportEmail || '',
            supportUrl: dealer.supportUrl || ''
        });
        setShowModal(true);
    }

    async function handleSave() {
        if (!form.dealerName.trim()) return;
        setSaving(true);
        try {
            const url = editing ? `/api/provider/dealers/${editing.id}` : '/api/provider/dealers';
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setShowModal(false);
                fetchDealers();
            }
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(dealer: Dealer) {
        if (!confirm(`Delete ${dealer.dealerName}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/provider/dealers/${dealer.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                fetchDealers();
            } else {
                alert(data.error || 'Failed to delete');
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dealers / Resellers</h1>
                    <p className="text-[var(--text-muted)] text-sm">Manage dealer co-branding for clients</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg font-medium"
                >
                    <Plus size={18} />
                    Add Dealer
                </button>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <p className="text-amber-400 text-sm">
                    <strong>How it works:</strong> Create dealers here, then assign them to clients in the Accounts section.
                    Dealer branding shows in login screen + receipts. Dealers have <strong>NO access</strong> to sales or reports.
                </p>
            </div>

            {/* Dealers List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
                </div>
            ) : dealers.length === 0 ? (
                <div className="text-center py-12 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                    <Building2 className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">No dealers yet</h3>
                    <p className="text-[var(--text-muted)] mb-4">Add your first dealer/reseller to enable co-branding</p>
                    <button
                        onClick={openAddModal}
                        className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg"
                    >
                        Add First Dealer
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {dealers.map(dealer => (
                        <div
                            key={dealer.id}
                            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-4">
                                {dealer.logoUrl ? (
                                    <img src={dealer.logoUrl} alt={dealer.dealerName} className="w-12 h-12 rounded-lg object-contain bg-white" />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-[var(--background)] flex items-center justify-center">
                                        <Building2 className="h-6 w-6 text-[var(--text-muted)]" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-[var(--text-primary)]">{dealer.dealerName}</h3>
                                    <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                                        {dealer.supportPhone && (
                                            <span className="flex items-center gap-1"><Phone size={12} /> {dealer.supportPhone}</span>
                                        )}
                                        {dealer.supportEmail && (
                                            <span className="flex items-center gap-1"><Mail size={12} /> {dealer.supportEmail}</span>
                                        )}
                                        <span className="flex items-center gap-1"><Users size={12} /> {dealer.clientCount} clients</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => openEditModal(dealer)}
                                    className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                >
                                    <Pencil size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(dealer)}
                                    className="p-2 hover:bg-red-500/10 rounded-lg text-[var(--text-muted)] hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                {editing ? 'Edit Dealer' : 'Add Dealer'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-[var(--text-muted)] mb-1">Dealer Name *</label>
                                <input
                                    type="text"
                                    value={form.dealerName}
                                    onChange={e => setForm({ ...form, dealerName: e.target.value })}
                                    placeholder="ABC Payments"
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-[var(--text-muted)] mb-1">Logo URL</label>
                                <input
                                    type="text"
                                    value={form.logoUrl}
                                    onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Support Phone</label>
                                    <input
                                        type="text"
                                        value={form.supportPhone}
                                        onChange={e => setForm({ ...form, supportPhone: e.target.value })}
                                        placeholder="630-xxx-xxxx"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Support Email</label>
                                    <input
                                        type="text"
                                        value={form.supportEmail}
                                        onChange={e => setForm({ ...form, supportEmail: e.target.value })}
                                        placeholder="support@..."
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-[var(--text-muted)] mb-1">Support Website</label>
                                <input
                                    type="text"
                                    value={form.supportUrl}
                                    onChange={e => setForm({ ...form, supportUrl: e.target.value })}
                                    placeholder="https://abcpayments.com/support"
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-2 border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.dealerName.trim()}
                                className="flex-1 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {editing ? 'Save Changes' : 'Create Dealer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
