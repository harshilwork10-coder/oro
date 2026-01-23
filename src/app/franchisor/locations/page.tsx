'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, MapPin, ChevronRight, Plus, Loader2, X, Building2, Store, Monitor, BarChart3
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface Franchisee {
    id: string;
    name: string;
}

interface Location {
    id: string;
    name: string;
    address: string | null;
    franchiseeId: string;
    franchiseeName: string;
    provisioningStatus: string;
    stationCount: number;
    createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, { bg: string; label: string }> = {
        PROVISIONING_PENDING: { bg: 'bg-amber-500/20 text-amber-400', label: 'Pending' },
        READY_FOR_INSTALL: { bg: 'bg-blue-500/20 text-blue-400', label: 'Ready' },
        ACTIVE: { bg: 'bg-emerald-500/20 text-emerald-400', label: 'Active' },
        SUSPENDED: { bg: 'bg-red-500/20 text-red-400', label: 'Suspended' },
    };
    const config = colors[status] || colors.PROVISIONING_PENDING;
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg}`}>
            {config.label}
        </span>
    );
}

export default function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Add Location Form
    const [newLocation, setNewLocation] = useState({
        franchiseeId: '',
        name: '',
        address: '',
        requestedDevicesCount: 1,
        notes: ''
    });

    // Fetch data
    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const [locRes, franchiseesRes] = await Promise.all([
                fetch('/api/franchisor/locations'),
                fetch('/api/franchisor/franchisees')
            ]);

            if (locRes.ok) {
                const data = await locRes.json();
                setLocations(data.data || []);
            }

            if (franchiseesRes.ok) {
                const data = await franchiseesRes.json();
                setFranchisees(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddLocation() {
        if (!newLocation.franchiseeId) {
            setToast({ message: 'Please select a franchisee LLC', type: 'error' });
            return;
        }
        if (!newLocation.name.trim()) {
            setToast({ message: 'Location name is required', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/franchisor/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseeId: newLocation.franchiseeId,
                    name: newLocation.name.trim(),
                    address: newLocation.address.trim() || null,
                    requestedDevicesCount: newLocation.requestedDevicesCount,
                    notes: newLocation.notes.trim() || null
                })
            });

            if (res.ok) {
                const data = await res.json();
                setLocations(prev => [data.location, ...prev]);
                setShowAddModal(false);
                setNewLocation({ franchiseeId: '', name: '', address: '', requestedDevicesCount: 1, notes: '' });
                setToast({ message: data.message || 'Location created!', type: 'success' });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to create location', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error creating location', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    const filteredLocations = locations.filter(loc =>
        !searchQuery || loc.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                <h1 className="text-2xl font-bold text-stone-100">Locations</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    Add Location
                </button>
            </div>

            {/* Status Timeline Legend */}
            <div className="flex items-center gap-6 mb-6 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span className="text-stone-400">Pending → </span>
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-stone-400">Ready → </span>
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-stone-400">Active</span>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search locations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 pl-9 pr-4 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {filteredLocations.length === 0 && (
                <div className="text-center py-12 bg-stone-900/50 border border-stone-800 rounded-xl">
                    <MapPin className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-stone-300 mb-2">No Locations Yet</h3>
                    <p className="text-stone-500 mb-4">
                        {franchisees.length === 0
                            ? 'Add a franchisee first, then add locations.'
                            : 'Add your first location to get started.'
                        }
                    </p>
                    {franchisees.length > 0 && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-lg text-sm font-medium"
                        >
                            Add Location
                        </button>
                    )}
                </div>
            )}

            {/* Table */}
            {filteredLocations.length > 0 && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-stone-800 bg-stone-800/50">
                                <th className="px-4 py-3 text-left text-stone-500 font-medium">Location Name</th>
                                <th className="px-4 py-3 text-left text-stone-500 font-medium">Franchisee</th>
                                <th className="px-4 py-3 text-left text-stone-500 font-medium">Address</th>
                                <th className="px-4 py-3 text-left text-stone-500 font-medium">Status</th>
                                <th className="px-4 py-3 text-center text-stone-500 font-medium">Stations</th>
                                <th className="px-4 py-3 text-center text-stone-500 font-medium">Reports</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLocations.map((location) => (
                                <tr key={location.id} className="border-b border-stone-800 hover:bg-stone-800/30 cursor-pointer">
                                    <td className="px-4 py-3">
                                        <Link href={`/franchisor/locations/${location.id}`} className="flex items-center gap-2 hover:text-amber-400">
                                            <Store size={16} className="text-stone-500" />
                                            <span className="font-medium text-stone-100">{location.name}</span>
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-stone-400">{location.franchiseeName}</td>
                                    <td className="px-4 py-3 text-stone-500 text-xs">{location.address || '—'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={location.provisioningStatus} /></td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center gap-1 text-stone-400">
                                            <Monitor size={12} />
                                            {location.stationCount}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Link
                                            href={`/franchisor/locations/${location.id}/reports`}
                                            className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded text-xs font-medium transition-colors"
                                        >
                                            <BarChart3 size={12} />
                                            View
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3"><ChevronRight size={16} className="text-stone-600" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Location Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-stone-100">Add Location</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-stone-500 hover:text-stone-300">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Franchisee Selection - REQUIRED */}
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">
                                    Franchisee LLC <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <select
                                        value={newLocation.franchiseeId}
                                        onChange={e => setNewLocation({ ...newLocation, franchiseeId: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 appearance-none"
                                    >
                                        <option value="">Select franchisee...</option>
                                        {franchisees.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {franchisees.length === 0 && (
                                    <p className="text-amber-400 text-xs mt-1">
                                        No franchisees yet. <Link href="/franchisor/franchisees" className="underline">Add one first</Link>
                                    </p>
                                )}
                            </div>

                            {/* Location Name */}
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">
                                    Location Name <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <input
                                        type="text"
                                        value={newLocation.name}
                                        onChange={e => setNewLocation({ ...newLocation, name: e.target.value })}
                                        placeholder="e.g., Downtown Austin"
                                        className="w-full pl-9 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">
                                    Address
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <input
                                        type="text"
                                        value={newLocation.address}
                                        onChange={e => setNewLocation({ ...newLocation, address: e.target.value })}
                                        placeholder="e.g., 123 Main St, Austin, TX"
                                        className="w-full pl-9 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Requested Devices */}
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">
                                    Requested POS Terminals
                                </label>
                                <div className="relative">
                                    <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={newLocation.requestedDevicesCount}
                                        onChange={e => setNewLocation({ ...newLocation, requestedDevicesCount: parseInt(e.target.value) || 1 })}
                                        className="w-full pl-9 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">
                                    Notes for Provider
                                </label>
                                <textarea
                                    value={newLocation.notes}
                                    onChange={e => setNewLocation({ ...newLocation, notes: e.target.value })}
                                    placeholder="Any special instructions..."
                                    rows={2}
                                    className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddLocation}
                                disabled={saving || franchisees.length === 0}
                                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-stone-900 rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {saving ? 'Creating...' : 'Create Location'}
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
