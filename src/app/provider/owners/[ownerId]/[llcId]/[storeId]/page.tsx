'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Store, MapPin, Monitor, Users, FileText,
    CheckCircle, XCircle, Clock, Phone, Mail, Plus, Settings,
    Upload, Download, Trash2, AlertCircle, Calendar, Receipt
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface StationData {
    id: string;
    name: string;
    pairingCode: string;
    isActive: boolean;
    createdAt: string;
}

interface EmployeeData {
    id: string;
    userId: string;
    name: string | null;
    email: string;
}

interface DocumentData {
    id: string;
    type: string;
    fileName: string;
    fileUrl: string;
    status: string;
    expiresAt: string | null;
    createdAt: string;
}

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
    hoursOfOperation: string | null;
    timezone: string | null;
    createdAt: string;
    updatedAt: string;
    franchiseId: string;
    franchiseSlug: string;
}

interface TaxJurisdiction {
    id: string;
    jurisdictionId: string;
    displayName: string | null;
    jurisdiction: { name: string; code: string; rate: number; type: string };
    isActive: boolean;
    priority: number;
    appliesProducts: boolean;
    appliesServices: boolean;
    appliesFood: boolean;
    appliesAlcohol: boolean;
}

interface PageData {
    owner: { id: string; name: string | null; email: string };
    llc: { id: string; name: string; businessType: string };
    store: StoreData;
    stations: StationData[];
    employees: EmployeeData[];
    documents: DocumentData[];
    taxJurisdictions?: TaxJurisdiction[];
}

