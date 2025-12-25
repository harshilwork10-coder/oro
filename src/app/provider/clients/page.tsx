'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Search, Plus, Building2, MapPin, MoreVertical, CheckCircle, Clock, XCircle,
    Key, Eye, EyeOff, Pause, Play, Ban, Trash2, Download, X, AlertTriangle, Settings
} from 'lucide-react';
import AddFranchisorModal from '@/components/modals/AddFranchisorModal';
import Toast from '@/components/ui/Toast';

interface Client {
    id: string;
    name: string;
    businessName: string;
    ownerEmail: string;
    ownerId: string;
    approvalStatus: string;
    accountStatus: string;
    locations: number;
    createdAt: string;
    magicToken?: string;
}

export default function ProviderClientsPage() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Delete modal
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Password reset modal
    const [passwordModal, setPasswordModal] = useState<{ open: boolean; ownerId: string; ownerName: string } | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);

    // Suspend modal
    const [suspendModal, setSuspendModal] = useState<{ id: string; name: string; action: 'SUSPEND' | 'ACTIVATE' } | null>(null);
    const [suspendReason, setSuspendReason] = useState('');
    const [suspending, setSuspending] = useState(false);

    // Fetch clients
    async function fetchClients() {
        try {
            const response = await fetch('/api/admin/franchisors');
            if (response.ok) {
                const data = await response.json();
                const transformed: Client[] = data.map((f: any) => ({
                    id: f.id,
                    name: f.owner?.name || f.name || 'Unknown',
                    businessName: f.businessName || f.name || 'Unknown Business',
                    ownerEmail: f.owner?.email || '',
                    ownerId: f.ownerId || f.id,
                    approvalStatus: f.approvalStatus || 'PENDING',
                    accountStatus: f.accountStatus || 'ACTIVE',
                    locations: f.franchises?.[0]?.locations?.length || 0,
                    createdAt: f.createdAt,
                    magicToken: f.owner?.magicLinks?.[0]?.token,
                }));
                setClients(transformed);
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchClients(); }, []);

    // Delete client
    async function confirmDelete() {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/clients/${deleteConfirm.id}`, { method: 'DELETE' });
            if (res.ok) {
                setToast({ message: `${deleteConfirm.name} deleted successfully`, type: 'success' });
                fetchClients();
            } else {
                const error = await res.json();
                setToast({ message: error.details || 'Failed to delete client', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'An error occurred while deleting', type: 'error' });
        } finally {
            setDeleting(false);
            setDeleteConfirm(null);
        }
    }

    // Reset password
    async function handleResetOwnerPassword() {
        if (!passwordModal || newPassword.length < 8) return;
        setResettingPassword(true);
        try {
            const res = await fetch('/api/admin/reset-owner-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ownerId: passwordModal.ownerId, password: newPassword })
            });
            if (res.ok) {
                setToast({ message: `Password reset for ${passwordModal.ownerName}`, type: 'success' });
                setPasswordModal(null);
                setNewPassword('');
            } else {
                setToast({ message: 'Failed to reset password', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error resetting password', type: 'error' });
        } finally {
            setResettingPassword(false);
        }
    }

    // Suspend/Activate account
    async function handleSuspendAccount() {
        if (!suspendModal) return;
        setSuspending(true);
        try {
            const res = await fetch('/api/admin/franchisors/suspend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchisorId: suspendModal.id,
                    action: suspendModal.action,
                    reason: suspendReason || undefined
                })
            });
            if (res.ok) {
                const actionText = suspendModal.action === 'SUSPEND' ? 'suspended' : 'reactivated';
                setToast({ message: `${suspendModal.name} has been ${actionText}`, type: 'success' });
                setSuspendModal(null);
                setSuspendReason('');
                fetchClients();
            } else {
                setToast({ message: 'Failed to update account status', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error updating account status', type: 'error' });
        } finally {
            setSuspending(false);
        }
    }

    // Copy magic link
    async function copyMagicLink(client: Client) {
        if (client.magicToken) {
            const url = `${window.location.origin}/auth/magic-link/${client.magicToken}`;
            await navigator.clipboard.writeText(url);
            setToast({ message: 'Magic link copied!', type: 'success' });
        } else {
            try {
                const res = await fetch(`/api/admin/franchisors/${client.id}/magic-link`, { method: 'POST' });
                const data = await res.json();
                if (data.url) {
                    await navigator.clipboard.writeText(data.url);
                    setToast({ message: 'Magic link generated and copied!', type: 'success' });
                } else {
                    setToast({ message: 'Failed to generate magic link', type: 'error' });
                }
            } catch {
                setToast({ message: 'Failed to generate magic link', type: 'error' });
            }
        }
        setActiveMenu(null);
    }

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Clients</h1>
                    <p className="text-sm text-stone-400 mt-1">Manage all franchises and their locations</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={16} />
                        Add Client
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 pl-9 pr-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            {/* Client Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => (
                    <div key={client.id} className="bg-stone-800/50 border border-stone-700 rounded-xl p-5 hover:border-orange-500/30 transition-all relative">
                        {/* Action Menu */}
                        <div className="absolute top-4 right-4">
                            <button
                                onClick={() => setActiveMenu(activeMenu === client.id ? null : client.id)}
                                className="p-2 hover:bg-stone-700 rounded-lg transition-colors"
                            >
                                <MoreVertical size={18} className="text-stone-400" />
                            </button>

                            {activeMenu === client.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-stone-900 border border-stone-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                    {/* Manage */}
                                    <button
                                        onClick={() => {
                                            router.push(`/provider/clients/${client.id}/config`);
                                            setActiveMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-stone-700 transition-colors flex items-center gap-2 text-orange-400"
                                    >
                                        <Settings size={16} />
                                        Manage
                                    </button>

                                    {/* Reset Password */}
                                    <button
                                        onClick={() => {
                                            setPasswordModal({ open: true, ownerId: client.ownerId, ownerName: client.name });
                                            setActiveMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-stone-700 transition-colors flex items-center gap-2 text-stone-300"
                                    >
                                        <Key size={16} />
                                        Reset Password
                                    </button>

                                    {/* Copy Magic Link */}
                                    <button
                                        onClick={() => copyMagicLink(client)}
                                        className="w-full px-4 py-2 text-left hover:bg-stone-700 transition-colors flex items-center gap-2 text-blue-400"
                                    >
                                        <Download size={16} />
                                        Copy Magic Link
                                    </button>

                                    {/* Suspend / Activate */}
                                    {client.accountStatus !== 'SUSPENDED' ? (
                                        <button
                                            onClick={() => {
                                                setSuspendModal({ id: client.id, name: client.name, action: 'SUSPEND' });
                                                setActiveMenu(null);
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-orange-900/20 transition-colors flex items-center gap-2 text-orange-400"
                                        >
                                            <Pause size={16} />
                                            Suspend
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSuspendModal({ id: client.id, name: client.name, action: 'ACTIVATE' });
                                                setActiveMenu(null);
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-emerald-900/20 transition-colors flex items-center gap-2 text-emerald-400"
                                        >
                                            <Play size={16} />
                                            Reactivate
                                        </button>
                                    )}

                                    {/* Delete */}
                                    <button
                                        onClick={() => {
                                            setDeleteConfirm({ id: client.id, name: client.name });
                                            setActiveMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-red-900/20 transition-colors flex items-center gap-2 text-red-400 border-t border-stone-700"
                                    >
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Client Info */}
                        <div className="flex items-start gap-3 mb-4">
                            <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-stone-100 truncate">{client.name}</h3>
                                    {/* Status Badge */}
                                    {client.approvalStatus === 'PENDING' && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                                            <Clock size={10} /> Pending
                                        </span>
                                    )}
                                    {client.approvalStatus === 'APPROVED' && client.accountStatus !== 'SUSPENDED' && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
                                            <CheckCircle size={10} /> Active
                                        </span>
                                    )}
                                    {client.accountStatus === 'SUSPENDED' && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full flex items-center gap-1">
                                            <Pause size={10} /> Suspended
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-stone-400">{client.businessName}</p>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-stone-400">
                                <MapPin size={14} className="text-stone-500" />
                                {client.locations} Location{client.locations !== 1 ? 's' : ''}
                            </div>
                            <div className="flex items-center gap-2 text-stone-400">
                                <span className="text-stone-500">📧</span>
                                <span className="truncate">{client.ownerEmail}</span>
                            </div>
                            <div className="flex items-center gap-2 text-stone-400">
                                <span className="text-stone-500">📅</span>
                                Joined {new Date(client.createdAt).toLocaleDateString()}
                            </div>
                        </div>

                        {/* View Details Link */}
                        <Link
                            href={`/provider/clients/${client.id}/config`}
                            className="mt-4 w-full py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Settings size={14} />
                            Manage Client
                        </Link>
                    </div>
                ))}
            </div>

            {filteredClients.length === 0 && (
                <div className="text-center py-12 bg-stone-800/30 rounded-xl border border-stone-800">
                    <Building2 size={48} className="mx-auto text-stone-600 mb-4" />
                    <h2 className="text-lg font-semibold text-stone-100">No clients found</h2>
                    <p className="text-stone-400 mt-2">Add your first client to get started</p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Add Client
                    </button>
                </div>
            )}

            {/* Add Client Modal */}
            <AddFranchisorModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    fetchClients();
                    setIsAddModalOpen(false);
                }}
            />

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <AlertTriangle className="h-6 w-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Delete Client</h3>
                        </div>
                        <p className="text-stone-300 mb-2">
                            Are you sure you want to delete <span className="font-semibold text-white">{deleteConfirm.name}</span>?
                        </p>
                        <p className="text-stone-400 text-sm mb-6">
                            This action cannot be undone. All data will be permanently deleted.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg hover:bg-stone-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete Client'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {passwordModal?.open && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg">
                                    <Key className="h-6 w-6 text-amber-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-white">Reset Password</h3>
                            </div>
                            <button
                                onClick={() => { setPasswordModal(null); setNewPassword(''); setShowPassword(false); }}
                                className="p-1 hover:bg-stone-700 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-stone-400" />
                            </button>
                        </div>
                        <p className="text-stone-300 mb-4">
                            Set a new password for <span className="font-semibold text-white">{passwordModal.ownerName}</span>
                        </p>
                        <div className="relative mb-4">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 8 characters)"
                                className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-stone-700 rounded transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5 text-stone-400" /> : <Eye className="h-5 w-5 text-stone-400" />}
                            </button>
                        </div>
                        {newPassword.length > 0 && newPassword.length < 8 && (
                            <p className="text-red-400 text-sm mb-4">Password must be at least 8 characters</p>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setPasswordModal(null); setNewPassword(''); setShowPassword(false); }}
                                disabled={resettingPassword}
                                className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg hover:bg-stone-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetOwnerPassword}
                                disabled={resettingPassword || newPassword.length < 8}
                                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {resettingPassword ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Resetting...
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend/Activate Modal */}
            {suspendModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${suspendModal.action === 'SUSPEND' ? 'bg-orange-500/20' : 'bg-emerald-500/20'}`}>
                                    {suspendModal.action === 'SUSPEND' ? <Pause className="h-6 w-6 text-orange-400" /> : <Play className="h-6 w-6 text-emerald-400" />}
                                </div>
                                <h3 className="text-lg font-semibold text-white">
                                    {suspendModal.action === 'SUSPEND' ? 'Suspend Account' : 'Reactivate Account'}
                                </h3>
                            </div>
                            <button
                                onClick={() => { setSuspendModal(null); setSuspendReason(''); }}
                                className="p-1 hover:bg-stone-700 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-stone-400" />
                            </button>
                        </div>
                        <p className="text-stone-300 mb-4">
                            {suspendModal.action === 'SUSPEND' ? (
                                <>Are you sure you want to suspend <span className="font-semibold text-white">{suspendModal.name}</span>? They will be blocked from logging in.</>
                            ) : (
                                <>Reactivate <span className="font-semibold text-white">{suspendModal.name}</span>? They will be able to login again.</>
                            )}
                        </p>
                        {suspendModal.action === 'SUSPEND' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-stone-300 mb-2">Reason (optional)</label>
                                <input
                                    type="text"
                                    value={suspendReason}
                                    onChange={(e) => setSuspendReason(e.target.value)}
                                    placeholder="e.g., Payment overdue"
                                    className="w-full px-4 py-3 bg-stone-900/50 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setSuspendModal(null); setSuspendReason(''); }}
                                disabled={suspending}
                                className="px-4 py-2 bg-stone-700 text-stone-300 rounded-lg hover:bg-stone-600 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSuspendAccount}
                                disabled={suspending}
                                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${suspendModal.action === 'SUSPEND' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                            >
                                {suspending ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    suspendModal.action === 'SUSPEND' ? 'Suspend Account' : 'Reactivate Account'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
