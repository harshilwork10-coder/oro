'use client';

import { useState } from 'react';
import { Wifi, WifiOff, Activity, RefreshCw } from 'lucide-react';

type MonitoringTab = 'device-health' | 'payments-health' | 'system-health';

export default function MonitoringPage() {
    const [activeTab, setActiveTab] = useState<MonitoringTab>('device-health');

    const tabs: { id: MonitoringTab; label: string }[] = [
        { id: 'device-health', label: 'Device Health' },
        { id: 'payments-health', label: 'Payments Health' },
        { id: 'system-health', label: 'System Health' },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Monitoring</h1>
                    <p className="text-sm text-stone-400 mt-1">System health and performance monitoring</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm">
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <div className="flex gap-1 mb-6 border-b border-stone-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'text-orange-400 border-b-2 border-orange-500' : 'text-stone-400 hover:text-stone-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'device-health' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-stone-400 text-sm">Total Devices</span>
                                <Wifi size={18} className="text-stone-500" />
                            </div>
                            <p className="text-2xl font-bold text-stone-100">0</p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-stone-400 text-sm">Online</span>
                                <Wifi size={18} className="text-stone-500" />
                            </div>
                            <p className="text-2xl font-bold text-stone-100">0</p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-stone-400 text-sm">Offline</span>
                                <WifiOff size={18} className="text-stone-500" />
                            </div>
                            <p className="text-2xl font-bold text-stone-100">0</p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-stone-400 text-sm">Uptime</span>
                                <Activity size={18} className="text-stone-500" />
                            </div>
                            <p className="text-2xl font-bold text-stone-100">—</p>
                        </div>
                    </div>

                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6 text-center">
                        <WifiOff size={48} className="mx-auto text-stone-600 mb-4" />
                        <h3 className="font-medium text-stone-100">No offline devices</h3>
                        <p className="text-stone-400 text-sm mt-2">Device status will be tracked once devices are added</p>
                    </div>
                </div>
            )}

            {activeTab === 'payments-health' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <span className="text-stone-400 text-sm">Today's Transactions</span>
                            <p className="text-2xl font-bold text-stone-100 mt-1">0</p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <span className="text-stone-400 text-sm">Approval Rate</span>
                            <p className="text-2xl font-bold text-stone-100 mt-1">—</p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <span className="text-stone-400 text-sm">Decline Rate</span>
                            <p className="text-2xl font-bold text-stone-100 mt-1">—</p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <span className="text-stone-400 text-sm">Total Volume</span>
                            <p className="text-2xl font-bold text-stone-100 mt-1">$0</p>
                        </div>
                    </div>

                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-6 text-center">
                        <Activity size={48} className="mx-auto text-stone-600 mb-4" />
                        <h3 className="font-medium text-stone-100">No payment data</h3>
                        <p className="text-stone-400 text-sm mt-2">Payment metrics will appear once transactions are processed</p>
                    </div>
                </div>
            )}

            {activeTab === 'system-health' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-stone-900/50 rounded-xl border border-emerald-500/30 p-4">
                            <span className="text-stone-400 text-sm">API Status</span>
                            <p className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                Operational
                            </p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <span className="text-stone-400 text-sm">Avg Response Time</span>
                            <p className="text-xl font-bold text-stone-100 mt-1">—</p>
                        </div>
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                            <span className="text-stone-400 text-sm">Error Rate</span>
                            <p className="text-xl font-bold text-stone-100 mt-1">0%</p>
                        </div>
                    </div>

                    <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                        <h3 className="font-medium text-stone-100 mb-4">Service Status</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {['POS API', 'Payment Gateway', 'Inventory Sync', 'SMS Service', 'Email Service', 'Reporting'].map((service) => (
                                <div key={service} className="flex items-center justify-between p-3 border border-stone-700 rounded-lg">
                                    <span className="text-stone-200">{service}</span>
                                    <span className="flex items-center gap-2 text-emerald-400 text-sm">
                                        <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                                        Healthy
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

