'use client';

import { useState, useEffect } from 'react';
import { Save, FileText, AlertTriangle, Clock, Palette, Loader2, CheckCircle, Lock, Unlock, Shield } from 'lucide-react';
import Toast from '@/components/ui/Toast';
import { HQAccessGuard } from '@/components/franchisor/HQAccessGuard';

interface BrandSettings {
    // Customer Policies
    liabilityWaiver: string;
    cancellationPolicy: string;
    noShowPolicy: string;
    depositRequired: boolean;
    depositPercent: number;

    // Brand Defaults
    brandName: string;
    brandColor: string;
    defaultCurrency: string;
    timezone: string;

    // Brand Lock Controls
    lockPricing: boolean;
    lockServices: boolean;
    lockProducts: boolean;
    lockCommission: boolean;
}

const DEFAULT_SETTINGS: BrandSettings = {
    liabilityWaiver: `I understand and agree that:\n1. The salon/barber is not responsible for allergic reactions to products used during service.\n2. I have disclosed any relevant medical conditions or allergies.\n3. Results may vary and are not guaranteed.\n4. I am responsible for communicating my desired outcome clearly.`,
    cancellationPolicy: 'Appointments must be cancelled at least 24 hours in advance to avoid a cancellation fee.',
    noShowPolicy: 'No-show appointments may result in a charge equal to 50% of the scheduled service.',
    depositRequired: false,
    depositPercent: 25,
    brandName: '',
    brandColor: '#f59e0b',
    defaultCurrency: 'USD',
    timezone: 'America/Chicago',
    lockPricing: false,
    lockServices: false,
    lockProducts: false,
    lockCommission: false,
};

type SettingsTab = 'policies' | 'brand' | 'locks';

const LOCK_CONTROLS: Array<{
    key: keyof Pick<BrandSettings, 'lockPricing' | 'lockServices' | 'lockProducts' | 'lockCommission'>;
    label: string;
    description: string;
    impact: string;
}> = [
    {
        key: 'lockPricing',
        label: 'Lock Pricing',
        description: 'Franchisees cannot change service or product prices',
        impact: 'All 1,000 stores will charge the same prices set by Brand HQ',
    },
    {
        key: 'lockServices',
        label: 'Lock Services',
        description: 'Franchisees cannot add, remove, or modify services',
        impact: 'Only Brand HQ can manage the authorized service menu',
    },
    {
        key: 'lockProducts',
        label: 'Lock Products',
        description: 'Franchisees cannot add, remove, or modify products',
        impact: 'Only Brand HQ can manage the authorized retail product catalog',
    },
    {
        key: 'lockCommission',
        label: 'Lock Commission Rules',
        description: 'Franchisees cannot change commission structures for staff',
        impact: 'Brand-wide commission standards apply to all locations',
    },
];

