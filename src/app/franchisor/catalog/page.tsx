'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Scissors, FolderTree, Search, MoreHorizontal, X, Loader2, RefreshCw, Clock, DollarSign, Edit2, Trash2 } from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface BrandService {
    id: string;
    name: string;
    description: string | null;
    duration: number;
    basePrice: number;
    priceMode: string;
    tierShortPrice: number | null;
    tierMediumPrice: number | null;
    tierLongPrice: number | null;
    commissionable: boolean;
    taxTreatmentOverride: string | null;
    isAddOn: boolean;
    isActive: boolean;
    categoryId: string | null;
    category?: { id: string; name: string } | null;
}

interface BrandCategory {
    id: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    services: BrandService[];
}

type CatalogTab = 'services' | 'categories';

export default function CatalogPage() {
    const [activeTab, setActiveTab] = useState<CatalogTab>('services');
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<BrandCategory[]>([]);
    const [uncategorizedServices, setUncategorizedServices] = useState<BrandService[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Modal states
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingService, setEditingService] = useState<BrandService | null>(null);
    const [saving, setSaving] = useState(false);

    // Service form
    const [serviceForm, setServiceForm] = useState({
        name: '',
        description: '',
        duration: 30,
        basePrice: 0,
        priceMode: 'FIXED',
        tierShortPrice: '',
        tierMediumPrice: '',
        tierLongPrice: '',
        commissionable: true,
        categoryId: '',
        isAddOn: false
    });

    // Category form
    const [categoryName, setCategoryName] = useState('');

    const fetchCatalog = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/franchisor/catalog');
            if (res.ok) {
                const response = await res.json();
                // API returns { success: true, data: { categories, uncategorizedServices } }
                const data = response.data || response;
                setCategories(data.categories || []);
                setUncategorizedServices(data.uncategorizedServices || []);
            }
        } catch (err) {
            console.error('Failed to fetch catalog:', err);
            setToast({ message: 'Failed to load catalog', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

    const allServices = [
        ...uncategorizedServices,
        ...categories.flatMap(c => c.services)
    ];

    const filteredServices = allServices.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/franchisor/catalog/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applyPriceUpdates: false })
            });
            if (res.ok) {
                const data = await res.json();
                setToast({ message: `Synced to ${data.stats.locationsProcessed} locations`, type: 'success' });
            } else {
                setToast({ message: 'Sync failed', type: 'error' });
            }
        } catch {
            setToast({ message: 'Sync error', type: 'error' });
        } finally {
            setSyncing(false);
        }
    };

    const openAddService = () => {
        setEditingService(null);
        setServiceForm({
            name: '', description: '', duration: 30, basePrice: 0,
            priceMode: 'FIXED', tierShortPrice: '', tierMediumPrice: '', tierLongPrice: '',
            commissionable: true, categoryId: '', isAddOn: false
        });
        setShowServiceModal(true);
    };

    const openEditService = (service: BrandService) => {
        setEditingService(service);
        setServiceForm({
            name: service.name,
            description: service.description || '',
            duration: service.duration,
            basePrice: service.basePrice,
            priceMode: service.priceMode,
            tierShortPrice: service.tierShortPrice?.toString() || '',
            tierMediumPrice: service.tierMediumPrice?.toString() || '',
            tierLongPrice: service.tierLongPrice?.toString() || '',
            commissionable: service.commissionable,
            categoryId: service.categoryId || '',
            isAddOn: service.isAddOn
        });
        setShowServiceModal(true);
    };

    const handleSaveService = async () => {
        if (!serviceForm.name || serviceForm.basePrice <= 0) {
            setToast({ message: 'Name and price required', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const url = editingService
                ? `/api/franchisor/catalog/services/${editingService.id}`
                : '/api/franchisor/catalog';
            const method = editingService ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...serviceForm,
                    tierShortPrice: serviceForm.tierShortPrice ? parseFloat(serviceForm.tierShortPrice) : null,
                    tierMediumPrice: serviceForm.tierMediumPrice ? parseFloat(serviceForm.tierMediumPrice) : null,
                    tierLongPrice: serviceForm.tierLongPrice ? parseFloat(serviceForm.tierLongPrice) : null,
                    categoryId: serviceForm.categoryId || null
                })
            });

            if (res.ok) {
                setToast({ message: editingService ? 'Service updated' : 'Service created', type: 'success' });
                setShowServiceModal(false);
                fetchCatalog();
            } else {
                setToast({ message: 'Failed to save', type: 'error' });
            }
        } catch {
            setToast({ message: 'Error saving service', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('Archive this service? It will be hidden from locations.')) return;

        try {
            const res = await fetch(`/api/franchisor/catalog/services/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setToast({ message: 'Service archived', type: 'success' });
                fetchCatalog();
            }
        } catch {
            setToast({ message: 'Failed to archive', type: 'error' });
        }
    };

    const handleAddCategory = async () => {
        if (!categoryName.trim()) return;

        setSaving(true);
        try {
            const res = await fetch('/api/franchisor/catalog/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: categoryName })
            });

            if (res.ok) {
                setToast({ message: 'Category created', type: 'success' });
                setShowCategoryModal(false);
                setCategoryName('');
                fetchCatalog();
            }
        } catch {
            setToast({ message: 'Failed to create category', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const getPriceModeLabel = (mode: string) => {
        switch (mode) {
            case 'FIXED': return 'Fixed';
            case 'FROM': return 'From';
            case 'TIERED': return 'Tiered';
            default: return mode;
        }
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brand Catalog</h1>
                <div className="flex gap-2">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
                    >
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                        Sync to Locations
                    </button>
                    <button
                        onClick={activeTab === 'services' ? openAddService : () => setShowCategoryModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus size={16} />
                        {activeTab === 'services' ? 'Add Service' : 'Add Category'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
                <button
                    onClick={() => setActiveTab('services')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'services'
                        ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <Scissors size={16} />
                    Services ({allServices.length})
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'categories'
                        ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <FolderTree size={16} />
                    Categories ({categories.length})
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
                </div>
            ) : activeTab === 'services' ? (
                <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Service Name</th>
                                <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Duration</th>
                                <th className="px-4 py-3 text-right text-[var(--text-muted)] font-medium">Price</th>
                                <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Mode</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Category</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredServices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">
                                        No services found. Add your first service!
                                    </td>
                                </tr>
                            ) : (
                                filteredServices.map((service) => (
                                    <tr key={service.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-[var(--text-primary)]">{service.name}</div>
                                            {service.description && (
                                                <div className="text-xs text-[var(--text-muted)] mt-0.5">{service.description}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-[var(--text-secondary)]">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock size={12} />
                                                {service.duration} min
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="inline-flex items-center gap-1 text-[var(--text-primary)] font-medium">
                                                <DollarSign size={12} />
                                                {Number(service.basePrice).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${service.priceMode === 'TIERED'
                                                ? 'bg-purple-500/20 text-purple-400'
                                                : service.priceMode === 'FROM'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-emerald-500/20 text-emerald-400'
                                                }`}>
                                                {getPriceModeLabel(service.priceMode)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                                            {service.category?.name || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditService(service)}
                                                    className="p-1.5 rounded hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteService(service.id)}
                                                    className="p-1.5 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid gap-4">
                    {categories.length === 0 ? (
                        <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                            <FolderTree size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">No Categories Yet</h3>
                            <p className="text-[var(--text-secondary)] mt-2">Add categories to organize services</p>
                        </div>
                    ) : (
                        categories.map(cat => (
                            <div key={cat.id} className="glass-panel rounded-xl border border-[var(--border)] p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-[var(--text-primary)]">{cat.name}</h3>
                                    <span className="text-sm text-[var(--text-muted)]">{cat.services.length} services</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Add/Edit Service Modal */}
            {showServiceModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50">
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                                {editingService ? 'Edit Service' : 'Add Service'}
                            </h2>
                            <button onClick={() => setShowServiceModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Service Name *</label>
                                <input
                                    type="text"
                                    value={serviceForm.name}
                                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                                    placeholder="e.g. Haircut"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                                <input
                                    type="text"
                                    value={serviceForm.description}
                                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                                    placeholder="Optional description"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Duration (min) *</label>
                                    <input
                                        type="number"
                                        value={serviceForm.duration}
                                        onChange={(e) => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Base Price *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={serviceForm.basePrice}
                                        onChange={(e) => setServiceForm({ ...serviceForm, basePrice: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Price Mode</label>
                                <select
                                    value={serviceForm.priceMode}
                                    onChange={(e) => setServiceForm({ ...serviceForm, priceMode: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                                >
                                    <option value="FIXED">Fixed - One price</option>
                                    <option value="FROM">From - Starting at (shows &quot;from $X&quot;)</option>
                                    <option value="TIERED">Tiered - Short/Medium/Long</option>
                                </select>
                            </div>
                            {serviceForm.priceMode === 'TIERED' && (
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Short</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={serviceForm.tierShortPrice}
                                            onChange={(e) => setServiceForm({ ...serviceForm, tierShortPrice: e.target.value })}
                                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                                            placeholder="$"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Medium</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={serviceForm.tierMediumPrice}
                                            onChange={(e) => setServiceForm({ ...serviceForm, tierMediumPrice: e.target.value })}
                                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                                            placeholder="$"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-[var(--text-muted)] mb-1">Long</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={serviceForm.tierLongPrice}
                                            onChange={(e) => setServiceForm({ ...serviceForm, tierLongPrice: e.target.value })}
                                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                                            placeholder="$"
                                        />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category</label>
                                <select
                                    value={serviceForm.categoryId}
                                    onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
                                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                                >
                                    <option value="">No category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                    <input
                                        type="checkbox"
                                        checked={serviceForm.commissionable}
                                        onChange={(e) => setServiceForm({ ...serviceForm, commissionable: e.target.checked })}
                                        className="rounded border-[var(--border)]"
                                    />
                                    Commissionable
                                </label>
                                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                    <input
                                        type="checkbox"
                                        checked={serviceForm.isAddOn}
                                        onChange={(e) => setServiceForm({ ...serviceForm, isAddOn: e.target.checked })}
                                        className="rounded border-[var(--border)]"
                                    />
                                    Add-on Service
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)]">
                            <button
                                onClick={() => setShowServiceModal(false)}
                                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveService}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                {editingService ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] w-full max-w-sm shadow-2xl shadow-black/50">
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Category</h2>
                            <button onClick={() => setShowCategoryModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4">
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Category Name</label>
                            <input
                                type="text"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
                                placeholder="e.g. Haircuts"
                            />
                        </div>
                        <div className="flex justify-end gap-2 p-4 border-t border-[var(--border)]">
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddCategory}
                                disabled={saving || !categoryName.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