export default function StoreDetailsPage() {
    const params = useParams();
    const ownerId = params.ownerId as string;
    const llcId = params.llcId as string;
    const storeId = params.storeId as string;

    const [data, setData] = useState<PageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'stations' | 'documents' | 'taxes'>('overview');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [savingTax, setSavingTax] = useState(false);

    // Add Tax Jurisdiction Modal State
    const [showAddTaxModal, setShowAddTaxModal] = useState(false);
    const [taxForm, setTaxForm] = useState({
        displayName: '',
        rate: '',
        appliesProducts: true,
        appliesServices: false,
        appliesFood: false,
        appliesAlcohol: false
    });
    const [taxJurisdictions, setTaxJurisdictions] = useState<TaxJurisdiction[]>([]);

    useEffect(() => {
        fetchData();
    }, [ownerId, llcId, storeId]);

    async function fetchData() {
        try {
            const res = await fetch(`/api/admin/owners/${ownerId}/${llcId}/${storeId}`);
            if (res.ok) {
                const result = await res.json();
                setData(result);
                // Fetch tax jurisdictions after getting store data
                if (result.store?.id) {
                    fetchTaxJurisdictions(result.store.id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch store:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTaxJurisdictions(locationId: string) {
        try {
            const res = await fetch(`/api/admin/locations/${locationId}/taxes`);
            if (res.ok) {
                const result = await res.json();
                setTaxJurisdictions(result.jurisdictions || []);
            }
        } catch (error) {
            console.error('Failed to fetch tax jurisdictions:', error);
        }
    }

    async function handleAddTaxJurisdiction() {
        if (!data?.store?.id) return;

        const rate = parseFloat(taxForm.rate);
        if (isNaN(rate) || rate < 0 || rate > 100) {
            setToast({ message: 'Invalid tax rate (0-100)', type: 'error' });
            return;
        }

        setSavingTax(true);
        try {
            const res = await fetch(`/api/admin/locations/${data.store.id}/taxes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: taxForm.displayName || `Tax ${rate}%`,
                    rate,
                    appliesProducts: taxForm.appliesProducts,
                    appliesServices: taxForm.appliesServices,
                    appliesFood: taxForm.appliesFood,
                    appliesAlcohol: taxForm.appliesAlcohol
                })
            });

            if (res.ok) {
                setToast({ message: 'Tax jurisdiction added', type: 'success' });
                setShowAddTaxModal(false);
                setTaxForm({
                    displayName: '',
                    rate: '',
                    appliesProducts: true,
                    appliesServices: false,
                    appliesFood: false,
                    appliesAlcohol: false
                });
                fetchTaxJurisdictions(data.store.id);
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to add tax', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Network error', type: 'error' });
        } finally {
            setSavingTax(false);
        }
    }

    function formatAddress(store: StoreData) {
        const parts = [store.address, store.city, store.state, store.zipCode].filter(Boolean);
        return parts.join(', ') || 'No address';
    }

    function getDocumentStatusBadge(status: string, expiresAt: string | null) {
        // Check if expired
        if (expiresAt && new Date(expiresAt) < new Date()) {
            return (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Expired
                </span>
            );
        }

        // Check if expiring soon (within 30 days)
        if (expiresAt) {
            const daysUntilExpiry = Math.floor((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 30) {
                return (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Expires in {daysUntilExpiry}d
                    </span>
                );
            }
        }

        switch (status) {
            case 'APPROVED':
                return (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Valid
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Pending
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-1 bg-stone-600/50 text-stone-400 rounded text-xs font-medium">
                        {status}
                    </span>
                );
        }
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
                <p className="text-stone-400">Store not found</p>
                <Link href="/provider/owners" className="text-amber-400 hover:underline mt-2 inline-block">
                    Back to Owners
                </Link>
            </div>
        );
    }

    const { owner, llc, store, stations, employees, documents } = data;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm flex-wrap">
                <Link href="/provider/owners" className="text-stone-500 hover:text-stone-300 transition-colors">
                    Owners
                </Link>
                <span className="text-stone-600">/</span>
                <Link href={`/provider/owners/${ownerId}`} className="text-stone-500 hover:text-stone-300 transition-colors">
                    {owner.name || owner.email}
                </Link>
                <span className="text-stone-600">/</span>
                <Link href={`/provider/owners/${ownerId}/${llcId}`} className="text-stone-500 hover:text-stone-300 transition-colors">
                    {llc.name}
                </Link>
                <span className="text-stone-600">/</span>
                <span className="text-stone-300">{store.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/provider/owners/${ownerId}/${llcId}`}
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-stone-400" />
                    </Link>
                    <div className="h-14 w-14 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <Store className="h-7 w-7 text-emerald-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-stone-100">{store.name}</h1>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${store.isActive
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-stone-600/50 text-stone-400'
                                }`}>
                                {store.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-stone-400 text-sm flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" /> {formatAddress(store)}
                        </p>
                    </div>
                </div>
                <button className="px-4 py-2.5 text-stone-300 hover:text-stone-100 hover:bg-stone-700 rounded-xl font-medium flex items-center gap-2 transition-colors">
                    <Settings className="h-4 w-4" />
                    Edit Store
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-stone-800/50 p-1 rounded-xl w-fit">
                {(['overview', 'stations', 'documents', 'taxes'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                            ? 'bg-stone-700 text-stone-100'
                            : 'text-stone-400 hover:text-stone-200'
                            }`}
                    >
                        {tab === 'overview' && 'Overview'}
                        {tab === 'stations' && `Stations (${stations.length})`}
                        {tab === 'documents' && `Documents (${documents.length})`}
                        {tab === 'taxes' && 'Taxes'}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Contact Info */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-5">
                        <h3 className="font-semibold text-stone-200 mb-4">Contact Information</h3>
                        <div className="space-y-3">
                            {store.phone && (
                                <div className="flex items-center gap-2 text-stone-300">
                                    <Phone className="h-4 w-4 text-stone-500" />
                                    {store.phone}
                                </div>
                            )}
                            {store.email && (
                                <div className="flex items-center gap-2 text-stone-300">
                                    <Mail className="h-4 w-4 text-stone-500" />
                                    {store.email}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-stone-300">
                                <MapPin className="h-4 w-4 text-stone-500" />
                                {formatAddress(store)}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-5">
                        <h3 className="font-semibold text-stone-200 mb-4">Statistics</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-stone-900/50 rounded-lg p-3 text-center">
                                <span className="text-xl font-bold text-blue-400">{stations.length}</span>
                                <p className="text-stone-500 text-xs">Stations</p>
                            </div>
                            <div className="bg-stone-900/50 rounded-lg p-3 text-center">
                                <span className="text-xl font-bold text-purple-400">{employees.length}</span>
                                <p className="text-stone-500 text-xs">Staff</p>
                            </div>
                            <div className="bg-stone-900/50 rounded-lg p-3 text-center">
                                <span className="text-xl font-bold text-emerald-400">{documents.length}</span>
                                <p className="text-stone-500 text-xs">Documents</p>
                            </div>
                            <div className="bg-stone-900/50 rounded-lg p-3 text-center">
                                <span className="text-xl font-bold text-amber-400">
                                    {stations.filter(s => s.isActive).length}
                                </span>
                                <p className="text-stone-500 text-xs">Active Stations</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-5">
                        <h3 className="font-semibold text-stone-200 mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <button className="w-full px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                                <Plus className="h-4 w-4" /> Add Station
                            </button>
                            <button className="w-full px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                                <Upload className="h-4 w-4" /> Upload Document
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stations Tab */}
            {activeTab === 'stations' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-stone-200">POS Stations</h3>
                        <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                            <Plus className="h-4 w-4" /> Add Station
                        </button>
                    </div>

                    {stations.length === 0 ? (
                        <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-8 text-center">
                            <Monitor className="h-12 w-12 text-stone-600 mx-auto mb-3" />
                            <p className="text-stone-400">No stations configured yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stations.map((station) => (
                                <div key={station.id} className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Monitor className="h-5 w-5 text-blue-400" />
                                            <span className="font-medium text-stone-100">{station.name}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${station.isActive
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-stone-600/50 text-stone-400'
                                            }`}>
                                            {station.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="text-stone-500 text-sm">
                                        Code: <span className="font-mono text-stone-300">{station.pairingCode}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-stone-200">Store Documents</h3>
                        <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                            <Upload className="h-4 w-4" /> Upload Document
                        </button>
                    </div>

                    <p className="text-stone-500 text-sm">
                        Permits, licenses, health inspections, and other compliance documents for this location.
                    </p>

                    {documents.length === 0 ? (
                        <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-12 text-center">
                            <FileText className="h-12 w-12 text-stone-600 mx-auto mb-3" />
                            <h4 className="text-lg font-medium text-stone-200 mb-2">No Documents Yet</h4>
                            <p className="text-stone-400 text-sm mb-4">Upload permits, licenses, or other compliance documents for this store.</p>
                            <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors">
                                <Upload className="h-4 w-4" /> Upload First Document
                            </button>
                        </div>
                    ) : (
                        <div className="bg-stone-800/50 border border-stone-700 rounded-2xl overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-stone-800">
                                    <tr className="text-left text-stone-400 text-sm">
                                        <th className="px-4 py-3 font-medium">Document</th>
                                        <th className="px-4 py-3 font-medium">Type</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Expires</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-700">
                                    {documents.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-stone-800/50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-stone-500" />
                                                    <span className="text-stone-200">{doc.fileName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-stone-400">{doc.type}</td>
                                            <td className="px-4 py-3">
                                                {getDocumentStatusBadge(doc.status, doc.expiresAt)}
                                            </td>
                                            <td className="px-4 py-3 text-stone-400">
                                                {doc.expiresAt ? (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(doc.expiresAt).toLocaleDateString()}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={doc.fileUrl}
                                                        target="_blank"
                                                        className="p-1.5 hover:bg-stone-700 rounded text-stone-400 hover:text-stone-200"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                    <button className="p-1.5 hover:bg-red-500/20 rounded text-stone-400 hover:text-red-400">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Taxes Tab */}
            {activeTab === 'taxes' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-stone-200">Tax Configuration</h3>
                            <p className="text-stone-500 text-sm">Configure tax jurisdictions and category rules for this store</p>
                        </div>
                        <button
                            onClick={() => setShowAddTaxModal(true)}
                            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-stone-900 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                            <Plus className="h-4 w-4" /> Add Tax Jurisdiction
                        </button>
                    </div>

                    {/* Tax Jurisdictions Table */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-stone-800 border-b border-stone-700">
                            <h4 className="font-medium text-stone-200 flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-teal-400" />
                                Tax Jurisdictions
                            </h4>
                        </div>

                        {taxJurisdictions.length === 0 ? (
                            <div className="p-12 text-center">
                                <Receipt className="h-12 w-12 text-stone-600 mx-auto mb-3" />
                                <h4 className="text-lg font-medium text-stone-200 mb-2">No Tax Jurisdictions</h4>
                                <p className="text-stone-400 text-sm mb-4">Add tax jurisdictions to apply sales tax, excise tax, or other taxes to this store.</p>
                                <button
                                    onClick={() => setShowAddTaxModal(true)}
                                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-stone-900 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors"
                                >
                                    <Plus className="h-4 w-4" /> Add First Tax Jurisdiction
                                </button>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-stone-800">
                                    <tr className="text-left text-stone-400 text-sm">
                                        <th className="px-4 py-3 font-medium">Enabled</th>
                                        <th className="px-4 py-3 font-medium">Display Name</th>
                                        <th className="px-4 py-3 font-medium">Rate</th>
                                        <th className="px-4 py-3 font-medium">Applies To</th>
                                        <th className="px-4 py-3 font-medium">Priority</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-700">
                                    {taxJurisdictions.map((tax) => (
                                        <tr key={tax.id} className="hover:bg-stone-800/50">
                                            <td className="px-4 py-3">
                                                <button
                                                    className={`w-10 h-6 rounded-full transition-colors ${tax.isActive ? 'bg-teal-500' : 'bg-stone-600'
                                                        }`}
                                                >
                                                    <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${tax.isActive ? 'translate-x-5' : 'translate-x-1'
                                                        }`} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-stone-200 text-sm">
                                                    {tax.displayName || tax.jurisdiction.name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-teal-400 font-semibold">
                                                {(tax.jurisdiction.rate * 100).toFixed(2)}%
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-1 flex-wrap">
                                                    {tax.appliesProducts && (
                                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">Products</span>
                                                    )}
                                                    {tax.appliesServices && (
                                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">Services</span>
                                                    )}
                                                    {tax.appliesFood && (
                                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">Food</span>
                                                    )}
                                                    {tax.appliesAlcohol && (
                                                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">Alcohol</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-stone-400">
                                                {tax.priority}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Category Tax Rules */}
                    <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-medium text-stone-200">Category Tax Rules</h4>
                                <p className="text-stone-500 text-sm">Override default tax behavior for specific product categories</p>
                            </div>
                            <button className="px-3 py-1.5 text-teal-400 hover:bg-teal-500/10 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
                                <Plus className="h-4 w-4" /> Add Rule
                            </button>
                        </div>

                        <div className="p-8 text-center bg-stone-900/30 rounded-xl border border-dashed border-stone-600">
                            <p className="text-stone-500 text-sm">
                                No category rules configured. Categories will use the store default tax settings.
                            </p>
                            <p className="text-stone-600 text-xs mt-2">
                                Example: Set "Grocery Food" as EXEMPT, "Alcohol" as TAXABLE
                            </p>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30">
                        <p className="text-stone-300 text-sm">
                            <strong className="text-teal-400">💡 Tax Hierarchy:</strong> Item Override → Category Rule → Store Default.
                            Taxes are calculated per line item and grouped by display name on receipts.
                        </p>
                    </div>
                </div>
            )}

            {/* Add Tax Jurisdiction Modal */}
            {showAddTaxModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    <div className="bg-stone-800 border border-stone-700 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-stone-100 mb-4">Add Tax Jurisdiction</h3>

                        <div className="space-y-4">
                            {/* Display Name */}
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Display Name (for receipts)</label>
                                <input
                                    type="text"
                                    value={taxForm.displayName}
                                    onChange={(e) => setTaxForm({ ...taxForm, displayName: e.target.value })}
                                    placeholder="e.g., Sales Tax, State Tax"
                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-stone-200 focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            {/* Tax Rate */}
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Tax Rate (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={taxForm.rate}
                                        onChange={(e) => setTaxForm({ ...taxForm, rate: e.target.value })}
                                        placeholder="8.25"
                                        className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-stone-200 focus:outline-none focus:border-teal-500 pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">%</span>
                                </div>
                            </div>

                            {/* Applies To */}
                            <div>
                                <label className="block text-sm text-stone-400 mb-2">Applies To</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setTaxForm({ ...taxForm, appliesProducts: !taxForm.appliesProducts })}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${taxForm.appliesProducts
                                                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                                : 'bg-stone-900 border-stone-600 text-stone-400'
                                            }`}
                                    >
                                        ☑️ Products
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTaxForm({ ...taxForm, appliesServices: !taxForm.appliesServices })}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${taxForm.appliesServices
                                                ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                                : 'bg-stone-900 border-stone-600 text-stone-400'
                                            }`}
                                    >
                                        ☑️ Services
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTaxForm({ ...taxForm, appliesFood: !taxForm.appliesFood })}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${taxForm.appliesFood
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                                : 'bg-stone-900 border-stone-600 text-stone-400'
                                            }`}
                                    >
                                        ☑️ Food
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTaxForm({ ...taxForm, appliesAlcohol: !taxForm.appliesAlcohol })}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${taxForm.appliesAlcohol
                                                ? 'bg-red-500/20 border-red-500 text-red-400'
                                                : 'bg-stone-900 border-stone-600 text-stone-400'
                                            }`}
                                    >
                                        ☑️ Alcohol
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddTaxModal(false);
                                    setTaxForm({
                                        displayName: '',
                                        rate: '',
                                        appliesProducts: true,
                                        appliesServices: false,
                                        appliesFood: false,
                                        appliesAlcohol: false
                                    });
                                }}
                                className="px-4 py-2 text-stone-400 hover:text-stone-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTaxJurisdiction}
                                disabled={savingTax || !taxForm.rate}
                                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-stone-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {savingTax ? 'Adding...' : 'Add Tax'}
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
