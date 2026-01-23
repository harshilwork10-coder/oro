'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Building2, Store, Users, Mail, Phone, CheckCircle, Loader2, X, AlertCircle, Copy, Check, ExternalLink, Handshake
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface Dealer {
    id: string;
    dealerName: string;
}

// Validation helpers
function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function formatPhone(value: string): string {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function validatePhone(phone: string): boolean {
    if (!phone) return true; // Phone is optional
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
}

export default function NewOnboardingPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [createdClient, setCreatedClient] = useState<{ name: string; email: string; magicLink: string } | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [loadingDealers, setLoadingDealers] = useState(true);

    // Fetch dealers on mount
    useEffect(() => {
        async function fetchDealers() {
            try {
                const res = await fetch('/api/provider/dealers');
                const data = await res.json();
                if (data.success) {
                    setDealers(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch dealers:', error);
            } finally {
                setLoadingDealers(false);
            }
        }
        fetchDealers();
    }, []);

    const [form, setForm] = useState({
        ownerName: '',
        email: '',
        phone: '',
        legalCompany: '',
        storeName: '',
        ownerType: 'MULTI_LOCATION_OWNER',
        monthlyFee: 0,
        servicePackage: 'POS_PROCESSING',
        industryType: 'SERVICE',
        dealerBrandingId: '',  // Dealer assignment
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    function validate(): boolean {
        const newErrors: Record<string, string> = {};

        if (!form.ownerName.trim()) {
            newErrors.ownerName = 'Owner name is required';
        } else if (form.ownerName.trim().length < 2) {
            newErrors.ownerName = 'Name must be at least 2 characters';
        }

        if (!form.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!validateEmail(form.email)) {
            newErrors.email = 'Invalid email format';
        }

        if (form.phone && !validatePhone(form.phone)) {
            newErrors.phone = 'Phone must be 10 digits';
        }

        if (!form.legalCompany.trim()) {
            newErrors.legalCompany = 'Legal company is required';
        }

        // Store name only required for Multi-Location Owners, not Brand Franchisors
        if (form.ownerType === 'MULTI_LOCATION_OWNER' && !form.storeName.trim()) {
            newErrors.storeName = 'Store name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    function handleBlur(field: string) {
        setTouched({ ...touched, [field]: true });
        validate();
    }

    async function handleSubmit() {
        // Mark all fields as touched
        setTouched({
            ownerName: true,
            email: true,
            phone: true,
            legalCompany: true,
            storeName: true,
        });

        if (!validate()) {
            setToast({ message: 'Please fix the errors before submitting', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/admin/franchisors/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.ownerName,
                    email: form.email,
                    phone: form.phone || null,
                    companyName: form.legalCompany,
                    storeName: form.storeName,
                    businessType: form.ownerType,
                    industryType: form.industryType,
                    processingType: form.servicePackage === 'POS_PROCESSING' ? 'POS_AND_PROCESSING' : 'POS_ONLY',
                    dealerBrandingId: form.dealerBrandingId || null,  // Include dealer
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // Show magic link modal instead of redirecting
                setCreatedClient({
                    name: form.legalCompany,
                    email: form.email,
                    magicLink: data.magicLink
                });
            } else {
                const err = await res.json();
                setToast({ message: err.error || 'Failed to create client', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error creating client', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <Link href="/provider/onboarding" className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-300 mb-6">
                <ArrowLeft size={16} />
                Back to Onboarding Queue
            </Link>

            <div className="bg-stone-900/50 border border-stone-800 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-stone-800">
                    <h1 className="text-2xl font-bold text-stone-100">Add New Client</h1>
                    <p className="text-stone-500 mt-1">Enter the client details below to generate an invite.</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Row 1: Owner Info */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Owner Name *</label>
                            <div className="relative">
                                <Users className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${touched.ownerName && errors.ownerName ? 'text-red-400' : 'text-stone-500'}`} />
                                <input
                                    type="text"
                                    value={form.ownerName}
                                    onChange={e => setForm({ ...form, ownerName: e.target.value })}
                                    onBlur={() => handleBlur('ownerName')}
                                    placeholder="John Smith"
                                    className={`w-full pl-9 pr-3 py-2.5 bg-stone-800 border rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none ${touched.ownerName && errors.ownerName
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-stone-700 focus:border-amber-500'
                                        }`}
                                />
                            </div>
                            {touched.ownerName && errors.ownerName && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.ownerName}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Email *</label>
                            <div className="relative">
                                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${touched.email && errors.email ? 'text-red-400' : 'text-stone-500'}`} />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    onBlur={() => handleBlur('email')}
                                    placeholder="owner@business.com"
                                    className={`w-full pl-9 pr-3 py-2.5 bg-stone-800 border rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none ${touched.email && errors.email
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-stone-700 focus:border-amber-500'
                                        }`}
                                />
                            </div>
                            {touched.email && errors.email && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.email}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Cell Phone</label>
                            <div className="relative">
                                <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${touched.phone && errors.phone ? 'text-red-400' : 'text-stone-500'}`} />
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })}
                                    onBlur={() => handleBlur('phone')}
                                    placeholder="(555) 123-4567"
                                    className={`w-full pl-9 pr-3 py-2.5 bg-stone-800 border rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none ${touched.phone && errors.phone
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-stone-700 focus:border-amber-500'
                                        }`}
                                />
                            </div>
                            {touched.phone && errors.phone && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.phone}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Business Info */}
                    <div className={`grid gap-4 ${form.ownerType === 'MULTI_LOCATION_OWNER' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        {/* Owner Type - FIRST so user picks type before seeing conditional fields */}
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Owner Type</label>
                            <select
                                value={form.ownerType}
                                onChange={e => {
                                    setForm({ ...form, ownerType: e.target.value, storeName: '' });
                                    setErrors({ ...errors, storeName: '' });
                                }}
                                className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500"
                            >
                                <option value="MULTI_LOCATION_OWNER">Multi-Location Owner</option>
                                <option value="BRAND_FRANCHISOR">Brand Franchisor</option>
                            </select>
                            <p className="text-stone-600 text-xs mt-1">
                                {form.ownerType === 'BRAND_FRANCHISOR'
                                    ? 'Franchisees add their own stores'
                                    : 'Owner manages their own stores'}
                            </p>
                        </div>

                        {/* Legal Company */}
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Legal Company *</label>
                            <div className="relative">
                                <Building2 className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${touched.legalCompany && errors.legalCompany ? 'text-red-400' : 'text-stone-500'}`} />
                                <input
                                    type="text"
                                    value={form.legalCompany}
                                    onChange={e => setForm({ ...form, legalCompany: e.target.value })}
                                    onBlur={() => handleBlur('legalCompany')}
                                    placeholder={form.ownerType === 'BRAND_FRANCHISOR' ? 'McDonald\'s Corp' : 'Salon LLC'}
                                    className={`w-full pl-9 pr-3 py-2.5 bg-stone-800 border rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none ${touched.legalCompany && errors.legalCompany
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-stone-700 focus:border-amber-500'
                                        }`}
                                />
                            </div>
                            {touched.legalCompany && errors.legalCompany && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {errors.legalCompany}
                                </p>
                            )}
                        </div>

                        {/* Store Name - ONLY for Multi-Location Owners */}
                        {form.ownerType === 'MULTI_LOCATION_OWNER' && (
                            <div>
                                <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Store Name (DBA) *</label>
                                <div className="relative">
                                    <Store className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${touched.storeName && errors.storeName ? 'text-red-400' : 'text-stone-500'}`} />
                                    <input
                                        type="text"
                                        value={form.storeName}
                                        onChange={e => setForm({ ...form, storeName: e.target.value })}
                                        onBlur={() => handleBlur('storeName')}
                                        placeholder="Mike's Barbershop"
                                        className={`w-full pl-9 pr-3 py-2.5 bg-stone-800 border rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none ${touched.storeName && errors.storeName
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-stone-700 focus:border-amber-500'
                                            }`}
                                    />
                                </div>
                                {touched.storeName && errors.storeName && (
                                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> {errors.storeName}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Sold By / Dealer */}
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Sold By / Dealer</label>
                            <div className="relative">
                                <Handshake className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <select
                                    value={form.dealerBrandingId}
                                    onChange={e => setForm({ ...form, dealerBrandingId: e.target.value })}
                                    disabled={loadingDealers}
                                    className="w-full pl-9 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                                >
                                    <option value="">Direct (ORO 9)</option>
                                    {dealers.map(dealer => (
                                        <option key={dealer.id} value={dealer.id}>{dealer.dealerName}</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-stone-600 text-xs mt-1">Which dealer sold/owns this account?</p>
                        </div>

                        {/* Monthly Fee */}
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase">Monthly Fee</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                                <input
                                    type="number"
                                    value={form.monthlyFee}
                                    onChange={e => setForm({ ...form, monthlyFee: parseInt(e.target.value) || 0 })}
                                    placeholder="0"
                                    min="0"
                                    className="w-full pl-7 pr-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Service Package - ONLY for Multi-Location Owners */}
                    {form.ownerType === 'MULTI_LOCATION_OWNER' && (
                        <div>
                            <label className="block text-xs font-medium text-stone-500 mb-2 uppercase">Service Package</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setForm({ ...form, servicePackage: 'POS_PROCESSING' })}
                                    className={`p-4 rounded-xl border text-left transition-all relative ${form.servicePackage === 'POS_PROCESSING'
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
                                    {form.servicePackage === 'POS_PROCESSING' && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                            <CheckCircle className="h-3 w-3 text-stone-900" />
                                        </div>
                                    )}
                                </button>
                                <button
                                    onClick={() => setForm({ ...form, servicePackage: 'POS_ONLY' })}
                                    className={`p-4 rounded-xl border text-left transition-all relative ${form.servicePackage === 'POS_ONLY'
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
                                    {form.servicePackage === 'POS_ONLY' && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                            <CheckCircle className="h-3 w-3 text-stone-900" />
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Row 4: Industry Type */}
                    <div>
                        <label className="block text-xs font-medium text-stone-500 mb-2 uppercase">Industry Type</label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setForm({ ...form, industryType: 'SERVICE' })}
                                className={`p-4 rounded-xl border text-center transition-all ${form.industryType === 'SERVICE'
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
                                onClick={() => setForm({ ...form, industryType: 'RETAIL' })}
                                className={`p-4 rounded-xl border text-center transition-all ${form.industryType === 'RETAIL'
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
                                onClick={() => setForm({ ...form, industryType: 'RESTAURANT' })}
                                className={`p-4 rounded-xl border text-center transition-all ${form.industryType === 'RESTAURANT'
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
                <div className="p-6 border-t border-stone-800 flex gap-3">
                    <Link
                        href="/provider/onboarding"
                        className="flex-1 px-4 py-3 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg font-medium text-center transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-stone-900 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                        {saving ? (
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

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Magic Link Success Modal */}
            {createdClient && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-lg">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-8 w-8 text-emerald-400" />
                            </div>
                            <h2 className="text-xl font-bold text-stone-100 mb-2">Client Created!</h2>
                            <p className="text-stone-400">
                                <span className="font-medium text-stone-200">{createdClient.name}</span> has been set up.
                            </p>
                        </div>

                        <div className="bg-stone-800 rounded-xl p-4 mb-4">
                            <p className="text-xs text-stone-500 mb-2 uppercase font-medium">Magic Link for {createdClient.email}</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={createdClient.magicLink}
                                    className="flex-1 bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-sm text-stone-200 font-mono truncate"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(createdClient.magicLink);
                                        setCopiedLink(true);
                                        setTimeout(() => setCopiedLink(false), 2000);
                                    }}
                                    className="px-3 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg text-stone-300"
                                >
                                    {copiedLink ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <a
                                href={createdClient.magicLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                <ExternalLink size={16} />
                                Open Link
                            </a>
                            <button
                                onClick={() => router.push('/provider/onboarding')}
                                className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg font-medium"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
