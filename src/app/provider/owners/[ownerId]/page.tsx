'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Building2, Store, Users, Plus, Settings, ArrowRight,
    CheckCircle, Clock, XCircle, Mail, Phone, Smartphone, BarChart3, Crown, X, Loader2,
    AlertTriangle, Archive, Download, UserX, Key
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface BusinessData {
    membershipId: string;
    role: string;
    isPrimary: boolean;
    joinedAt: string;
    llc: {
        id: string;
        name: string;
        businessName: string;
        businessType: string;
        approvalStatus: string;
        accountStatus: string;
        createdAt: string;
        subscriptionTier: string;
        usesMobileApp: boolean;
        usesOroPulse: boolean;
    };
    storeCount: number;
    activeStores: number;
    employeeCount: number;
}

interface OwnerData {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    phone: string | null;
    createdAt: string;
    businesses: BusinessData[];
}

const BUSINESS_TYPES = [
    { value: 'SALON', label: 'Salon / Barbershop', icon: '💇' },
    { value: 'RETAIL', label: 'Retail / Convenience', icon: '🏪' },
    { value: 'RESTAURANT', label: 'Restaurant / Food', icon: '🍽️' },
    { value: 'GROCERY', label: 'Grocery', icon: '🛒' },
    { value: 'OTHER', label: 'Other', icon: '🏢' },
];

