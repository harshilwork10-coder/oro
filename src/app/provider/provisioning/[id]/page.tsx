'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, MapPin, Loader2, Building2, Store, Monitor,
    Clock, CheckCircle, AlertCircle, Play, Plus, X, Copy, Check, RefreshCw
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface Station {
    id: string;
    name: string;
    pairingCode: string | null;
    paymentMode: string;
    isActive: boolean;
    createdAt: string;
}

interface ProvisioningTask {
    id: string;
    locationId: string;
    franchisorId: string;
    franchiseeBusinessId: string;
    requestedDevicesCount: number | null;
    notes: string | null;
    status: string;
    assignedToUserId: string | null;
    createdAt: string;
    updatedAt: string;
    location: {
        id: string;
        name: string;
        address: string | null;
        provisioningStatus: string;
        stations: Station[];
        franchise: { id: string; name: string };
    };
    franchisor: {
        id: string;
        name: string | null;
        owner: { name: string | null; email: string | null } | null;
    };
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
        OPEN: { bg: 'bg-amber-500/20 text-amber-400', icon: <AlertCircle size={14} />, label: 'Open' },
        IN_PROGRESS: { bg: 'bg-blue-500/20 text-blue-400', icon: <Play size={14} />, label: 'In Progress' },
        DONE: { bg: 'bg-emerald-500/20 text-emerald-400', icon: <CheckCircle size={14} />, label: 'Done' },
    };
    const config = colors[status] || colors.OPEN;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium ${config.bg}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

