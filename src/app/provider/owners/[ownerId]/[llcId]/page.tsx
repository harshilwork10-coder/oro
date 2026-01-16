'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Store, MapPin, Plus, Settings, CheckCircle,
    XCircle, Users, Monitor, Phone, Mail, X, Loader2, Edit2, Trash2, Save
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface StoreData {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    createdAt: string;
    stationCount: number;
    activeStations: number;
    employeeCount: number;
}

interface LlcData {
    id: string;
    name: string;
    businessName: string;
    businessType: string;
    approvalStatus: string;
    accountStatus: string;
    subscriptionTier: string;
    totalEmployees: number;
}

interface OwnerInfo {
    id: string;
    name: string | null;
    email: string;
}

interface PageData {
    owner: OwnerInfo;
    llc: LlcData;
    stores: StoreData[];
    storeCount: number;
    activeStores: number;
}

export default function LlcStoresPage() {
    const params = useParams();
    const ownerId = params.ownerId as string;
    const llcId = params.llcId as string;

    const [data, setData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);

    // Add Store Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addingStore, setAddingStore] = useState(false);
    const [storeForm, setStoreForm] = useState({
        name: '',
        address: '',
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Edit Store Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingStore, setEditingStore] = useState<StoreData | null>(null);
    const [editForm, setEditForm] = useState({ name: '', address: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, [ownerId, llcId]);

    async function fetchData() {
        try {
            const res = await fetch(`/api/admin/owners/${ownerId}/${llcId}`);
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch stores:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddStore() {
        if (!storeForm.name.trim()) {
            setToast({ message: 'Store name is required', type: 'error' });
            return;
        }

        setAddingStore(true);
        try {
            const res = await fetch('/api/admin/locations/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchisorId: llcId,
                    name: storeForm.name,
                    address: storeForm.address || null,
                }),
            });

            if (res.ok) {
                setToast({ message: 'Store created successfully!', type: 'success' });
                setShowAddModal(false);
                setStoreForm({ name: '', address: '' });
                fetchData(); // Refresh the list
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to create store', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error creating store', type: 'error' });
        } finally {
            setAddingStore(false);
        }
    }

    function openEditModal(store: StoreData, e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        setEditingStore(store);
        setEditForm({ name: store.name, address: store.address || '' });
        setShowEditModal(true);
    }

    async function handleEditStore() {
        if (!editingStore || !editForm.name.trim()) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/locations/${editingStore.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name,
                    address: editForm.address || null,
                }),
            });

            if (res.ok) {
                setToast({ message: 'Store updated successfully!', type: 'success' });
                setShowEditModal(false);
                setEditingStore(null);
                fetchData();
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to update store', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error updating store', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteStore(store: StoreData, e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm(`Delete "${store.name}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/locations/${store.id}`, { method: 'DELETE' });
            if (res.ok) {
                setToast({ message: 'Store deleted', type: 'success' });
                fetchData();
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to delete store', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error deleting store', type: 'error' });
        }
    }

    function formatAddress(store: StoreData) {
        const parts = [store.address, store.city, store.state, store.zipCode].filter(Boolean);
        return parts.join(', ') || 'No address';
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <p className="text-stone-400">Business not found</p>
                <Link href="/provider/owners" className="text-amber-400 hover:underline mt-2 inline-block">
                    Back to Owners
                </Link>
            </div>
        );
    }

    const { owner, llc, stores, storeCount, activeStores } = data;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
                <Link href="/provider/owners" className="text-stone-500 hover:text-stone-300 transition-colors">
                    Owners
                </Link>
                <span className="text-stone-600">/</span>
                <Link href={`/provider/owners/${ownerId}`} className="text-stone-500 hover:text-stone-300 transition-colors">
                    {owner.name || owner.email}
                </Link>
                <span className="text-stone-600">/</span>
                <span className="text-stone-300">{llc.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/provider/owners/${ownerId}`}
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-stone-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100">{llc.name}</h1>
                        <p className="text-stone-400 text-sm">{llc.businessType || 'Business'} • {storeCount} Store{storeCount !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/provider/clients/${llc.id}/config`}
                        className="px-4 py-2.5 text-stone-300 hover:text-stone-100 hover:bg-stone-700 rounded-xl font-medium flex items-center gap-2 transition-colors"
                    >
                        <Settings className="h-4 w-4" />
                        Business Settings
                    </Link>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-xl font-medium flex items-center gap-2 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Add Store
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <Store className="h-5 w-5" />
                        <span className="text-2xl font-bold">{storeCount}</span>
                    </div>
                    <p className="text-stone-500 text-sm">Total Stores</p>
                </div>
                <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 mb-1">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-2xl font-bold">{activeStores}</span>
                    </div>
                    <p className="text-stone-500 text-sm">Active</p>
                </div>
                <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <Monitor className="h-5 w-5" />
                        <span className="text-2xl font-bold">
                            {stores.reduce((sum, s) => sum + s.stationCount, 0)}
                        </span>
                    </div>
                    <p className="text-stone-500 text-sm">Stations</p>
                </div>
                <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <Users className="h-5 w-5" />
                        <span className="text-2xl font-bold">{llc.totalEmployees}</span>
                    </div>
                    <p className="text-stone-500 text-sm">Staff</p>
                </div>
            </div>

            {/* Section Title */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-200">Stores</h2>
            </div>

            {/* Empty State */}
            {stores.length === 0 ? (
                <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-12 text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 bg-emerald-500/10 rounded-2xl mb-4">
                        <Store className="h-8 w-8 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-stone-100 mb-2">No Stores Yet</h3>
                    <p className="text-stone-400 max-w-md mx-auto mb-6">
                        This business doesn't have any store locations. Add the first store to get started.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-xl font-semibold inline-flex items-center gap-2 transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Add First Store
                    </button>
                </div>
            ) : (
                /* Stores Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stores.map((store) => (
                        <Link
                            key={store.id}
                            href={`/provider/owners/${ownerId}/${llcId}/${store.id}`}
                            className="group bg-stone-800/50 border border-stone-700 rounded-2xl p-5 hover:border-emerald-500/50 hover:bg-stone-800 transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                        <Store className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-stone-100 group-hover:text-emerald-300 transition-colors">
                                            {store.name}
                                        </h3>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => openEditModal(store, e)}
                                        className="p-1.5 hover:bg-stone-700 rounded-lg text-stone-400 hover:text-stone-200 transition-colors"
                                        title="Edit Store"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteStore(store, e)}
                                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-stone-400 hover:text-red-400 transition-colors"
                                        title="Delete Store"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-1 ${store.isActive
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-stone-600/50 text-stone-400'
                                        }`}>
                                        {store.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="flex items-start gap-2 mb-4 text-sm text-stone-400">
                                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>{formatAddress(store)}</span>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-stone-900/50 rounded-lg p-2 text-center">
                                    <span className="text-sm font-bold text-blue-400">{store.stationCount}</span>
                                    <p className="text-stone-500 text-xs">Stations</p>
                                </div>
                                <div className="bg-stone-900/50 rounded-lg p-2 text-center">
                                    <span className="text-sm font-bold text-purple-400">{store.employeeCount}</span>
                                    <p className="text-stone-500 text-xs">Staff</p>
                                </div>
                            </div>

                            {/* Contact */}
                            {(store.phone || store.email) && (
                                <div className="text-xs text-stone-500 space-y-1">
                                    {store.phone && (
                                        <div className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> {store.phone}
                                        </div>
                                    )}
                                    {store.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" /> {store.email}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Link>
                    ))}
                </div>
            )}

            {/* Add Store Modal */}
            {showAddModal && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowAddModal(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-stone-800 border border-stone-700 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-stone-700">
                                <h3 className="text-lg font-semibold text-stone-100">Add New Store</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-stone-700 rounded-lg">
                                    <X className="h-5 w-5 text-stone-400" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <p className="text-stone-400 text-sm">
                                    Add a new store/location for <strong className="text-stone-200">{llc.name}</strong>
                                </p>

                                {/* Store Name */}
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-1.5">Store Name *</label>
                                    <input
                                        type="text"
                                        value={storeForm.name}
                                        onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                                        placeholder="e.g. Downtown Location"
                                        className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-1.5">Address</label>
                                    <input
                                        type="text"
                                        value={storeForm.address}
                                        onChange={e => setStoreForm({ ...storeForm, address: e.target.value })}
                                        placeholder="123 Main St, City, State 12345"
                                        className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="p-5 border-t border-stone-700 flex gap-3">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddStore}
                                    disabled={addingStore || !storeForm.name.trim()}
                                    className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-stone-900 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {addingStore ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            Create Store
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Edit Store Modal */}
            {showEditModal && editingStore && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowEditModal(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-stone-800 border border-stone-700 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-stone-700">
                                <h3 className="text-lg font-semibold text-stone-100">Edit Store</h3>
                                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-stone-700 rounded-lg">
                                    <X className="h-5 w-5 text-stone-400" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Store Name */}
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-1.5">Store Name *</label>
                                    <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        placeholder="e.g. Downtown Location"
                                        className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                {/* Address */}
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-1.5">Address</label>
                                    <input
                                        type="text"
                                        value={editForm.address}
                                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                        placeholder="123 Main St, City, State 12345"
                                        className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="p-5 border-t border-stone-700 flex gap-3">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditStore}
                                    disabled={saving || !editForm.name.trim()}
                                    className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-stone-900 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
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
