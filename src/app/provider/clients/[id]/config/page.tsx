'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Building2, DollarSign, Settings, Star, Link2, MapPin,
    CreditCard, Gift, FileText, Clock, CheckCircle, AlertCircle, X,
    Edit, Save, Plus, Trash2, Smartphone, RefreshCw, Image, Upload, Palette
} from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface LocationData {
    id: string;
    name: string;
    address: string | null;
    stations: { id: string; name: string; pairingCode: string }[];
}

interface ClientData {
    id: string;
    name: string;
    businessName: string;
    email: string;
    accountStatus: string;
    approvalStatus: string;
    posMode: string;
    tipPercentages: number[];
    tipType: string;
    cardSurchargeType: string;
    cardSurchargeValue: number;
    acceptsCash: boolean;
    acceptsCard: boolean;
    acceptsEbt: boolean;
    acceptsChecks: boolean;
    features: Record<string, boolean>;
    documents: { voidCheck: boolean; driverLicense: boolean; feinLetter: boolean };
    locations: LocationData[];
}

// Helper to parse tip suggestions JSON from database
function parseTipSuggestions(tipSuggestions: string | undefined): number[] {
    if (!tipSuggestions) return [15, 20, 25];
    try {
        const parsed = JSON.parse(tipSuggestions);
        if (Array.isArray(parsed)) return parsed;
        return [15, 20, 25];
    } catch {
        return [15, 20, 25];
    }
}

type CategoryView = 'status' | 'sales' | 'features' | 'locations' | 'pricing' | 'tips' | 'payments' | 'documents' | 'branding' | null;

