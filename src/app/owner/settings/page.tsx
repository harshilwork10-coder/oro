'use client';

import { useState } from 'react';
import { Store, CreditCard, Bell, Users, Shield, Palette, Clock, MapPin, ChevronRight } from 'lucide-react';

type SettingsSection = 'general' | 'payment' | 'notifications' | 'employees' | 'security' | 'appearance' | 'hours' | 'location';

const sections = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'payment', label: 'Payment Settings', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'employees', label: 'Employee Settings', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'hours', label: 'Business Hours', icon: Clock },
    { id: 'location', label: 'Location Info', icon: MapPin },
];

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState<SettingsSection>('general');

    return (
        <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Settings</h1>

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-56 space-y-1">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id as SettingsSection)}
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
                            </div>
                        )}

                        {activeSection === 'payment' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
                                    <div>
                                        <h3 className="font-medium text-[var(--text-primary)]">Card Surcharge</h3>
                                        <p className="text-sm text-[var(--text-muted)]">Apply surcharge for card payments</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Surcharge Amount (%)</label>
                                    <input
                                        type="number"
                                        defaultValue="3.99"
                                        step="0.01"
                                        min="0"
                                        max="10"
                                        className="w-full max-w-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    />
                                    <p className="text-xs text-[var(--text-muted)] mt-1">Maximum 10%</p>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--border)]">
                                    <div>
                                        <h3 className="font-medium text-[var(--text-primary)]">Dual Pricing Display</h3>
                                        <p className="text-sm text-[var(--text-muted)]">Show both cash and card prices</p>
                                    </div>
                                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
                                </div>
                            </div>
                        )}

                        {activeSection !== 'general' && activeSection !== 'payment' && (
                            <div className="text-center py-8">
                                <p className="text-[var(--text-muted)]">Settings for this section coming soon</p>
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