export default function ProvisioningDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [task, setTask] = useState<ProvisioningTask | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creatingStation, setCreatingStation] = useState(false);
    const [showAddStation, setShowAddStation] = useState(false);
    const [newStationName, setNewStationName] = useState('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        fetchTask();
    }, [id]);

    async function fetchTask() {
        try {
            const res = await fetch(`/api/provider/provisioning-tasks/${id}`);
            if (res.ok) {
                const data = await res.json();
                setTask(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch task:', error);
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(newStatus: string) {
        setSaving(true);
        try {
            const res = await fetch(`/api/provider/provisioning-tasks/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                const data = await res.json();
                setTask(prev => prev ? { ...prev, status: newStatus } : prev);
                setToast({ message: data.message || 'Status updated', type: 'success' });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to update status', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error updating status', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function createStation() {
        if (!task) return;

        setCreatingStation(true);
        try {
            const res = await fetch(`/api/provider/locations/${task.locationId}/stations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newStationName.trim() || null })
            });

            if (res.ok) {
                const data = await res.json();
                setTask(prev => prev ? {
                    ...prev,
                    location: {
                        ...prev.location,
                        stations: [...prev.location.stations, data.station]
                    }
                } : prev);
                setShowAddStation(false);
                setNewStationName('');
                setToast({ message: data.message || 'Station created', type: 'success' });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to create station', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error creating station', type: 'error' });
        } finally {
            setCreatingStation(false);
        }
    }

    // Regenerate pairing code for hardware replacement
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

    async function regenerateCode(stationId: string) {
        setRegeneratingId(stationId);
        try {
            const res = await fetch(`/api/provider/stations/${stationId}/admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'regenerate_code' })
            });

            if (res.ok) {
                const data = await res.json();
                // Update the station in local state with new code
                setTask(prev => prev ? {
                    ...prev,
                    location: {
                        ...prev.location,
                        stations: prev.location.stations.map(s =>
                            s.id === stationId ? { ...s, pairingCode: data.station.pairingCode } : s
                        )
                    }
                } : prev);
                setToast({ message: '🔄 New pairing code generated!', type: 'success' });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to regenerate code', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error regenerating code', type: 'error' });
        } finally {
            setRegeneratingId(null);
        }
    }

    function copyCode(code: string) {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-300">Task Not Found</h3>
            </div>
        );
    }

    const canMarkDone = task.location.stations.length > 0 && task.status !== 'DONE';

    return (
        <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <Link href="/provider/provisioning" className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-300 mb-6">
                <ArrowLeft size={16} />
                Back to Queue
            </Link>

            {/* Header */}
            <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Store className="h-6 w-6 text-amber-400" />
                            <h1 className="text-2xl font-bold text-stone-100">{task.location.name}</h1>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-stone-400">
                            <div className="flex items-center gap-1">
                                <Building2 size={14} />
                                <span>{task.franchisor.name || task.franchisor.owner?.name || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Store size={14} />
                                <span>{task.location.franchise.name}</span>
                            </div>
                            {task.location.address && (
                                <div className="flex items-center gap-1">
                                    <MapPin size={14} />
                                    <span>{task.location.address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <StatusBadge status={task.status} />
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-stone-800/50 rounded-xl">
                    <div>
                        <p className="text-xs text-stone-500 mb-1">Requested Devices</p>
                        <p className="text-lg font-medium text-stone-100">
                            {task.requestedDevicesCount || 'Not specified'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 mb-1">Stations Created</p>
                        <p className="text-lg font-medium text-stone-100">{task.location.stations.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 mb-1">Created</p>
                        <p className="text-lg font-medium text-stone-100">
                            {new Date(task.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                {task.notes && (
                    <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-400 mb-1">Notes from HQ:</p>
                        <p className="text-sm text-stone-300">{task.notes}</p>
                    </div>
                )}
            </div>

            {/* Stations Section */}
            <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-stone-100">Stations</h2>
                    <button
                        onClick={() => setShowAddStation(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-lg text-sm font-medium"
                    >
                        <Plus size={14} />
                        Add Station
                    </button>
                </div>

                {task.location.stations.length === 0 ? (
                    <div className="text-center py-8 bg-stone-800/30 rounded-xl">
                        <Monitor className="h-10 w-10 text-stone-600 mx-auto mb-3" />
                        <p className="text-stone-400">No stations yet. Create stations to generate pairing codes.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {task.location.stations.map((station) => (
                            <div key={station.id} className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Monitor className="h-5 w-5 text-stone-500" />
                                    <div>
                                        <p className="font-medium text-stone-100">{station.name}</p>
                                        <p className="text-xs text-stone-500">
                                            {station.paymentMode === 'DEDICATED' ? 'Has Terminal' : 'Cash Only'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Regenerate button for hardware replacement */}
                                    <button
                                        onClick={() => regenerateCode(station.id)}
                                        disabled={regeneratingId === station.id}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs"
                                        title="Regenerate pairing code (for new hardware)"
                                    >
                                        <RefreshCw size={12} className={regeneratingId === station.id ? 'animate-spin' : ''} />
                                        New Code
                                    </button>

                                    {station.pairingCode ? (
                                        <button
                                            onClick={() => copyCode(station.pairingCode!)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm font-mono"
                                        >
                                            {copiedCode === station.pairingCode ? (
                                                <>
                                                    <Check size={14} className="text-emerald-400" />
                                                    <span className="text-emerald-400">Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} className="text-stone-400" />
                                                    <span className="text-amber-400">{station.pairingCode}</span>
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <span className="text-stone-600 text-sm">No code</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
                {task.status === 'OPEN' && (
                    <button
                        onClick={() => updateStatus('IN_PROGRESS')}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play size={16} />}
                        Start Provisioning
                    </button>
                )}
                {canMarkDone && (
                    <button
                        onClick={() => updateStatus('DONE')}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle size={16} />}
                        Mark as Done
                    </button>
                )}
                {task.status === 'DONE' && (
                    <div className="flex-1 px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-center font-medium flex items-center justify-center gap-2">
                        <CheckCircle size={16} />
                        Provisioning Complete
                    </div>
                )}
            </div>

            {/* Add Station Modal */}
            {showAddStation && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-stone-100">Add Station</h2>
                            <button onClick={() => setShowAddStation(false)} className="text-stone-500 hover:text-stone-300">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">
                                Station Name (optional)
                            </label>
                            <input
                                type="text"
                                value={newStationName}
                                onChange={e => setNewStationName(e.target.value)}
                                placeholder="e.g., Register 1 (auto-generated if blank)"
                                className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAddStation(false)}
                                className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createStation}
                                disabled={creatingStation}
                                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-stone-900 rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                {creatingStation ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {creatingStation ? 'Creating...' : 'Create Station'}
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
