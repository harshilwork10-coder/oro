'use client';

import { useState } from 'react';
import { Download, DollarSign, TrendingUp, FileText } from 'lucide-react';

type BillingTab = 'plans' | 'invoices' | 'past-due' | 'usage';

export default function BillingPage() {
    const [activeTab, setActiveTab] = useState<BillingTab>('invoices');

    const tabs: { id: BillingTab; label: string }[] = [
        { id: 'plans', label: 'Plans' },
        { id: 'invoices', label: 'Invoices' },
        { id: 'past-due', label: 'Past Due' },
        { id: 'usage', label: 'Usage' },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Billing</h1>
                    <p className="text-sm text-stone-400 mt-1">Client billing and subscription management</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-2 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded-lg text-sm">
                    <Download size={16} />
                    Export
                </button>
            </div>

            {/* KPIs - show zeros since no data */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                    <span className="text-stone-400 text-sm">Monthly Recurring</span>
                    <p className="text-2xl font-bold text-stone-100 mt-1">$0</p>
                    <span className="text-stone-500 text-xs">No clients yet</span>
                </div>
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                    <span className="text-stone-400 text-sm">Active Subscriptions</span>
                    <p className="text-2xl font-bold text-stone-100 mt-1">0</p>
                </div>
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                    <span className="text-stone-400 text-sm">Past Due</span>
                    <p className="text-2xl font-bold text-stone-100 mt-1">$0</p>
                    <span className="text-stone-500 text-xs">0 accounts</span>
                </div>
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-4">
                    <span className="text-stone-400 text-sm">Collected This Month</span>
                    <p className="text-2xl font-bold text-stone-100 mt-1">$0</p>
                </div>
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

            {activeTab === 'invoices' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                    <FileText size={48} className="mx-auto text-stone-600 mb-4" />
                    <h2 className="text-lg font-semibold text-stone-100">No invoices</h2>
                    <p className="text-stone-400 mt-2">Invoices will appear here once you have active clients</p>
                </div>
            )}

            {activeTab === 'plans' && (
                <div className="grid grid-cols-3 gap-6">
                    {[
                        { name: 'Starter', price: '$99', features: ['1 Location', '2 Terminals', 'Basic Support'], clients: 0 },
                        { name: 'Professional', price: '$199', features: ['3 Locations', '6 Terminals', 'Priority Support'], clients: 0 },
                        { name: 'Enterprise', price: '$399', features: ['Unlimited', 'Unlimited', '24/7 Support'], clients: 0 },
                    ].map((plan) => (
                        <div key={plan.name} className="bg-stone-900/50 rounded-xl border border-stone-800 p-6">
                            <h3 className="text-lg font-semibold text-stone-100">{plan.name}</h3>
                            <p className="text-2xl font-bold text-orange-400 mt-2">{plan.price}<span className="text-sm text-stone-400">/mo</span></p>
                            <ul className="mt-4 space-y-2">
                                {plan.features.map((f) => (
                                    <li key={f} className="text-stone-400 text-sm">• {f}</li>
                                ))}
                            </ul>
                            <p className="mt-4 pt-4 border-t border-stone-700 text-stone-500 text-sm">{plan.clients} clients on this plan</p>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'past-due' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-12 text-center">
                    <DollarSign size={48} className="mx-auto text-stone-600 mb-4" />
                    <h2 className="text-lg font-semibold text-stone-100">No past due accounts</h2>
                    <p className="text-stone-400 mt-2">All accounts are current</p>
                </div>
            )}

            {activeTab === 'usage' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-8 text-center">
                    <TrendingUp size={48} className="mx-auto text-stone-600 mb-4" />
                    <h3 className="text-lg font-semibold text-stone-100">Usage Analytics</h3>
                    <p className="text-stone-400 mt-2">Detailed usage metrics and analytics coming soon</p>
                </div>
            )}
        </div>
    );
}

