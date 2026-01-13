'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    Plus, Search, Edit2, Trash2, MapPin, Building2, RefreshCw,
    Users, Receipt, X, Save, Loader2, ChevronDown
} from 'lucide-react';

interface Location {
    id: string;
    name: string;
    address: string | null;
    franchiseId?: string | null;
    franchise?: {
        id: string;
        name: string;
        franchisorId?: string | null;
        franchisor?: {
            id: string;
            name: string;
            owner?: {
                name: string;
                email: string;
            } | null;
        } | null;
    } | null;
    _count?: {
        users: number;
    };
    createdAt: string;
}

interface Franchisor {
    id: string;
    name: string;
    franchises: {
        id: string;
        name: string;
    }[];
}

export default function ProviderStoresPage() {
    const { data: session } = useSession();
    const [locations, setLocations] = useState<Location[]>([]);
    const [franchisors, setFranchisors] = useState<Franchisor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFranchisor, setFilterFranchisor] = useState<string>('all');

    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        franchiseId: ''
    });

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchLocations();
        fetchFranchisors();
    }, []);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/admin/locations');
            if (res.ok) {
                const data = await res.json();
                setLocations(data.locations || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchFranchisors = async () => {
        try {
            const res = await fetch('/api/admin/franchisors');
            if (res.ok) {
                const data = await res.json();
                setFranchisors(data.data || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = editingLocation
                ? `/api/admin/locations/${editingLocation.id}`
                : '/api/admin/locations';

            const method = editingLocation ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setToast({
                    message: editingLocation ? 'Location updated!' : 'Location created!',
                    type: 'success'
                });
                fetchLocations();
                closeModal();
            } else {
                const data = await res.json();
                setToast({ message: data.error || 'Failed to save', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (location: Location) => {
        if (!confirm(`Delete "${location.name}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/locations/${location.id}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                setToast({ message: 'Location deleted', type: 'success' });
                fetchLocations();
            } else {
                setToast({ message: data.error || 'Failed to delete', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'An error occurred', type: 'error' });
        }
    };

    const openAddModal = () => {
        setEditingLocation(null);
        setFormData({ name: '', address: '', franchiseId: '' });
        setShowAddModal(true);
    };

    const openEditModal = (location: Location) => {
        setEditingLocation(location);
        setFormData({
            name: location.name,
            address: location.address || '',
            franchiseId: location.franchise?.id || ''
        });
        setShowAddModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingLocation(null);
        setFormData({ name: '', address: '', franchiseId: '' });
    };

    // Get all franchises across all franchisors for the dropdown
    const allFranchises = franchisors.flatMap(f =>
        (f.franchises || []).map(fr => ({
            ...fr,
            franchisorName: f.name
        }))
    );

    const filteredLocations = locations.filter(loc => {
        const matchesSearch =
            loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.franchise?.franchisor?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterFranchisor === 'all') return matchesSearch;
        return matchesSearch && loc.franchise?.franchisor?.id === filterFranchisor;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw size={32} className="animate-spin text-stone-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">All Stores</h1>
                    <p className="text-sm text-stone-400 mt-1">
                        Manage locations across all clients • {locations.length} total stores
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchLocations}
                        className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium"
                    >
                        <Plus size={16} />
                        Add Store
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search stores, clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 pl-9 pr-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
                <select
                    value={filterFranchisor}
                    onChange={(e) => setFilterFranchisor(e.target.value)}
                    className="bg-stone-800 border border-stone-700 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                    <option value="all">All Clients</option>
                    {franchisors.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                    <p className="text-sm text-stone-400">Total Stores</p>
                    <p className="text-2xl font-bold text-stone-100">{locations.length}</p>
                </div>
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                    <p className="text-sm text-stone-400">Total Clients</p>
                    <p className="text-2xl font-bold text-stone-100">{franchisors.length}</p>
                </div>
                <div className="bg-stone-900/50 rounded-xl border border-emerald-500/30 p-4">
                    <p className="text-sm text-stone-400">Total Staff</p>
                    <p className="text-2xl font-bold text-emerald-400">
                        {locations.reduce((sum, l) => sum + (l._count?.users || 0), 0)}
                    </p>
                </div>
            </div>

            {/* Stores List */}
            {filteredLocations.length === 0 ? (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                    <MapPin size={48} className="mx-auto text-stone-600 mb-4" />
                    <h2 className="text-lg font-semibold text-stone-100">No stores found</h2>
                    <p className="text-stone-400 mt-2">Add a new store or adjust your filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLocations.map((location) => (
                        <div
                            key={location.id}
                            className="bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden hover:border-stone-700 transition-colors"
                        >
                            <div className="p-4 border-b border-stone-800">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                            <MapPin size={20} className="text-orange-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-stone-100">{location.name}</h3>
                                            <p className="text-xs text-stone-500">{location.address || 'No address'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openEditModal(location)}
                                            className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(location)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg text-stone-400 hover:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Building2 size={14} className="text-stone-500" />
                                    <span className="text-stone-300">{location.franchise?.franchisor?.name || 'Unknown Client'}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-stone-500">
                                    <span className="flex items-center gap-1">
                                        <Users size={12} />
                                        {location._count?.users || 0} staff
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-stone-100">
                                {editingLocation ? 'Edit Store' : 'Add New Store'}
                            </h2>
                            <button onClick={closeModal} className="text-stone-400 hover:text-stone-200">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1.5">
                                    Client / Franchise
                                </label>
                                <select
                                    value={formData.franchiseId}
                                    onChange={(e) => setFormData({ ...formData, franchiseId: e.target.value })}
                                    required
                                    disabled={!!editingLocation}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                                >
                                    <option value="">Select a client...</option>
                                    {allFranchises.map(f => (
                                        <option key={f.id} value={f.id}>
                                            {f.franchisorName} - {f.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1.5">
                                    Store Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="Main Street Location"
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1.5">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="123 Main St, City, State ZIP"
                                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-3 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            {editingLocation ? 'Update' : 'Create'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                    }`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    );
}
