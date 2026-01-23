'use client';

import { useState, useEffect } from 'react';
import { Save, FileText, AlertTriangle, Clock, Palette, Loader2 } from 'lucide-react';
import Toast from '@/components/ui/Toast';

interface BrandSettings {
    // Customer Policies (shown before service)
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
}

const DEFAULT_SETTINGS: BrandSettings = {
    liabilityWaiver: `I understand and agree that:
1. The salon/barber is not responsible for allergic reactions to products used during service.
2. I have disclosed any relevant medical conditions or allergies.
3. Results may vary and are not guaranteed.
4. I am responsible for communicating my desired outcome clearly.`,
    cancellationPolicy: 'Appointments must be cancelled at least 24 hours in advance to avoid a cancellation fee.',
    noShowPolicy: 'No-show appointments may result in a charge equal to 50% of the scheduled service.',
    depositRequired: false,
    depositPercent: 25,
    brandName: '',
    brandColor: '#f59e0b',
    defaultCurrency: 'USD',
    timezone: 'America/Chicago',
};

export default function FranchisorSettingsPage() {
    const [settings, setSettings] = useState<BrandSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<'policies' | 'brand'>('policies');

    useEffect(() => {
        // TODO: Fetch settings from API
        // For now, use defaults
        setLoading(false);
    }, []);

    async function handleSave() {
        setSaving(true);
        try {
            // TODO: Save to API
            await new Promise(r => setTimeout(r, 500)); // Simulate save
            setToast({ message: 'Settings saved!', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to save settings', type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brand Settings</h1>
                    <p className="text-sm text-[var(--text-muted)]">Settings apply to all franchisees and locations</p>
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
                    { id: 'policies', label: 'Customer Policies', icon: FileText },
                    { id: 'brand', label: 'Brand Defaults', icon: Palette },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Policies Tab */}
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
                            placeholder="Enter liability waiver text..."
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
                                <input
                                    type="checkbox"
                                    checked={settings.depositRequired}
                                    onChange={e => setSettings({ ...settings, depositRequired: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-[var(--border)] peer-focus:ring-2 peer-focus:ring-[var(--primary)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                            </label>
                        </div>

                        {settings.depositRequired && (
                            <div className="flex items-center gap-3">
                                <label className="text-sm text-[var(--text-secondary)]">Deposit Amount:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={settings.depositPercent}
                                    onChange={e => setSettings({ ...settings, depositPercent: parseInt(e.target.value) || 25 })}
                                    className="w-20 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                                <span className="text-sm text-[var(--text-muted)]">% of service price</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Brand Tab */}
            {activeTab === 'brand' && (
                <div className="space-y-6">
                    <div className="glass-panel rounded-xl border border-[var(--border)] p-6">
                        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Brand Defaults</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Brand Name</label>
                                <input
                                    type="text"
                                    value={settings.brandName}
                                    onChange={e => setSettings({ ...settings, brandName: e.target.value })}
                                    placeholder="Your Brand Name"
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Brand Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={settings.brandColor}
                                        onChange={e => setSettings({ ...settings, brandColor: e.target.value })}
                                        className="w-10 h-10 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={settings.brandColor}
                                        onChange={e => setSettings({ ...settings, brandColor: e.target.value })}
                                        className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Currency</label>
                                <select
                                    value={settings.defaultCurrency}
                                    onChange={e => setSettings({ ...settings, defaultCurrency: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="CAD">CAD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Timezone</label>
                                <select
                                    value={settings.timezone}
                                    onChange={e => setSettings({ ...settings, timezone: e.target.value })}
                                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                >
                                    <option value="America/New_York">Eastern (ET)</option>
                                    <option value="America/Chicago">Central (CT)</option>
                                    <option value="America/Denver">Mountain (MT)</option>
                                    <option value="America/Los_Angeles">Pacific (PT)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-400">
                            💡 These defaults will apply to all new locations created under your brand.
                            Individual franchisees can override some settings at the location level.
                        </p>
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
