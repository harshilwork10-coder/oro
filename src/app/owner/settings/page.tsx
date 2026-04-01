'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Store, CreditCard, Bell, Users, Shield, Palette, Clock, MapPin, ChevronRight, Star, Check, Loader2, Globe, RefreshCw, Package, Truck, Lock } from 'lucide-react';

type SettingsSection = 'general' | 'payment' | 'notifications' | 'employees' | 'security' | 'appearance' | 'hours' | 'location' | 'integrations' | 'delivery';

const sections = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'payment', label: 'Payment Settings', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'employees', label: 'Employee Settings', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'hours', label: 'Business Hours', icon: Clock },
    { id: 'location', label: 'Location Info', icon: MapPin },
    { id: 'integrations', label: 'Google Pointy', icon: Globe },
    { id: 'delivery', label: 'Delivery Platforms', icon: Truck },
];

export default function SettingsPage() {
    const { data: session } = useSession();
    const [activeSection, setActiveSection] = useState<SettingsSection>('general');
    const router = useRouter();
    const isProvider = (session?.user as any)?.role === 'PROVIDER';
    const [googlePlaceId, setGooglePlaceId] = useState('');
    const [placeIdSaving, setPlaceIdSaving] = useState(false);
    const [placeIdSaved, setPlaceIdSaved] = useState(false);
    const [placeIdError, setPlaceIdError] = useState<string | null>(null);

    // Google Pointy state
    const [merchantId, setMerchantId] = useState('');
    const [storeCode, setStoreCode] = useState('');
    const [pointyStats, setPointyStats] = useState<any>(null);
    const [pointyPreview, setPointyPreview] = useState<any[]>([]);
    const [pointySyncing, setPointySyncing] = useState(false);
    const [pointySyncResult, setPointySyncResult] = useState<any>(null);

    // Delivery platform state
    const [ddStoreId, setDdStoreId] = useState('');
    const [ddApiKey, setDdApiKey] = useState('');
    const [ueStoreId, setUeStoreId] = useState('');
    const [ueClientId, setUeClientId] = useState('');
    const [ueClientSecret, setUeClientSecret] = useState('');
    const [deliveryStats, setDeliveryStats] = useState<any>(null);
    const [menuSyncing, setMenuSyncing] = useState<string | null>(null);
    const [menuSyncResult, setMenuSyncResult] = useState<any>(null);

    // Load existing Google Place ID
    useEffect(() => {
        fetch('/api/owner/location-settings')
            .then(res => res.json())
            .then(data => {
                if (data.googlePlaceId) setGooglePlaceId(data.googlePlaceId);
            })
            .catch(() => { });

        // Load Google Pointy stats
        fetch('/api/integrations/google-pointy')
            .then(res => res.json())
            .then(data => setPointyStats(data))
            .catch(() => { });

        // Load delivery platform stats
        fetch('/api/integrations/delivery')
            .then(res => res.json())
            .then(data => setDeliveryStats(data))
            .catch(() => { });
    }, []);

    const handleMenuSync = async (platform: string) => {
        const storeId = platform === 'doordash' ? ddStoreId : ueStoreId;
        if (!storeId) return;
        setMenuSyncing(platform);
        try {
            const res = await fetch('/api/integrations/delivery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync_menu', platform, storeId })
            });
            const data = await res.json();
            setMenuSyncResult({ ...data, platform });
        } catch {
            setMenuSyncResult({ error: 'Sync failed', platform });
        }
        setMenuSyncing(null);
    };

    const handlePointyPreview = async () => {
        const res = await fetch('/api/integrations/google-pointy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'preview' })
        });
        const data = await res.json();
        setPointyPreview(data.products || []);
    };

    const handlePointySync = async () => {
        if (!merchantId || !storeCode) return;
        setPointySyncing(true);
        try {
            const res = await fetch('/api/integrations/google-pointy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'sync', merchantId, storeCode })
            });
            const data = await res.json();
            setPointySyncResult(data);
        } catch {
            setPointySyncResult({ error: 'Sync failed' });
        }
        setPointySyncing(false);
    };

    const handleSaveGooglePlaceId = async () => {
        setPlaceIdSaving(true);
        setPlaceIdError(null);
        try {
            const res = await fetch('/api/owner/location-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ googlePlaceId: googlePlaceId.trim() })
            });
            if (res.ok) {
                setPlaceIdSaved(true);
                setTimeout(() => setPlaceIdSaved(false), 3000);
            } else {
                setPlaceIdError('Failed to save. Please try again.');
            }
        } catch {
            setPlaceIdError('Network error. Check your connection.');
        }
        setPlaceIdSaving(false);
    };

    const handleSectionClick = (sectionId: SettingsSection) => {
        if (sectionId === 'appearance') {
            router.push('/owner/settings/appearance');
            return;
        }
        setActiveSection(sectionId);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Settings</h1>

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-56 space-y-1">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => handleSectionClick(section.id as SettingsSection)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeSection === section.id
                                ? 'bg-[var(--primary)] text-white'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <section.icon size={18} />
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="glass-panel rounded-xl border border-[var(--border)] p-6">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
                            {sections.find(s => s.id === activeSection)?.label}
                        </h2>

                        {activeSection === 'general' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Store Name</label>
                                    <input
                                        type="text"
                                        defaultValue="Downtown Store"
                                        className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Business Type</label>
                                    <select className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)]">
                                        <option value="retail">Retail</option>
                                        <option value="salon">Salon</option>
                                        <option value="both">Both</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Timezone</label>
                                    <select className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)]">
                                        <option value="CST">Central Time (CT)</option>
                                        <option value="EST">Eastern Time (ET)</option>
                                        <option value="PST">Pacific Time (PT)</option>
                                    </select>
                                </div>

                                {/* Google Reviews Section */}
                                <div className="pt-4 border-t border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Star size={18} className="text-yellow-400" />
                                        <h3 className="font-semibold text-[var(--text-primary)]">Google Reviews</h3>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] mb-3">
                                        Enter your Google Place ID to enable review prompts on POS after checkout.
                                        Customers who rate 4-5 stars will be guided to leave a Google Review.
                                    </p>
                                    <div className="flex gap-2 items-start max-w-md">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={googlePlaceId}
                                                onChange={(e) => setGooglePlaceId(e.target.value)}
                                                placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
                                            />
                                            {placeIdError && (
                                                <p className="text-xs text-red-400 mt-1">{placeIdError}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleSaveGooglePlaceId}
                                            disabled={placeIdSaving}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${placeIdSaved
                                                ? 'bg-green-600 text-white'
                                                : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white'
                                                }`}
                                        >
                                            {placeIdSaving ? (
                                                <><Loader2 size={14} className="animate-spin" /> Saving</>
                                            ) : placeIdSaved ? (
                                                <><Check size={14} /> Saved!</>
                                            ) : (
                                                'Save'
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] mt-2">
                                        <a
                                            href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[var(--primary)] hover:underline"
                                        >
                                            How to find your Google Place ID →
                                        </a>
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeSection === 'payment' && (
                            <div className="space-y-4">
                                {/* FIX 6: Pricing mode is PROVIDER-controlled.
                                    Dual Pricing toggle and Surcharge Amount removed.
                                    Owner sees current effective values, read-only. */}
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                                    <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Shield size={18} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-blue-200 text-sm">Pricing Mode — Managed by ORO</h4>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            Your store's pricing model and card surcharge are configured by ORO Support to ensure
                                            compliance with your franchise agreement. To request a change, contact your account manager.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Current Pricing Mode</p>
                                        <p className="text-base font-bold text-[var(--text-primary)]">Dual Pricing</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Cash & card prices shown separately</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                                        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Card Surcharge</p>
                                        <p className="text-base font-bold text-[var(--text-primary)]">3.99%</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Applied automatically at checkout</p>
                                    </div>
                                </div>

                                <p className="text-xs text-[var(--text-muted)]">
                                    Need to change your pricing model?
                                    <a href="tel:+18005551234" className="text-[var(--primary)] hover:underline ml-1">Contact ORO Support →</a>
                                </p>
                            </div>
                        )}

                        {activeSection !== 'general' && activeSection !== 'payment' && activeSection !== 'integrations' && (
                            <div className="text-center py-8">
                                <p className="text-[var(--text-muted)]">Settings for this section coming soon</p>
                            </div>
                        )}

                        {activeSection === 'integrations' && (
                            <div className="space-y-6">
                                {/* Pointy Header */}
                                <div className="flex items-center gap-3 mb-2">
                                    <Globe size={22} className="text-blue-400" />
                                    <div>
                                        <h3 className="font-semibold text-[var(--text-primary)]">Google Pointy — "See What's In Store"</h3>
                                        <p className="text-sm text-[var(--text-muted)]">
                                            Show your products on Google Search, Maps & Shopping when customers search nearby.
                                        </p>
                                    </div>
                                </div>

                                {/* Coverage Stats */}
                                {pointyStats?.inventory && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                                            <p className="text-2xl font-bold text-[var(--text-primary)]">{pointyStats.inventory.totalProducts}</p>
                                            <p className="text-xs text-[var(--text-muted)]">Total Products</p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                                            <p className="text-2xl font-bold text-green-400">{pointyStats.inventory.productsWithBarcode}</p>
                                            <p className="text-xs text-[var(--text-muted)]">With Barcodes (Syncable)</p>
                                        </div>
                                        <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                                            <p className="text-2xl font-bold text-blue-400">{pointyStats.inventory.coveragePercent}%</p>
                                            <p className="text-xs text-[var(--text-muted)]">Coverage</p>
                                        </div>
                                    </div>
                                )}

                                {/* Merchant Center Settings — PROVIDER ONLY */}
                                {isProvider ? (
                                <div className="p-4 rounded-lg border border-[var(--border)] space-y-4">
                                    <h4 className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                                        <Package size={16} />
                                        Google Merchant Center
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Merchant Center ID</label>
                                            <input
                                                type="text"
                                                value={merchantId}
                                                onChange={(e) => setMerchantId(e.target.value)}
                                                placeholder="e.g. 12345678"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                <a href="https://merchants.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                    Get from Google Merchant Center →
                                                </a>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Store Code</label>
                                            <input
                                                type="text"
                                                value={storeCode}
                                                onChange={(e) => setStoreCode(e.target.value)}
                                                placeholder="e.g. STORE001"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                            <p className="text-xs text-[var(--text-muted)] mt-1">Must match store code in Merchant Center</p>
                                        </div>
                                    </div>
                                </div>
                                ) : (
                                <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center gap-3">
                                    <Lock size={18} className="text-stone-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">Google Merchant Center credentials</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Managed by ORO / Provider. Contact support to update integration settings.</p>
                                    </div>
                                </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handlePointyPreview}
                                        className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors"
                                    >
                                        👀 Preview Syncable Products
                                    </button>
                                    <button
                                        onClick={handlePointySync}
                                        disabled={!merchantId || !storeCode || pointySyncing}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${!merchantId || !storeCode
                                            ? 'bg-stone-600 text-stone-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                                            }`}
                                    >
                                        {pointySyncing ? (
                                            <><RefreshCw size={14} className="animate-spin" /> Syncing...</>
                                        ) : (
                                            <><RefreshCw size={14} /> Sync to Google Now</>
                                        )}
                                    </button>
                                </div>

                                {/* Sync Result */}
                                {pointySyncResult && (
                                    <div className={`p-4 rounded-lg border ${pointySyncResult.success
                                        ? 'bg-green-500/10 border-green-500/30'
                                        : 'bg-red-500/10 border-red-500/30'
                                        }`}>
                                        <p className={`text-sm font-medium ${pointySyncResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                            {pointySyncResult.success
                                                ? `✅ ${pointySyncResult.synced} products prepared for Google Pointy`
                                                : `❌ ${pointySyncResult.error}`
                                            }
                                        </p>
                                        {pointySyncResult.syncedAt && (
                                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                                Synced at {new Date(pointySyncResult.syncedAt).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Preview Table */}
                                {pointyPreview.length > 0 && (
                                    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-[var(--surface)]">
                                                <tr>
                                                    <th className="text-left px-4 py-2 text-[var(--text-secondary)]">Product</th>
                                                    <th className="text-left px-4 py-2 text-[var(--text-secondary)]">Barcode</th>
                                                    <th className="text-left px-4 py-2 text-[var(--text-secondary)]">Price</th>
                                                    <th className="text-left px-4 py-2 text-[var(--text-secondary)]">Category</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pointyPreview.slice(0, 20).map((p: any) => (
                                                    <tr key={p.id} className="border-t border-[var(--border)]">
                                                        <td className="px-4 py-2 text-[var(--text-primary)]">{p.name}</td>
                                                        <td className="px-4 py-2 text-[var(--text-muted)] font-mono text-xs">{p.barcode}</td>
                                                        <td className="px-4 py-2 text-green-400">${p.price.toFixed(2)}</td>
                                                        <td className="px-4 py-2 text-[var(--text-muted)]">{p.category}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {pointyPreview.length > 20 && (
                                            <p className="text-xs text-[var(--text-muted)] px-4 py-2 bg-[var(--surface)]">Showing 20 of {pointyPreview.length}</p>
                                        )}
                                    </div>
                                )}

                                <p className="text-xs text-[var(--text-muted)]">
                                    Products need a UPC/EAN barcode to sync. Add barcodes in Inventory → Products.
                                    Google matches barcodes to its product catalog for images and descriptions.
                                </p>
                            </div>
                        )}
                        {activeSection === 'delivery' && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <Truck size={22} className="text-orange-400" />
                                    <div>
                                        <h3 className="font-semibold text-[var(--text-primary)]">DoorDash & Uber Eats</h3>
                                        <p className="text-sm text-[var(--text-muted)]">
                                            Delivery platform connections. Orders flow directly into POS.
                                        </p>
                                    </div>
                                </div>

                                {/* Menu Stats — visible to all */}
                                {deliveryStats?.menuStats && (
                                    <div className="p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center gap-6">
                                        <div>
                                            <p className="text-2xl font-bold text-[var(--text-primary)]">{deliveryStats.menuStats.totalProducts}</p>
                                            <p className="text-xs text-[var(--text-muted)]">Menu Items Ready</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-blue-400">{deliveryStats.menuStats.categories?.length || 0}</p>
                                            <p className="text-xs text-[var(--text-muted)]">Categories</p>
                                        </div>
                                    </div>
                                )}

                                {/* PROVIDER-only: credential management */}
                                {isProvider ? (
                                <>
                                {/* DoorDash */}
                                <div className="p-5 rounded-lg border border-[var(--border)] space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">DD</div>
                                        <div>
                                            <h4 className="font-medium text-[var(--text-primary)]">DoorDash</h4>
                                            <p className="text-xs text-[var(--text-muted)]">Marketplace + Drive API</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Store ID</label>
                                            <input
                                                type="text"
                                                value={ddStoreId}
                                                onChange={(e) => setDdStoreId(e.target.value)}
                                                placeholder="From DoorDash Merchant Portal"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1">API Key</label>
                                            <input
                                                type="password"
                                                value={ddApiKey}
                                                onChange={(e) => setDdApiKey(e.target.value)}
                                                placeholder="Developer Key Secret"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleMenuSync('doordash')}
                                        disabled={!ddStoreId || menuSyncing === 'doordash'}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${!ddStoreId ? 'bg-stone-600 text-stone-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                                    >
                                        {menuSyncing === 'doordash' ? (
                                            <><RefreshCw size={14} className="animate-spin" /> Syncing...</>
                                        ) : (
                                            <><RefreshCw size={14} /> Push Menu to DoorDash</>
                                        )}
                                    </button>
                                </div>

                                {/* Uber Eats */}
                                <div className="p-5 rounded-lg border border-[var(--border)] space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">UE</div>
                                        <div>
                                            <h4 className="font-medium text-[var(--text-primary)]">Uber Eats</h4>
                                            <p className="text-xs text-[var(--text-muted)]">Marketplace API</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Store ID</label>
                                            <input
                                                type="text"
                                                value={ueStoreId}
                                                onChange={(e) => setUeStoreId(e.target.value)}
                                                placeholder="Uber Eats Store ID"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Client ID</label>
                                            <input
                                                type="text"
                                                value={ueClientId}
                                                onChange={(e) => setUeClientId(e.target.value)}
                                                placeholder="OAuth Client ID"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Client Secret</label>
                                            <input
                                                type="password"
                                                value={ueClientSecret}
                                                onChange={(e) => setUeClientSecret(e.target.value)}
                                                placeholder="OAuth Secret"
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleMenuSync('ubereats')}
                                        disabled={!ueStoreId || menuSyncing === 'ubereats'}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${!ueStoreId ? 'bg-stone-600 text-stone-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                                    >
                                        {menuSyncing === 'ubereats' ? (
                                            <><RefreshCw size={14} className="animate-spin" /> Syncing...</>
                                        ) : (
                                            <><RefreshCw size={14} /> Push Menu to Uber Eats</>
                                        )}
                                    </button>
                                </div>

                                {/* Sync Result */}
                                {menuSyncResult && (
                                    <div className={`p-4 rounded-lg border ${menuSyncResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                                        <p className={`text-sm font-medium ${menuSyncResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                            {menuSyncResult.success ? `✅ ${menuSyncResult.message}` : `❌ ${menuSyncResult.error}`}
                                        </p>
                                    </div>
                                )}
                                </>
                                ) : (
                                /* Owner: locked banner — no credentials visible */
                                <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center gap-4">
                                    <Lock size={22} className="text-stone-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-[var(--text-primary)]">Delivery Platform Credentials</p>
                                        <p className="text-sm text-[var(--text-muted)] mt-0.5">
                                            DoorDash and Uber Eats API credentials are managed by ORO / Provider.
                                            Contact support to update integration settings or troubleshoot connections.
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)] mt-2">Orders still auto-flow into your POS when the integration is active.</p>
                                    </div>
                                </div>
                                )}
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-[var(--border)]">
                            <button className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

