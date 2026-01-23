'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, DollarSign, Clock, Lock, Unlock, RotateCcw, Edit2, Loader2, Check } from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface ResolvedService {
    id: string;
    name: string;
    description: string | null;
    duration: number;
    price: number;
    cashPrice: number;
    cardPrice: number | null;
    priceMode: string;
    tierShortPrice: number | null;
    tierMediumPrice: number | null;
    tierLongPrice: number | null;
    commissionable: boolean;
    isEnabled: boolean;
    isLocked: boolean;
    hasOverride: boolean;
    brandServiceId: string;
    category?: { id: string; name: string } | null;
}

export default function BrandServicesPage() {
    const [services, setServices] = useState<ResolvedService[]>([]);
    const [loading, setLoading] = useState(true);
    const [locationId, setLocationId] = useState<string | null>(null);
    const [canCustomizePricing, setCanCustomizePricing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Override modal
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState<ResolvedService | null>(null);
    const [saving, setSaving] = useState(false);
    const [overrideForm, setOverrideForm] = useState({
        price: '',
        duration: '',
        isEnabled: true,
        isLocked: false
    });

    // Get location ID on mount
    useEffect(() => {
        const getLocation = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const user = await res.json();
                    const locId = user.locationId || user.locations?.[0]?.id;
                    setLocationId(locId);
                }
            } catch (err) {
                console.error('Failed to get location:', err);
            }
        };
        getLocation();
    }, []);

    const fetchServices = useCallback(async () => {
        if (!locationId) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/franchise/catalog?locationId=${locationId}`);
            if (res.ok) {
                const data = await res.json();
                setServices(data.services || []);
                setCanCustomizePricing(data.canCustomizePricing || false);
            }
        } catch (err) {
            console.error('Failed to fetch brand services:', err);
            setToast({ message: 'Failed to load brand catalog', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [locationId]);

    useEffect(() => {
        if (locationId) fetchServices();
    }, [locationId, fetchServices]);

    const openOverrideModal = (service: ResolvedService) => {
        setEditingService(service);
        setOverrideForm({
            price: service.hasOverride ? service.price.toString() : '',
            duration: service.hasOverride ? service.duration.toString() : '',
            isEnabled: service.isEnabled,
            isLocked: service.isLocked
        });
        setShowModal(true);
    };

    const handleSaveOverride = async () => {
        if (!editingService || !locationId) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/franchise/catalog/${editingService.brandServiceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId,
                    price: overrideForm.price ? parseFloat(overrideForm.price) : null,
                    duration: overrideForm.duration ? parseInt(overrideForm.duration) : null,
                    isEnabled: overrideForm.isEnabled,
                    isLocked: overrideForm.isLocked
                })
            });

            if (res.ok) {
                setToast({ message: 'Override saved', type: 'success' });
                setShowModal(false);
                fetchServices();
            } else {
                setToast({ message: 'Failed to save', type: 'error' });
            }
        } catch {
            setToast({ message: 'Error saving override', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleResetToBrand = async (service: ResolvedService) => {
        if (!confirm('Reset to brand values? Your customizations will be removed.')) return;
        if (!locationId) return;

        try {
            const res = await fetch(`/api/franchise/catalog/${service.brandServiceId}?locationId=${locationId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setToast({ message: 'Reset to brand values', type: 'success' });
                fetchServices();
            }
        } catch {
            setToast({ message: 'Failed to reset', type: 'error' });
        }
    };

    const handleToggleLock = async (service: ResolvedService) => {
        if (!locationId) return;

        try {
            const res = await fetch(`/api/franchise/catalog/${service.brandServiceId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId,
                    isLocked: !service.isLocked
                })
            });

            if (res.ok) {
                setToast({ message: service.isLocked ? 'Unlocked' : 'Locked from brand updates', type: 'success' });
                fetchServices();
            }
        } catch {
            setToast({ message: 'Failed to update lock', type: 'error' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-stone-950">
                <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
        );
    }

    if (!locationId) {
        return (
            <div className="p-8 bg-stone-950 min-h-screen">
                <div className="text-center py-16">
                    <Building2 size={48} className="mx-auto text-stone-600 mb-4" />
                    <h2 className="text-xl font-semibold text-white">No Location Found</h2>
                    <p className="text-stone-400 mt-2">You need to be assigned to a location to view brand services.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 bg-stone-950 min-h-screen">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-orange-500" />
                    Brand Catalog
                </h1>
                <p className="text-stone-400 mt-2">
                    Services from your franchisor. Customize prices for your location or use brand defaults.
                </p>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-6 text-sm">
                <span className="flex items-center gap-2 text-stone-400">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    Using Brand Price
                </span>
                <span className="flex items-center gap-2 text-stone-400">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    Custom Override
                </span>
                <span className="flex items-center gap-2 text-stone-400">
                    <Lock size={12} />
                    Locked (Won&apos;t Update)
                </span>
            </div>

            {services.length === 0 ? (
                <div className="glass-panel rounded-xl p-16 text-center">
                    <Building2 size={64} className="mx-auto text-stone-600 mb-4" />
                    <h2 className="text-xl font-semibold text-white">No Brand Services</h2>
                    <p className="text-stone-400 mt-2">Your franchisor hasn&apos;t added any services to the brand catalog yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {services.map(service => (
                        <div
                            key={service.id}
                            className={`glass-panel p-5 rounded-xl border-2 transition-all ${service.hasOverride
                                ? 'border-purple-500/50 bg-purple-500/5'
                                : 'border-stone-800'
                                } ${!service.isEnabled ? 'opacity-50' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-white">{service.name}</h3>
                                        {service.isLocked && <Lock size={14} className="text-amber-400" />}
                                    </div>
                                    <p className="text-xs text-stone-500 uppercase">
                                        {service.category?.name || 'UNCATEGORIZED'}
                                    </p>
                                </div>
                                {service.hasOverride && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded">
                                        Custom
                                    </span>
                                )}
                            </div>

                            {service.description && (
                                <p className="text-sm text-stone-400 mb-3 line-clamp-2">{service.description}</p>
                            )}

                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-1 text-stone-400 text-sm">
                                    <Clock size={14} />
                                    {service.duration} min
                                </div>
                                <div className="flex items-center gap-1">
                                    <DollarSign size={16} className="text-emerald-400" />
                                    <span className="text-xl font-bold text-emerald-400">
                                        {service.price.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2">
                                {canCustomizePricing ? (
                                    <button
                                        onClick={() => openOverrideModal(service)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Edit2 size={14} />
                                        Customize
                                    </button>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-800/50 text-stone-500 rounded-lg text-sm font-medium cursor-not-allowed">
                                        <Lock size={14} />
                                        Locked by HQ
                                    </div>
                                )}
                                {service.hasOverride && (
                                    <button
                                        onClick={() => handleResetToBrand(service)}
                                        className="p-2 bg-stone-800 hover:bg-amber-600/20 text-stone-400 hover:text-amber-400 rounded-lg transition-colors"
                                        title="Reset to brand values"
                                    >
                                        <RotateCcw size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleToggleLock(service)}
                                    className={`p-2 rounded-lg transition-colors ${service.isLocked
                                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                        : 'bg-stone-800 text-stone-400 hover:text-white'
                                        }`}
                                    title={service.isLocked ? 'Unlock for brand updates' : 'Lock to prevent brand updates'}
                                >
                                    {service.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Override Modal */}
            {showModal && editingService && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800">
                        <div className="p-4 border-b border-stone-800">
                            <h2 className="text-xl font-bold text-white">Customize: {editingService.name}</h2>
                            <p className="text-sm text-stone-400 mt-1">Leave blank to use brand defaults</p>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    Your Price (Brand: ${editingService.price.toFixed(2)})
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={overrideForm.price}
                                    onChange={(e) => setOverrideForm({ ...overrideForm, price: e.target.value })}
                                    placeholder={`Brand: $${editingService.price.toFixed(2)}`}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white placeholder-stone-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    Duration (Brand: {editingService.duration} min)
                                </label>
                                <input
                                    type="number"
                                    value={overrideForm.duration}
                                    onChange={(e) => setOverrideForm({ ...overrideForm, duration: e.target.value })}
                                    placeholder={`Brand: ${editingService.duration} min`}
                                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white placeholder-stone-600"
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-stone-300">
                                    <input
                                        type="checkbox"
                                        checked={overrideForm.isEnabled}
                                        onChange={(e) => setOverrideForm({ ...overrideForm, isEnabled: e.target.checked })}
                                        className="rounded border-stone-700"
                                    />
                                    Enabled at this location
                                </label>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                <input
                                    type="checkbox"
                                    checked={overrideForm.isLocked}
                                    onChange={(e) => setOverrideForm({ ...overrideForm, isLocked: e.target.checked })}
                                    className="rounded border-amber-600"
                                />
                                <div>
                                    <span className="text-amber-200 font-medium">Lock from brand updates</span>
                                    <p className="text-xs text-amber-400/70">Prevent franchisor syncs from changing your customizations</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 p-4 border-t border-stone-800">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveOverride}
                                disabled={saving}
                                className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Save Override
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
