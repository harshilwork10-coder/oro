'use client';

import { useState } from 'react';
import { Settings, Shield, Key, Mail, Users, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { SYSTEM_MODULES, SYSTEM_ROLES, SYSTEM_TEMPLATES, SYSTEM_INTEGRATIONS } from '@/lib/constants/provider';

type SystemTab = 'modules' | 'roles' | 'templates' | 'integrations' | 'security';

export default function SystemPage() {
    const [activeTab, setActiveTab] = useState<SystemTab>('modules');

    const tabs: { id: SystemTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
        { id: 'modules', label: 'Modules', icon: Settings },
        { id: 'roles', label: 'Roles', icon: Users },
        { id: 'templates', label: 'Templates', icon: Mail },
        { id: 'integrations', label: 'Integrations', icon: Key },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    const modules = SYSTEM_MODULES;

    return (
        <div>
            {/* ⚠️ PLACEHOLDER BANNER - This page is not connected to any backend */}
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3">
                <span className="text-amber-400 text-xl">⚠️</span>
                <div>
                    <p className="text-amber-400 font-semibold text-sm">Placeholder — Not Connected</p>
                    <p className="text-amber-400/70 text-xs">This page displays static defaults only. Toggles and save buttons are not functional. Settings will be wired to onboarding/provisioning in a future release.</p>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">System Settings</h1>
                    <p className="text-sm text-stone-400 mt-1">Platform configuration and defaults</p>
                </div>
            </div>

            <div className="flex gap-1 mb-6 border-b border-stone-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'text-orange-400 border-b-2 border-orange-500' : 'text-stone-400 hover:text-stone-200'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'modules' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6">
                    <h3 className="font-medium text-stone-100 mb-4">Default Modules by Business Type</h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-stone-700">
                                <th className="px-4 py-3 text-left text-stone-400">Module</th>
                                <th className="px-4 py-3 text-center text-stone-400">Retail</th>
                                <th className="px-4 py-3 text-center text-stone-400">Salon/Service</th>
                            </tr>
                        </thead>
                        <tbody>
                            {modules.map((mod) => (
                                <tr key={mod.name} className="border-b border-stone-800/50">
                                    <td className="px-4 py-3 text-stone-200">{mod.name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button className={mod.retail ? 'text-emerald-400' : 'text-stone-600'}>
                                            {mod.retail ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button className={mod.salon ? 'text-emerald-400' : 'text-stone-600'}>
                                            {mod.salon ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button className="mt-6 flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            )}

            {activeTab === 'roles' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6">
                    <h3 className="font-medium text-stone-100 mb-4">Role Templates</h3>
                    <div className="space-y-4">
                        {SYSTEM_ROLES.map((role) => (
                            <div key={role.name} className="flex items-center justify-between p-4 border border-stone-700 rounded-lg">
                                <div>
                                    <p className="text-stone-100 font-medium">{role.name}</p>
                                    <p className="text-stone-500 text-sm">{role.permissions}</p>
                                </div>
                                <button className="text-orange-400 text-sm">Edit</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6">
                    <h3 className="font-medium text-stone-100 mb-4">Email & SMS Templates</h3>
                    <div className="space-y-4">
                        {SYSTEM_TEMPLATES.map((tpl) => (
                            <div key={tpl.name} className="flex items-center justify-between p-4 border border-stone-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Mail size={18} className="text-stone-500" />
                                    <div>
                                        <p className="text-stone-100 font-medium">{tpl.name}</p>
                                        <p className="text-stone-500 text-sm">{tpl.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="px-2 py-0.5 bg-stone-700 text-stone-300 rounded text-xs uppercase">{tpl.type}</span>
                                    <button className="text-orange-400 text-sm">Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'integrations' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6">
                    <h3 className="font-medium text-stone-100 mb-4">Integration Keys</h3>
                    <div className="space-y-4">
                        {SYSTEM_INTEGRATIONS.map((int) => (
                            <div key={int.name} className="flex items-center justify-between p-4 border border-stone-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Key size={18} className="text-stone-500" />
                                    <div>
                                        <p className="text-stone-100 font-medium">{int.name}</p>
                                        {int.lastUsed && <p className="text-stone-500 text-sm">Last used: {int.lastUsed}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded text-xs ${int.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-400'}`}>
                                        {int.status}
                                    </span>
                                    <button className="text-orange-400 text-sm">Configure</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="space-y-6">
                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6">
                        <h3 className="font-medium text-stone-100 mb-4">Password Policy</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Minimum Length</label>
                                <input type="number" defaultValue={8} min={6} max={32} className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200" />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Password Expiry (days)</label>
                                <input type="number" defaultValue={90} min={0} max={365} className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 px-3 text-stone-200" />
                            </div>
                            <label className="flex items-center gap-2 p-3 border border-stone-700 rounded-lg cursor-pointer">
                                <input type="checkbox" defaultChecked className="rounded bg-stone-800 border-stone-600" />
                                <span className="text-stone-300 text-sm">Require uppercase letter</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-stone-700 rounded-lg cursor-pointer">
                                <input type="checkbox" defaultChecked className="rounded bg-stone-800 border-stone-600" />
                                <span className="text-stone-300 text-sm">Require number</span>
                            </label>
                        </div>
                    </div>

                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6">
                        <h3 className="font-medium text-stone-100 mb-4">MFA Settings</h3>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 border border-stone-700 rounded-lg">
                                <div>
                                    <p className="text-stone-200">Require MFA for Owners</p>
                                    <p className="text-stone-500 text-sm">Force all owner accounts to enable MFA</p>
                                </div>
                                <ToggleRight size={28} className="text-emerald-400" />
                            </label>
                            <label className="flex items-center justify-between p-4 border border-stone-700 rounded-lg">
                                <div>
                                    <p className="text-stone-200">Require MFA for Providers</p>
                                    <p className="text-stone-500 text-sm">Force all provider accounts to enable MFA</p>
                                </div>
                                <ToggleRight size={28} className="text-emerald-400" />
                            </label>
                        </div>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
                        <Save size={16} />
                        Save Security Settings
                    </button>
                </div>
            )}
        </div>
    );
}