export default function OwnerBusinessesPage() {
    const params = useParams();
    const ownerId = params.ownerId as string;

    const [owner, setOwner] = useState<OwnerData | null>(null);
    const [loading, setLoading] = useState(true);

    // Add Business Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [addingBusiness, setAddingBusiness] = useState(false);
    const [businessForm, setBusinessForm] = useState({
        legalCompany: '',
        storeName: '',
        ownerType: 'MULTI_LOCATION',
        monthlyFee: 0,
        servicePackage: 'POS_PROCESSING',
        industryType: 'SERVICE',
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Offboarding Modal State
    const [showOffboardModal, setShowOffboardModal] = useState(false);
    const [offboardingBusiness, setOffboardingBusiness] = useState<BusinessData | null>(null);
    const [offboardingReason, setOffboardingReason] = useState('');
    const [offboardingStep, setOffboardingStep] = useState<'confirm' | 'processing' | 'done'>('confirm');
    const [graceDays, setGraceDays] = useState(30);

    // Password Reset Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [resettingPassword, setResettingPassword] = useState(false);

    useEffect(() => {
        fetchOwner();
    }, [ownerId]);

    async function fetchOwner() {
        try {
            const res = await fetch(`/api/admin/owners/${ownerId}`);
            if (res.ok) {
                const data = await res.json();
                setOwner(data);
            }
        } catch (error) {
            console.error('Failed to fetch owner:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddBusiness() {
        if (!businessForm.legalCompany.trim()) {
            setToast({ message: 'Legal company is required', type: 'error' });
            return;
        }
        if (!businessForm.storeName.trim()) {
            setToast({ message: 'Store name is required', type: 'error' });
            return;
        }

        setAddingBusiness(true);
        try {
            const res = await fetch('/api/admin/franchisors/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: owner?.email,
                    name: owner?.name || 'Business Owner',  // API expects 'name' not 'ownerName'
                    companyName: businessForm.legalCompany,
                    storeName: businessForm.storeName,
                    businessType: businessForm.ownerType,
                    industryType: businessForm.industryType,
                    servicePackage: businessForm.servicePackage,
                    monthlyFee: businessForm.monthlyFee,
                    phone: owner?.phone || '',
                }),
            });

            if (res.ok) {
                setToast({ message: 'Business created successfully!', type: 'success' });
                setShowAddModal(false);
                setBusinessForm({
                    legalCompany: '',
                    storeName: '',
                    ownerType: 'MULTI_LOCATION',
                    monthlyFee: 0,
                    servicePackage: 'POS_PROCESSING',
                    industryType: 'SERVICE',
                });
                fetchOwner(); // Refresh the list
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to create business', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error creating business', type: 'error' });
        } finally {
            setAddingBusiness(false);
        }
    }

    async function handleStartOffboarding() {
        if (!offboardingBusiness) return;
        setOffboardingStep('processing');

        try {
            const accountType = offboardingBusiness.llc.businessType === 'BRAND_FRANCHISOR'
                ? 'BRAND_FRANCHISOR'
                : 'MULTI_LOCATION';

            const res = await fetch('/api/admin/offboarding/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accountType,
                    accountId: offboardingBusiness.llc.id,
                    reason: offboardingReason,
                    graceDays
                })
            });

            if (res.ok) {
                setOffboardingStep('done');
                setToast({ message: 'Account suspended - offboarding started', type: 'success' });
                fetchOwner(); // Refresh
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to start offboarding', type: 'error' });
                setOffboardingStep('confirm');
            }
        } catch {
            setToast({ message: 'Error starting offboarding', type: 'error' });
            setOffboardingStep('confirm');
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case 'APPROVED':
            case 'ACTIVE':
                return (
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Active
                    </span>
                );
            case 'PENDING':
                return (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Pending
                    </span>
                );
            default:
                return (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> {status}
                    </span>
                );
        }
    }

    function getBusinessTypeIcon(type: string) {
        switch (type?.toLowerCase()) {
            case 'salon':
            case 'barbershop':
                return '💇';
            case 'retail':
            case 'convenience':
                return '🏪';
            case 'restaurant':
            case 'food':
                return '🍽️';
            default:
                return '🏢';
        }
    }

    async function handleResetPassword() {
        if (!newPassword || newPassword.length < 6) {
            setToast({ message: 'Password must be at least 6 characters', type: 'error' });
            return;
        }
        setResettingPassword(true);
        try {
            const res = await fetch(`/api/provider/owners/${ownerId}/reset-password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword })
            });
            if (res.ok) {
                const data = await res.json();
                setToast({ message: data.message || 'Password reset successfully!', type: 'success' });
                setShowPasswordModal(false);
                setNewPassword('');
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to reset password', type: 'error' });
            }
        } catch {
            setToast({ message: 'Error resetting password', type: 'error' });
        } finally {
            setResettingPassword(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
        );
    }

    if (!owner) {
        return (
            <div className="text-center py-20">
                <p className="text-stone-400">Owner not found</p>
                <Link href="/provider/owners" className="text-amber-400 hover:underline mt-2 inline-block">
                    Back to Owners
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
                <Link href="/provider/owners" className="text-stone-500 hover:text-stone-300 transition-colors">
                    Owners
                </Link>
                <span className="text-stone-600">/</span>
                <span className="text-stone-300">{owner.name || owner.email}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/provider/owners"
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-stone-400" />
                    </Link>
                    <div className="h-14 w-14 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        {owner.image ? (
                            <img src={owner.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                        ) : (
                            <span className="text-2xl font-bold text-amber-400">
                                {(owner.name || owner.email)[0].toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100">{owner.name || 'Unnamed Owner'}</h1>
                        <div className="flex items-center gap-4 text-stone-400 text-sm mt-1">
                            <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {owner.email}
                            </span>
                            {owner.phone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {owner.phone}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Reset Password Button */}
                    <button
                        onClick={() => setShowPasswordModal(true)}
                        className="px-3 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        title="Reset owner password"
                    >
                        <Key className="h-4 w-4" />
                        Reset Password
                    </button>
                    {/* Hide Add Business for Brand Franchisors - they manage via HQ portal */}
                    {!owner.businesses.some(b => b.llc.businessType === 'BRAND_FRANCHISOR') && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-xl font-medium flex items-center gap-2 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Business
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <Building2 className="h-5 w-5" />
                        <span className="text-2xl font-bold">{owner.businesses.length}</span>
                    </div>
                    <p className="text-stone-500 text-sm">Businesses</p>
                </div>
                <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <Store className="h-5 w-5" />
                        <span className="text-2xl font-bold">
                            {owner.businesses.reduce((sum, b) => sum + b.storeCount, 0)}
                        </span>
                    </div>
                    <p className="text-stone-500 text-sm">Total Stores</p>
                </div>
                <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <Users className="h-5 w-5" />
                        <span className="text-2xl font-bold">
                            {owner.businesses.reduce((sum, b) => sum + b.employeeCount, 0)}
                        </span>
                    </div>
                    <p className="text-stone-500 text-sm">Total Staff</p>
                </div>
            </div>

            {/* Section Title */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-stone-200">Businesses</h2>
            </div>

            {/* Empty State */}
            {owner.businesses.length === 0 ? (
                <div className="bg-stone-800/50 border border-stone-700 rounded-2xl p-12 text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-500/10 rounded-2xl mb-4">
                        <Building2 className="h-8 w-8 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-stone-100 mb-2">No Businesses Yet</h3>
                    <p className="text-stone-400 max-w-md mx-auto mb-6">
                        This owner doesn't have any businesses registered. Add their first business/LLC to get started.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-xl font-semibold inline-flex items-center gap-2 transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Add First Business
                    </button>
                </div>
            ) : (
                /* Businesses Grid */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {owner.businesses.map((business) => (
                        <div
                            key={business.llc.id}
                            className="bg-stone-800/50 border border-stone-700 rounded-2xl overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="p-5 border-b border-stone-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{getBusinessTypeIcon(business.llc.businessType)}</span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-stone-100">{business.llc.name}</h3>
                                                {business.isPrimary && (
                                                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium flex items-center gap-1">
                                                        <Crown className="h-3 w-3" /> Primary
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-stone-500 text-sm">{business.llc.businessType || 'Business'}</p>
                                        </div>
                                    </div>
                                    {getStatusBadge(business.llc.approvalStatus)}
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-stone-900/50 rounded-lg p-2 text-center">
                                        <span className="text-lg font-bold text-emerald-400">{business.storeCount}</span>
                                        <p className="text-stone-500 text-xs">Stores</p>
                                    </div>
                                    <div className="bg-stone-900/50 rounded-lg p-2 text-center">
                                        <span className="text-lg font-bold text-purple-400">{business.employeeCount}</span>
                                        <p className="text-stone-500 text-xs">Staff</p>
                                    </div>
                                    <div className="bg-stone-900/50 rounded-lg p-2 text-center">
                                        <span className="text-lg font-bold text-blue-400">{business.llc.subscriptionTier}</span>
                                        <p className="text-stone-500 text-xs">Tier</p>
                                    </div>
                                </div>

                                {/* Premium Features */}
                                {(business.llc.usesMobileApp || business.llc.usesOroPulse) && (
                                    <div className="flex items-center gap-2 mt-3">
                                        {business.llc.usesOroPulse && (
                                            <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-xs font-medium flex items-center gap-1">
                                                <BarChart3 className="h-3 w-3" /> Pulse
                                            </span>
                                        )}
                                        {business.llc.usesMobileApp && (
                                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium flex items-center gap-1">
                                                <Smartphone className="h-3 w-3" /> Mobile
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Card Actions */}
                            <div className="p-3 bg-stone-900/30 flex items-center gap-2">
                                {business.llc.businessType === 'BRAND_FRANCHISOR' ? (
                                    <>
                                        <Link
                                            href="/provider/provisioning"
                                            className="flex-1 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Store className="h-4 w-4" />
                                            Provisioning
                                        </Link>
                                        <Link
                                            href={`/provider/clients/${business.llc.id}/config`}
                                            className="px-4 py-2 text-stone-400 hover:text-stone-200 hover:bg-stone-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setOffboardingBusiness(business);
                                                setShowOffboardModal(true);
                                                setOffboardingStep('confirm');
                                            }}
                                            className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <UserX className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href={`/provider/owners/${ownerId}/${business.llc.id}`}
                                            className="flex-1 px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Store className="h-4 w-4" />
                                            Stores
                                        </Link>
                                        <Link
                                            href={`/provider/clients/${business.llc.id}/config`}
                                            className="px-4 py-2 text-stone-400 hover:text-stone-200 hover:bg-stone-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <Settings className="h-4 w-4" />
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setOffboardingBusiness(business);
                                                setShowOffboardModal(true);
                                                setOffboardingStep('confirm');
                                            }}
                                            className="px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <UserX className="h-4 w-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Business Modal - Full Form */}
            {showAddModal && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowAddModal(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-stone-800">
                                <div>
                                    <h3 className="text-xl font-semibold text-stone-100">Add New Client</h3>
                                    <p className="text-stone-500 text-sm">Enter the details below to generate an invite.</p>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-stone-800 rounded-lg">
                                    <X className="h-5 w-5 text-stone-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Row 1: Pre-filled Owner Info (read-only display) */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Owner Name</label>
                                        <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-400">
                                            <Users className="h-4 w-4" />
                                            <span className="text-sm">{owner.name || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Email</label>
                                        <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-400">
                                            <Mail className="h-4 w-4" />
                                            <span className="text-sm truncate">{owner.email}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Cell Phone</label>
                                        <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-400">
                                            <Phone className="h-4 w-4" />
                                            <span className="text-sm">{owner.phone || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Legal Company, Store Name, Owner Type, Monthly Fee */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Legal Company</label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                            <input
                                                type="text"
                                                value={businessForm.legalCompany}
                                                onChange={e => setBusinessForm({ ...businessForm, legalCompany: e.target.value })}
                                                placeholder="Salon LLC"
                                                className="w-full pl-9 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Store Name (DBA)</label>
                                        <div className="relative">
                                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                            <input
                                                type="text"
                                                value={businessForm.storeName}
                                                onChange={e => setBusinessForm({ ...businessForm, storeName: e.target.value })}
                                                placeholder="Mike's Barbershop"
                                                className="w-full pl-9 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Owner Type</label>
                                        <select
                                            value={businessForm.ownerType}
                                            onChange={e => setBusinessForm({ ...businessForm, ownerType: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="MULTI_LOCATION">Multi-Location</option>
                                            <option value="BRAND_FRANCHISOR">Brand Franchisor</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Monthly Fee</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                                            <input
                                                type="number"
                                                value={businessForm.monthlyFee}
                                                onChange={e => setBusinessForm({ ...businessForm, monthlyFee: parseInt(e.target.value) || 0 })}
                                                placeholder="0"
                                                className="w-full pl-7 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 3: Service Package */}
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-2 uppercase">Service Package</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setBusinessForm({ ...businessForm, servicePackage: 'POS_PROCESSING' })}
                                            className={`p-4 rounded-xl border text-left transition-all relative ${businessForm.servicePackage === 'POS_PROCESSING'
                                                ? 'border-amber-500 bg-amber-500/10'
                                                : 'border-stone-700 hover:border-stone-600 bg-stone-800/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                                    <span className="text-emerald-400">💳</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-stone-100">POS + Processing</p>
                                                    <p className="text-xs text-stone-500">Void Check, DL, FEIN</p>
                                                </div>
                                            </div>
                                            {businessForm.servicePackage === 'POS_PROCESSING' && (
                                                <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                                    <CheckCircle className="h-3 w-3 text-stone-900" />
                                                </div>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setBusinessForm({ ...businessForm, servicePackage: 'POS_ONLY' })}
                                            className={`p-4 rounded-xl border text-left transition-all relative ${businessForm.servicePackage === 'POS_ONLY'
                                                ? 'border-amber-500 bg-amber-500/10'
                                                : 'border-stone-700 hover:border-stone-600 bg-stone-800/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                    <span className="text-blue-400">🖥️</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-stone-100">POS Only</p>
                                                    <p className="text-xs text-stone-500">Void Check only</p>
                                                </div>
                                            </div>
                                            {businessForm.servicePackage === 'POS_ONLY' && (
                                                <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                                    <CheckCircle className="h-3 w-3 text-stone-900" />
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Row 4: Industry Type */}
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 mb-2 uppercase">Industry Type</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setBusinessForm({ ...businessForm, industryType: 'SERVICE' })}
                                            className={`p-4 rounded-xl border text-center transition-all ${businessForm.industryType === 'SERVICE'
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-stone-700 hover:border-stone-600 bg-stone-800/50'
                                                }`}
                                        >
                                            <div className="w-10 h-10 mx-auto mb-2 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                                <span className="text-2xl">💇</span>
                                            </div>
                                            <p className="font-medium text-stone-100">Service</p>
                                        </button>
                                        <button
                                            onClick={() => setBusinessForm({ ...businessForm, industryType: 'RETAIL' })}
                                            className={`p-4 rounded-xl border text-center transition-all ${businessForm.industryType === 'RETAIL'
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-stone-700 hover:border-stone-600 bg-stone-800/50'
                                                }`}
                                        >
                                            <div className="w-10 h-10 mx-auto mb-2 bg-stone-700/50 rounded-xl flex items-center justify-center">
                                                <span className="text-2xl">🏪</span>
                                            </div>
                                            <p className="font-medium text-stone-100">Retail</p>
                                        </button>
                                        <button
                                            onClick={() => setBusinessForm({ ...businessForm, industryType: 'RESTAURANT' })}
                                            className={`p-4 rounded-xl border text-center transition-all ${businessForm.industryType === 'RESTAURANT'
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-stone-700 hover:border-stone-600 bg-stone-800/50'
                                                }`}
                                        >
                                            <div className="w-10 h-10 mx-auto mb-2 bg-stone-700/50 rounded-xl flex items-center justify-center">
                                                <span className="text-2xl">🍽️</span>
                                            </div>
                                            <p className="font-medium text-stone-100">Restaurant</p>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-stone-800 flex gap-3">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddBusiness}
                                    disabled={addingBusiness || !businessForm.legalCompany.trim() || !businessForm.storeName.trim()}
                                    className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-stone-900 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                                >
                                    {addingBusiness ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Send Invite →'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Offboarding Modal */}
            {showOffboardModal && offboardingBusiness && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowOffboardModal(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            {offboardingStep === 'confirm' && (
                                <>
                                    <div className="p-5 border-b border-stone-800">
                                        <div className="flex items-center gap-3 text-red-400 mb-2">
                                            <AlertTriangle className="h-6 w-6" />
                                            <h3 className="text-xl font-semibold">Offboard Client</h3>
                                        </div>
                                        <p className="text-stone-400 text-sm">
                                            This will suspend <strong className="text-stone-200">{offboardingBusiness.llc.name}</strong> and start the offboarding process.
                                        </p>
                                    </div>

                                    <div className="p-5 space-y-4">
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                            <p className="text-red-300 text-sm">
                                                <strong>Warning:</strong> The client will immediately lose access. Transaction data will be retained for compliance.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-stone-400 text-sm mb-1">Reason (optional)</label>
                                            <input
                                                type="text"
                                                value={offboardingReason}
                                                onChange={(e) => setOffboardingReason(e.target.value)}
                                                placeholder="e.g., Non-payment, Contract ended..."
                                                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-stone-400 text-sm mb-1">Grace Period Before Anonymization</label>
                                            <select
                                                value={graceDays}
                                                onChange={(e) => setGraceDays(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-200"
                                            >
                                                <option value={7}>7 days</option>
                                                <option value={14}>14 days</option>
                                                <option value={30}>30 days (recommended)</option>
                                                <option value={60}>60 days</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 p-5 border-t border-stone-800">
                                        <button
                                            onClick={() => setShowOffboardModal(false)}
                                            className="flex-1 px-4 py-3 border border-stone-700 text-stone-300 rounded-lg font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleStartOffboarding}
                                            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                        >
                                            <UserX className="h-4 w-4" />
                                            Start Offboarding
                                        </button>
                                    </div>
                                </>
                            )}

                            {offboardingStep === 'processing' && (
                                <div className="p-8 text-center">
                                    <Loader2 className="h-12 w-12 animate-spin text-amber-400 mx-auto mb-4" />
                                    <p className="text-stone-200">Suspending account...</p>
                                </div>
                            )}

                            {offboardingStep === 'done' && (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="h-8 w-8 text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-stone-100 mb-2">Offboarding Started</h3>
                                    <p className="text-stone-400 mb-4">
                                        Account suspended. Anonymization scheduled in {graceDays} days.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setShowOffboardModal(false);
                                            setOffboardingBusiness(null);
                                            setOffboardingReason('');
                                        }}
                                        className="px-6 py-3 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg font-medium"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
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

            {/* Password Reset Modal */}
            {showPasswordModal && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowPasswordModal(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-stone-800">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                        <Key className="h-5 w-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-stone-100">Reset Password</h3>
                                        <p className="text-stone-500 text-sm">{owner.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                    <p className="text-amber-300 text-sm">
                                        <strong>Note:</strong> You'll need to share the new password securely with the owner.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-stone-400 text-sm mb-1">New Password</label>
                                    <input
                                        type="text"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password (min 6 chars)"
                                        className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-200 placeholder:text-stone-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 p-5 border-t border-stone-800">
                                <button
                                    onClick={() => { setShowPasswordModal(false); setNewPassword(''); }}
                                    className="flex-1 px-4 py-3 border border-stone-700 text-stone-300 rounded-lg font-medium hover:bg-stone-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResetPassword}
                                    disabled={resettingPassword || newPassword.length < 6}
                                    className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-stone-900 rounded-lg font-semibold flex items-center justify-center gap-2"
                                >
                                    {resettingPassword ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Resetting...
                                        </>
                                    ) : (
                                        <>
                                            <Key className="h-4 w-4" />
                                            Reset Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
