'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, Plus, Users, ChevronRight, MapPin, Loader2, X, Building2, Mail, Phone, User, KeyRound
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface Franchisee {
    id: string;
    name: string;
    locationCount: number;
    status: string;
    ownerName: string | null;
    ownerEmail: string | null;
    createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        APPROVED: 'bg-emerald-500/20 text-emerald-400',
        ACTIVE: 'bg-emerald-500/20 text-emerald-400',
        PENDING: 'bg-amber-500/20 text-amber-400',
        PENDING_APPROVAL: 'bg-amber-500/20 text-amber-400',
        REJECTED: 'bg-red-500/20 text-red-400',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || colors.APPROVED}`}>
            {status.toLowerCase().replace(/_/g, ' ')}
        </span>
    );
}

export default function FranchiseesPage() {
    const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Reset password state
    const [resetModal, setResetModal] = useState<{ id: string; name: string; email: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetting, setResetting] = useState(false);

    // Step 1: Basic form fields (streamlined)
    const [form, setForm] = useState({
        // LLC Info
        legalName: '',
        dbaName: '',
        businessPhone: '',
        businessEmail: '',
        mailingAddress: '',
        // Owner Info
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerPassword: '',  // Initial password for owner login
        // Optional
        franchiseeType: 'SINGLE_LOCATION',
        region: '',
        notes: ''
    });

    useEffect(() => {
        fetchFranchisees();
    }, []);

    async function fetchFranchisees() {
        try {
            const res = await fetch('/api/franchisor/franchisees');
            if (res.ok) {
                const data = await res.json();
                setFranchisees(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch franchisees:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddFranchisee() {
        // Validate required fields
        if (!form.legalName.trim()) {
            setToast({ message: 'Legal LLC name is required', type: 'error' });
            return;
        }
        if (!form.businessEmail.trim()) {
            setToast({ message: 'Business email is required', type: 'error' });
            return;
        }
        if (!form.ownerName.trim()) {
            setToast({ message: 'Owner name is required', type: 'error' });
            return;
        }
        if (!form.ownerEmail.trim()) {
            setToast({ message: 'Owner email is required', type: 'error' });
            return;
        }
        if (!form.ownerPassword || form.ownerPassword.length < 6) {
            setToast({ message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/franchisor/franchisees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (res.ok) {
                const data = await res.json();
                setFranchisees(prev => [data.franchisee, ...prev]);
                setShowAddModal(false);
                resetForm();
                setToast({ message: 'Franchisee created! They can now log in.', type: 'success' });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to create franchisee', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error creating franchisee', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    function resetForm() {
        setForm({
            legalName: '',
            dbaName: '',
            businessPhone: '',
            businessEmail: '',
            mailingAddress: '',
            ownerName: '',
            ownerEmail: '',
            ownerPhone: '',
            ownerPassword: '',
            franchiseeType: 'SINGLE_LOCATION',
            region: '',
            notes: ''
        });
    }

    async function handleResetPassword() {
        if (!resetModal) return;
        if (!newPassword || newPassword.length < 6) {
            setToast({ message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }

        setResetting(true);
        try {
            const res = await fetch(`/api/franchisor/franchisees/${resetModal.id}/reset-password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            });

            if (res.ok) {
                setToast({ message: `Password reset for ${resetModal.email}`, type: 'success' });
                setResetModal(null);
                setNewPassword('');
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to reset password', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error resetting password', type: 'error' });
        } finally {
            setResetting(false);
        }
    }

    const filteredFranchisees = franchisees.filter(f =>
        !searchQuery ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Franchisees</h1>
                    <p className="text-sm text-[var(--text-muted)]">{franchisees.length} franchisee(s)</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Add Franchisee
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="Search franchisees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {filteredFranchisees.length === 0 && (
                <div className="text-center py-12 glass-panel border border-[var(--border)] rounded-xl">
                    <Users className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Franchisees Yet</h3>
                    <p className="text-[var(--text-secondary)] mb-4">Add your first franchisee LLC to get started.</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium"
                    >
                        Add Franchisee
                    </button>
                </div>
            )}

            {/* Table */}
            {filteredFranchisees.length > 0 && (
                <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Franchisee Name</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Owner</th>
                                <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Locations</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Created</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFranchisees.map((franchisee) => (
                                <tr key={franchisee.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer">
                                    <td className="px-4 py-3">
                                        <Link href={`/franchisor/franchisees/${franchisee.id}`} className="flex items-center gap-2 hover:text-[var(--primary)]">
                                            <Building2 size={16} className="text-[var(--text-muted)]" />
                                            <span className="font-medium text-[var(--text-primary)]">{franchisee.name}</span>
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-[var(--text-secondary)]">{franchisee.ownerName || '-'}</div>
                                        <div className="text-xs text-[var(--text-muted)]">{franchisee.ownerEmail || ''}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                                            <MapPin size={12} />
                                            {franchisee.locationCount}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3"><StatusBadge status={franchisee.status} /></td>
                                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                                        {new Date(franchisee.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {franchisee.ownerEmail && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setResetModal({ id: franchisee.id, name: franchisee.name, email: franchisee.ownerEmail! });
                                                    }}
                                                    title="Reset Password"
                                                    className="p-1.5 hover:bg-[var(--surface-hover)] rounded text-[var(--text-muted)] hover:text-amber-500"
                                                >
                                                    <KeyRound size={14} />
                                                </button>
                                            )}
                                            <ChevronRight size={16} className="text-[var(--text-muted)]" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Franchisee Modal - Streamlined 2-Section Form */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Add Franchisee</h2>
                                <p className="text-sm text-[var(--text-muted)]">Quick setup - 30 seconds</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Section 1: Business (LLC) */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Building2 size={14} />
                                Business (LLC)
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Legal LLC Name *</label>
                                    <input
                                        type="text"
                                        value={form.legalName}
                                        onChange={e => setForm({ ...form, legalName: e.target.value })}
                                        placeholder="e.g., Metro Holdings LLC"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Business Email *</label>
                                        <input
                                            type="email"
                                            value={form.businessEmail}
                                            onChange={e => setForm({ ...form, businessEmail: e.target.value })}
                                            placeholder="contact@metro.com"
                                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Business Phone</label>
                                        <input
                                            type="tel"
                                            value={form.businessPhone}
                                            onChange={e => setForm({ ...form, businessPhone: e.target.value })}
                                            placeholder="(555) 123-4567"
                                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">DBA Name (optional)</label>
                                    <input
                                        type="text"
                                        value={form.dbaName}
                                        onChange={e => setForm({ ...form, dbaName: e.target.value })}
                                        placeholder="If different from LLC name"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Owner (Login) */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3 flex items-center gap-2">
                                <User size={14} />
                                Owner (Login)
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Owner Full Name *</label>
                                    <input
                                        type="text"
                                        value={form.ownerName}
                                        onChange={e => setForm({ ...form, ownerName: e.target.value })}
                                        placeholder="John Smith"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Owner Email *</label>
                                        <input
                                            type="email"
                                            value={form.ownerEmail}
                                            onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                                            placeholder="john@metro.com"
                                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Owner Mobile *</label>
                                        <input
                                            type="tel"
                                            value={form.ownerPhone}
                                            onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
                                            placeholder="(555) 987-6543"
                                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                </div>

                                {/* Password field */}
                                <div>
                                    <label className="block text-xs text-[var(--text-muted)] mb-1">Initial Password *</label>
                                    <input
                                        type="password"
                                        value={form.ownerPassword}
                                        onChange={e => setForm({ ...form, ownerPassword: e.target.value })}
                                        placeholder="Minimum 6 characters"
                                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Share this password with the owner so they can login</p>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Notes (optional - collapsible) */}
                        <div className="mb-6">
                            <details className="group">
                                <summary className="text-sm font-medium text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
                                    + Additional Info (optional)
                                </summary>
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Type</label>
                                        <select
                                            value={form.franchiseeType}
                                            onChange={e => setForm({ ...form, franchiseeType: e.target.value })}
                                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        >
                                            <option value="SINGLE_LOCATION">Single Location</option>
                                            <option value="MULTI_LOCATION">Multi-Location</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Region / Territory</label>
                                        <input
                                            type="text"
                                            value={form.region}
                                            onChange={e => setForm({ ...form, region: e.target.value })}
                                            placeholder="e.g., Chicago Metro"
                                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Notes</label>
                                        <textarea
                                            value={form.notes}
                                            onChange={e => setForm({ ...form, notes: e.target.value })}
                                            rows={2}
                                            placeholder="Any additional notes..."
                                            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                                        />
                                    </div>
                                </div>
                            </details>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2.5 border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddFranchisee}
                                disabled={saving}
                                className="flex-1 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {saving ? 'Creating...' : 'Create Franchisee'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Reset Password</h2>
                                <p className="text-sm text-[var(--text-muted)]">{resetModal.name}</p>
                            </div>
                            <button
                                onClick={() => { setResetModal(null); setNewPassword(''); }}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-[var(--text-secondary)] mb-3">
                                Owner: <span className="font-medium">{resetModal.email}</span>
                            </p>
                            <label className="block text-xs text-[var(--text-muted)] mb-1">New Password *</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Minimum 6 characters"
                                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                autoFocus
                            />
                            <p className="text-xs text-[var(--text-muted)] mt-1">Share this password with the owner</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setResetModal(null); setNewPassword(''); }}
                                className="flex-1 px-4 py-2 border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetPassword}
                                disabled={resetting}
                                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound size={16} />}
                                {resetting ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    );
}