export default function FranchisorSettingsPage() {
    const [settings, setSettings] = useState<BrandSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('policies');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Count active locks for badge
    const activeLockCount = [
        settings.lockPricing,
        settings.lockServices,
        settings.lockProducts,
        settings.lockCommission
    ].filter(Boolean).length;

    // Fetch settings from real API
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/franchisor/settings');
                if (res.ok) {
                    const data = await res.json();
                    setSettings(prev => ({
                        ...prev,
                        brandName: data.brandName || '',
                        brandColor: data.brandColor || '#f59e0b',
                        defaultCurrency: data.defaultCurrency || 'USD',
                        timezone: data.timezone || 'America/Chicago',
                        liabilityWaiver: data.liabilityWaiver || prev.liabilityWaiver,
                        cancellationPolicy: data.cancellationPolicy || prev.cancellationPolicy,
                        noShowPolicy: data.noShowPolicy || prev.noShowPolicy,
                        depositRequired: data.depositRequired ?? false,
                        depositPercent: data.depositPercent ?? 25,
                        lockPricing: data.lockPricing ?? false,
                        lockServices: data.lockServices ?? false,
                        lockProducts: data.lockProducts ?? false,
                        lockCommission: data.lockCommission ?? false,
                    }));
                }
            } catch (err) {
                console.error('[Settings] Failed to load:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    async function handleSave() {
        setSaving(true);
        try {
            const res = await fetch('/api/franchisor/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }
            setLastSaved(new Date());
            setToast({ message: 'Brand settings saved successfully.', type: 'success' });
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Failed to save settings';
            setToast({ message: msg, type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    function toggleLock(key: keyof Pick<BrandSettings, 'lockPricing' | 'lockServices' | 'lockProducts' | 'lockCommission'>) {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <HQAccessGuard requiredCap="canAccessSettings">
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brand Settings</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        Settings apply to all franchisees and locations
                        {lastSaved && (
                            <span className="ml-2 text-emerald-400 inline-flex items-center gap-1">
                                <CheckCircle size={12} />
                                Saved {lastSaved.toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 text-white rounded-lg font-medium"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={16} />}
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { id: 'policies' as SettingsTab, label: 'Customer Policies', icon: FileText },
                    { id: 'brand' as SettingsTab, label: 'Brand Defaults', icon: Palette },
                    { id: 'locks' as SettingsTab, label: 'Brand Lock Controls', icon: Shield, badge: activeLockCount },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                            activeTab === tab.id
                                ? tab.id === 'locks' && activeLockCount > 0
                                    ? 'bg-red-500 text-white'
                                    : 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.badge !== undefined && tab.badge > 0 && activeTab !== tab.id && (
                            <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── POLICIES TAB ── */}
            {activeTab === 'policies' && (
                <div className="space-y-6">
                    {/* Liability Waiver */}
                    <div className="glass-panel rounded-xl border border-[var(--border)] p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-500/20 rounded-lg">
                                <AlertTriangle className="text-amber-500" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text-primary)]">Liability Waiver</h3>
                                <p className="text-sm text-[var(--text-muted)]">Shown to customers before service (customer display)</p>
                            </div>
                        </div>
                        <textarea
                            value={settings.liabilityWaiver}
                            onChange={e => setSettings({ ...settings, liabilityWaiver: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                        />
                    </div>

                    {/* Cancellation Policy */}
                    <div className="glass-panel rounded-xl border border-[var(--border)] p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Clock className="text-blue-500" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text-primary)]">Cancellation Policy</h3>
                                <p className="text-sm text-[var(--text-muted)]">Shown when booking appointments</p>
                            </div>
                        </div>
                        <textarea
                            value={settings.cancellationPolicy}
                            onChange={e => setSettings({ ...settings, cancellationPolicy: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                        />
                    </div>

                    {/* No-Show Policy */}
                    <div className="glass-panel rounded-xl border border-[var(--border)] p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <AlertTriangle className="text-red-500" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text-primary)]">No-Show Policy</h3>
                                <p className="text-sm text-[var(--text-muted)]">Applied when customer doesn't show up</p>
                            </div>
                        </div>
                        <textarea
                            value={settings.noShowPolicy}
                            onChange={e => setSettings({ ...settings, noShowPolicy: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                        />
                    </div>

                    {/* Deposit Settings */}
                    <div className="glass-panel rounded-xl border border-[var(--border)] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-[var(--text-primary)]">Require Deposit</h3>
                                <p className="text-sm text-[var(--text-muted)]">Collect deposit when booking appointments</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={settings.depositRequired} onChange={e => setSettings({ ...settings, depositRequired: e.target.checked })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-[var(--border)] peer-focus:ring-2 peer-focus:ring-[var(--primary)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                            </label>
                        </div>
                        {settings.depositRequired && (
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-[var(--text-secondary)]">Deposit Amount:</label>
                                <input type="number" min="1" max="100" value={settings.depositPercent} onChange={e => setSettings({ ...settings, depositPercent: parseInt(e.target.value) || 25 })} className="w-20 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                                <span className="text-sm text-[var(--text-muted)]">% of service price</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── BRAND TAB ── */}
            {activeTab === 'brand' && (
                <div className="space-y-6">
                    <div className="glass-panel rounded-xl border border-[var(--border)] p-6">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Brand Defaults</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Brand Name</label>
                                <input type="text" value={settings.brandName} onChange={e => setSettings({ ...settings, brandName: e.target.value })} placeholder="Your Brand Name" className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Brand Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={settings.brandColor} onChange={e => setSettings({ ...settings, brandColor: e.target.value })} className="w-10 h-10 rounded cursor-pointer" />
                                    <input type="text" value={settings.brandColor} onChange={e => setSettings({ ...settings, brandColor: e.target.value })} className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Currency</label>
                                <select value={settings.defaultCurrency} onChange={e => setSettings({ ...settings, defaultCurrency: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                                    <option value="USD">USD ($)</option>
                                    <option value="CAD">CAD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Timezone</label>
                                <select value={settings.timezone} onChange={e => setSettings({ ...settings, timezone: e.target.value })} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                                    <option value="America/New_York">Eastern (ET)</option>
                                    <option value="America/Chicago">Central (CT)</option>
                                    <option value="America/Denver">Mountain (MT)</option>
                                    <option value="America/Los_Angeles">Pacific (PT)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-400">💡 Brand name and color are stored on your franchisor profile and apply to all new locations.</p>
                    </div>
                </div>
            )}

            {/* ── BRAND LOCK CONTROLS TAB ── */}
            {activeTab === 'locks' && (
                <div className="space-y-4">
                    {/* Enterprise lock explanation header */}
                    <div className={`rounded-xl border p-4 mb-6 ${activeLockCount > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
                        <div className="flex items-center gap-3">
                            <Shield size={22} className={activeLockCount > 0 ? 'text-red-400' : 'text-[var(--text-muted)]'} />
                            <div>
                                <p className="font-semibold text-[var(--text-primary)]">
                                    Brand Lock Controls
                                    {activeLockCount > 0 && (
                                        <span className="ml-2 text-sm font-normal text-red-400">
                                            — {activeLockCount} lock{activeLockCount !== 1 ? 's' : ''} active
                                        </span>
                                    )}
                                </p>
                                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                                    When a lock is <strong className="text-[var(--text-secondary)]">ON</strong>, franchisees in your entire network cannot override that setting.
                                    These controls enforce brand standards across all {activeLockCount > 0 ? 'locations' : '1,000 stores'}.
                                </p>
                            </div>
                        </div>
                    </div>

                    {LOCK_CONTROLS.map(({ key, label, description, impact }) => {
                        const isLocked = settings[key];
                        return (
                            <div
                                key={key}
                                className={`glass-panel rounded-xl border p-5 transition-all ${isLocked ? 'border-red-500/40 bg-red-500/5' : 'border-[var(--border)]'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-lg mt-0.5 ${isLocked ? 'bg-red-500/20' : 'bg-[var(--surface-hover)]'}`}>
                                            {isLocked
                                                ? <Lock size={18} className="text-red-400" />
                                                : <Unlock size={18} className="text-[var(--text-muted)]" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-[var(--text-primary)]">{label}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isLocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                    {isLocked ? 'LOCKED' : 'UNLOCKED'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
                                            {isLocked && (
                                                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                                    <Lock size={11} /> {impact}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Toggle */}
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                                        <input
                                            type="checkbox"
                                            checked={isLocked}
                                            onChange={() => toggleLock(key)}
                                            className="sr-only peer"
                                        />
                                        <div className={`w-12 h-6 rounded-full peer transition-colors ${isLocked ? 'bg-red-500' : 'bg-[var(--border)]'} peer-focus:ring-2 peer-focus:ring-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-6`}></div>
                                    </label>
                                </div>
                            </div>
                        );
                    })}

                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-sm text-amber-400">
                            ⚠️ Enabling a lock immediately prevents franchisees from overriding this setting at their location level.
                            Save your changes to apply to the entire network.
                        </p>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
        </HQAccessGuard>
    );
}