export default function ProviderClientConfigPage() {
    const params = useParams();
    const clientId = params.id as string;

    const [client, setClient] = useState<ClientData | null>(null);
    const [loading, setLoading] = useState(true);
    const [categoryView, setCategoryView] = useState<CategoryView>(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [storeLogo, setStoreLogo] = useState<string | null>(null);

    // Fetch client data
    async function fetchClient() {
        try {
            const response = await fetch('/api/admin/franchisors');
            if (response.ok) {
                const data = await response.json();
                const found = data.find((f: any) => f.id === clientId);
                if (found) {
                    setClient({
                        id: found.id,
                        name: found.owner?.name || found.name || 'Unknown',
                        businessName: found.businessName || found.name || 'Unknown Business',
                        email: found.owner?.email || '',
                        accountStatus: found.accountStatus || 'ACTIVE',
                        approvalStatus: found.approvalStatus || 'PENDING',
                        // BusinessConfig fields - read from config object
                        posMode: found.config?.posMode || 'RETAIL',
                        tipPercentages: parseTipSuggestions(found.config?.tipSuggestions),
                        tipType: found.config?.tipType || 'PERCENT',
                        cardSurchargeType: found.config?.cashDiscountEnabled ? 'PERCENTAGE' : 'NONE',
                        cardSurchargeValue: found.config?.cashDiscountPercent || 0,
                        acceptsCash: true, // Always true, no DB field
                        acceptsCard: true, // Always true, no DB field
                        acceptsEbt: found.config?.acceptsEbt || false,
                        acceptsChecks: found.config?.acceptsChecks || false,
                        features: {
                            usesInventory: found.config?.usesInventory || false,
                            usesAgeVerification: false, // Not in DB yet
                            usesLottery: false, // Not in DB yet
                            usesTobaccoScan: false, // Not in DB yet
                            usesScheduling: found.config?.usesScheduling || false,
                            usesMemberships: found.config?.usesMemberships || false,
                            usesCommissions: found.config?.usesCommissions || false,
                            usesLoyalty: found.config?.usesLoyalty || false,
                            usesGiftCards: found.config?.usesGiftCards || false,
                            usesEmailMarketing: found.config?.usesEmailMarketing || false,
                            usesSmsMarketing: found.config?.usesSMSMarketing || false,
                            usesServices: found.config?.usesServices || false,
                            usesAppointments: found.config?.usesAppointments || false,
                            usesReviewManagement: found.config?.usesReviewManagement || false,
                            enableResources: false, // Not in DB yet
                        },
                        documents: {
                            voidCheck: !!found.documents?.voidCheck,
                            driverLicense: !!found.documents?.driverLicense,
                            feinLetter: !!found.documents?.feinLetter,
                        },
                        locations: found.franchises?.[0]?.locations?.map((l: any) => ({
                            id: l.id,
                            name: l.name,
                            address: l.address,
                            stations: l.stations || [],
                        })) || [],
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching client:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchClient(); }, [clientId]);

    // Update config
    async function updateConfig(updates: Record<string, any>) {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/franchisors/${clientId}/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                setToast({ message: 'Configuration updated', type: 'success' });
                fetchClient();
            } else {
                setToast({ message: 'Failed to update configuration', type: 'error' });
            }
        } catch (error) {
            setToast({ message: 'Error updating configuration', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="text-center py-20">
                <AlertCircle size={48} className="mx-auto text-stone-600 mb-4" />
                <h2 className="text-lg font-semibold text-stone-100">Client not found</h2>
                <Link href="/provider/clients" className="text-orange-400 hover:underline mt-2 inline-block">
                    Back to Clients
                </Link>
            </div>
        );
    }

    const configCards = [
        { id: 'status', label: 'Account Status', value: client.accountStatus, icon: Settings, color: 'cyan' },
        { id: 'sales', label: 'Sales Config', value: client.posMode === 'SALON' ? 'Salon / Spa' : client.posMode === 'RETAIL' ? 'Retail Store' : client.posMode, icon: DollarSign, color: 'green' },
        { id: 'features', label: 'Features', value: '0/15 enabled', icon: Star, color: 'yellow' },
        { id: 'locations', label: 'Locations', value: `${client.locations.length} store${client.locations.length !== 1 ? 's' : ''}`, icon: MapPin, color: 'pink' },
        { id: 'pricing', label: 'Pricing', value: 'Standard', icon: CreditCard, color: 'blue' },
        { id: 'tips', label: 'Tips', value: client.tipPercentages.join(', '), icon: Gift, color: 'green' },
        { id: 'payments', label: 'Payments', value: [client.acceptsCash ? 'Cash' : '', client.acceptsCard ? 'Card' : ''].filter(Boolean).join(' & ') || 'None', icon: CreditCard, color: 'orange' },
        { id: 'documents', label: 'Documents', value: `${[client.documents.voidCheck, client.documents.driverLicense, client.documents.feinLetter].filter(Boolean).length}/3`, icon: FileText, color: 'emerald' },
        { id: 'branding', label: 'Branding', value: storeLogo ? 'Logo Set' : 'No Logo', icon: Palette, color: 'purple' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <Link href="/provider/clients" className="flex items-center gap-2 text-stone-400 hover:text-stone-200 text-sm mb-4">
                    <ArrowLeft size={16} />
                    Back to All Clients
                </Link>
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                        <Building2 className="h-7 w-7 text-orange-400" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-stone-100">{client.businessName}</h1>
                        <p className="text-stone-400">{client.name} · {client.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${client.accountStatus === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                        client.accountStatus === 'SUSPENDED' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-amber-500/20 text-amber-400'
                        }`}>
                        {client.accountStatus}
                    </span>
                </div>
            </div>

            {/* Page Title */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-stone-100">Account Configurations</h2>
                <p className="text-sm text-stone-400">Manage client settings, features, and access</p>
            </div>

            {/* Config Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {configCards.map((card) => {
                    const Icon = card.icon;
                    const colorClasses: Record<string, string> = {
                        cyan: 'bg-cyan-500/20 text-cyan-400',
                        green: 'bg-emerald-500/20 text-emerald-400',
                        yellow: 'bg-yellow-500/20 text-yellow-400',
                        pink: 'bg-pink-500/20 text-pink-400',
                        blue: 'bg-blue-500/20 text-blue-400',
                        orange: 'bg-orange-500/20 text-orange-400',
                        emerald: 'bg-emerald-500/20 text-emerald-400',
                        purple: 'bg-purple-500/20 text-purple-400',
                    };

                    return (
                        <button
                            key={card.id}
                            onClick={() => setCategoryView(card.id as CategoryView)}
                            className="p-4 bg-stone-800/50 border border-stone-700 rounded-xl hover:border-orange-500/30 transition-all text-left group"
                        >
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[card.color]}`}>
                                <Icon size={20} />
                            </div>
                            <h3 className="font-medium text-stone-100 group-hover:text-orange-400">{card.label}</h3>
                            <p className="text-sm text-stone-500">{card.value}</p>
                        </button>
                    );
                })}
            </div>

            {/* Category Detail Modal */}
            {categoryView && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-800 rounded-xl border border-stone-700 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b border-stone-700 sticky top-0 bg-stone-800">
                            <h3 className="text-lg font-semibold text-white capitalize">{categoryView}</h3>
                            <button
                                onClick={() => setCategoryView(null)}
                                className="p-2 hover:bg-stone-700 rounded-lg"
                            >
                                <X size={18} className="text-stone-400" />
                            </button>
                        </div>

                        <div className="p-4">
                            {categoryView === 'status' && (
                                <div className="space-y-4">
                                    <p className="text-stone-400">Current status: <span className="text-white font-medium">{client.accountStatus}</span></p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['ACTIVE', 'PENDING', 'SUSPENDED'].map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => { updateConfig({ accountStatus: status }); setCategoryView(null); }}
                                                disabled={saving}
                                                className={`p-3 rounded-lg border transition-colors ${client.accountStatus === status
                                                    ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                                                    : 'border-stone-700 hover:border-stone-600 text-stone-300'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {categoryView === 'sales' && (
                                <div className="space-y-4">
                                    <p className="text-stone-400">Business type configuration</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'SALON', name: 'Salon / Spa', icon: '💇' },
                                            { id: 'RETAIL', name: 'Retail Store', icon: '🏪' },
                                            { id: 'RESTAURANT', name: 'Restaurant', icon: '🍽️' },
                                            { id: 'HYBRID', name: 'Hybrid', icon: '🔄' },
                                        ].map((mode) => (
                                            <button
                                                key={mode.id}
                                                onClick={() => { updateConfig({ posMode: mode.id }); setCategoryView(null); }}
                                                disabled={saving}
                                                className={`p-3 rounded-lg border transition-colors text-left ${client.posMode === mode.id
                                                    ? 'border-orange-500 bg-orange-500/20'
                                                    : 'border-stone-700 hover:border-stone-600'
                                                    }`}
                                            >
                                                <span className="text-xl">{mode.icon}</span>
                                                <p className="text-stone-200 mt-1">{mode.name}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {categoryView === 'tips' && (
                                <div className="space-y-4">
                                    <p className="text-stone-400">Configure tip options shown to customers</p>

                                    {/* Tip Type Selector */}
                                    <div>
                                        <label className="block text-sm text-stone-300 mb-2">Tip Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => { updateConfig({ tipType: 'PERCENT' }); }}
                                                className={`p-3 rounded-lg border font-medium transition-colors ${client.tipType === 'PERCENT'
                                                    ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                                                    : 'border-stone-700 hover:border-stone-600 text-stone-300'
                                                    }`}
                                            >
                                                % Percentage
                                            </button>
                                            <button
                                                onClick={() => { updateConfig({ tipType: 'DOLLAR' }); }}
                                                className={`p-3 rounded-lg border font-medium transition-colors ${client.tipType === 'DOLLAR'
                                                    ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                                                    : 'border-stone-700 hover:border-stone-600 text-stone-300'
                                                    }`}
                                            >
                                                $ Flat Amount
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tip Values */}
                                    <div>
                                        <label className="block text-sm text-stone-300 mb-2">Preset Values</label>
                                        <div className="flex gap-2">
                                            {client.tipPercentages.map((tip, i) => (
                                                <input
                                                    key={`${client.tipType}-${i}`}
                                                    id={`tip-input-${i}`}
                                                    type="number"
                                                    defaultValue={tip}
                                                    min="0"
                                                    className="w-20 px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                />
                                            ))}
                                        </div>
                                        <p className="text-stone-500 text-xs mt-2">
                                            {client.tipType === 'DOLLAR' ? 'Enter dollar amounts (e.g., 2, 5, 10)' : 'Enter percentages (e.g., 15, 20, 25)'}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => {
                                            const tips = [0, 1, 2].map(i => {
                                                const input = document.getElementById(`tip-input-${i}`) as HTMLInputElement;
                                                return parseInt(input?.value) || 0;
                                            });
                                            // Save as JSON string to match database field tipSuggestions
                                            updateConfig({ tipSuggestions: JSON.stringify(tips) });
                                        }}
                                        disabled={saving}
                                        className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Tips'}
                                    </button>
                                </div>
                            )}

                            {categoryView === 'payments' && (
                                <div className="space-y-4">
                                    <p className="text-stone-400">Accepted payment methods</p>
                                    <div className="space-y-2">
                                        {[
                                            { id: 'acceptsCash', label: 'Cash', enabled: client.acceptsCash },
                                            { id: 'acceptsCard', label: 'Card', enabled: client.acceptsCard },
                                            { id: 'acceptsEbt', label: 'EBT', enabled: client.acceptsEbt },
                                        ].map((method) => (
                                            <button
                                                key={method.id}
                                                onClick={() => { updateConfig({ [method.id]: !method.enabled }); }}
                                                disabled={saving}
                                                className={`w-full p-3 rounded-lg border flex items-center justify-between ${method.enabled
                                                    ? 'border-emerald-500/50 bg-emerald-500/10'
                                                    : 'border-stone-700'
                                                    }`}
                                            >
                                                <span className="text-stone-200">{method.label}</span>
                                                <span className={method.enabled ? 'text-emerald-400' : 'text-stone-500'}>
                                                    {method.enabled ? <CheckCircle size={18} /> : '○'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {categoryView === 'documents' && (
                                <div className="space-y-4">
                                    <p className="text-stone-400">Required onboarding documents</p>
                                    <div className="space-y-2">
                                        {[
                                            { id: 'voidCheck', label: 'Void Check', uploaded: client.documents.voidCheck },
                                            { id: 'driverLicense', label: 'Driver License', uploaded: client.documents.driverLicense },
                                            { id: 'feinLetter', label: 'FEIN Letter', uploaded: client.documents.feinLetter },
                                        ].map((doc) => (
                                            <div
                                                key={doc.id}
                                                className={`p-3 rounded-lg border flex items-center justify-between ${doc.uploaded ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-orange-500/50 bg-orange-500/10'
                                                    }`}
                                            >
                                                <span className="text-stone-200">{doc.label}</span>
                                                <span className={doc.uploaded ? 'text-emerald-400' : 'text-orange-400'}>
                                                    {doc.uploaded ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {categoryView === 'locations' && (
                                <div className="space-y-4">
                                    <p className="text-stone-400">{client.locations.length} location{client.locations.length !== 1 ? 's' : ''}</p>
                                    {client.locations.length === 0 ? (
                                        <p className="text-stone-500 py-4">No locations configured</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {client.locations.map((loc) => (
                                                <div key={loc.id} className="p-3 rounded-lg border border-stone-700 bg-stone-700/30">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <MapPin size={14} className="text-pink-400" />
                                                        <span className="text-stone-100 font-medium">{loc.name}</span>
                                                    </div>
                                                    {loc.address && <p className="text-stone-500 text-sm ml-5">{loc.address}</p>}
                                                    <p className="text-stone-500 text-xs ml-5 mt-1">
                                                        {loc.stations.length} station{loc.stations.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {categoryView === 'features' && (
                                <div className="space-y-4">
                                    <p className="text-stone-400">Click to enable or disable features for this client</p>
                                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                                        {[
                                            { id: 'usesInventory', name: 'Inventory Management', desc: 'Track products and stock levels' },
                                            { id: 'usesAgeVerification', name: 'Age Verification', desc: 'ID check for age-restricted items' },
                                            { id: 'usesLottery', name: 'Lottery', desc: 'Lottery ticket sales and payouts' },
                                            { id: 'usesTobaccoScan', name: 'Tobacco Scan', desc: 'Scan tobacco products for compliance' },
                                            { id: 'usesScheduling', name: 'Staff Scheduling', desc: 'Employee shift management' },
                                            { id: 'usesMemberships', name: 'Memberships', desc: 'Customer membership programs' },
                                            { id: 'usesCommissions', name: 'Commissions', desc: 'Employee commission tracking' },
                                            { id: 'usesLoyalty', name: 'Loyalty Program', desc: 'Customer rewards and points' },
                                            { id: 'usesGiftCards', name: 'Gift Cards', desc: 'Sell and redeem gift cards' },
                                            { id: 'usesEmailMarketing', name: 'Email Marketing', desc: 'Send promotional emails' },
                                            { id: 'usesSmsMarketing', name: 'SMS Marketing', desc: 'Send text message promotions' },
                                            { id: 'usesServices', name: 'Services', desc: 'Service-based appointments' },
                                            { id: 'usesAppointments', name: 'Appointments', desc: 'Online booking system' },
                                            { id: 'usesReviewManagement', name: 'Reviews', desc: 'Customer review collection' },
                                            { id: 'enableResources', name: 'Resources', desc: 'Resource booking (rooms, equipment)' },
                                        ].map((feature) => {
                                            const isEnabled = client.features[feature.id] || false;
                                            return (
                                                <button
                                                    key={feature.id}
                                                    onClick={() => { updateConfig({ [feature.id]: !isEnabled }); }}
                                                    disabled={saving}
                                                    className={`w-full p-3 rounded-lg border flex items-center justify-between text-left transition-colors ${isEnabled
                                                        ? 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20'
                                                        : 'border-stone-700 hover:border-stone-600'
                                                        }`}
                                                >
                                                    <div>
                                                        <span className={`font-medium ${isEnabled ? 'text-emerald-300' : 'text-stone-200'}`}>{feature.name}</span>
                                                        <p className="text-stone-500 text-xs">{feature.desc}</p>
                                                    </div>
                                                    <span className={isEnabled ? 'text-emerald-400' : 'text-stone-500'}>
                                                        {isEnabled ? <CheckCircle size={18} /> : '○'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {categoryView === 'pricing' && (
                                <div className="space-y-4">
                                    <p className="text-stone-400">Pricing tier and card surcharge settings</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm text-stone-300 mb-2">Pricing Tier</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Standard', 'Premium', 'Enterprise'].map((tier) => (
                                                    <button
                                                        key={tier}
                                                        className="p-3 rounded-lg border border-stone-700 hover:border-orange-500/50 text-stone-200"
                                                    >
                                                        {tier}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-stone-300 mb-2">Card Surcharge</label>
                                            <div className="flex gap-2">
                                                <select className="flex-1 bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-stone-200">
                                                    <option value="PERCENTAGE">Percentage</option>
                                                    <option value="FLAT">Flat Fee</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    defaultValue={client.cardSurchargeValue}
                                                    className="w-24 bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-stone-200"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {categoryView === 'branding' && (
                                <div className="space-y-4">
                                    <p className="text-stone-400">Upload the client's store logo for personalized POS experience</p>

                                    {/* Logo Preview */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 rounded-xl bg-stone-700 border border-stone-600 flex items-center justify-center overflow-hidden">
                                            {storeLogo ? (
                                                <img src={storeLogo} alt="Store Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <Building2 className="h-10 w-10 text-stone-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = () => {
                                                            if (typeof reader.result === 'string') {
                                                                setStoreLogo(reader.result);
                                                            }
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 border border-stone-600 rounded-lg text-sm transition-colors"
                                            >
                                                <Upload size={16} />
                                                Upload Logo
                                            </button>
                                            {storeLogo && (
                                                <button
                                                    onClick={() => setStoreLogo(null)}
                                                    className="text-sm text-red-400 hover:text-red-300"
                                                >
                                                    Remove Logo
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-stone-500 text-xs">PNG or JPG, max 1MB. Logo appears on employee login and customer display.</p>

                                    <button
                                        onClick={() => {
                                            updateConfig({ storeLogo: storeLogo });
                                            setCategoryView(null);
                                        }}
                                        disabled={saving}
                                        className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Branding'}
                                    </button>
                                </div>
                            )}
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
