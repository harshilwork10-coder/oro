'use client'

import { useState } from 'react'
import {
    Gift,
    Plus,
    Search,
    CreditCard,
    DollarSign,
    Mail,
    CheckCircle,
    Copy
} from 'lucide-react'

export default function GiftCardsPage() {
    const [activeTab, setActiveTab] = useState<'manage' | 'issue'>('manage')

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <Gift className="h-8 w-8 text-purple-500" />
                        Gift Cards
                    </h1>
                    <p className="text-stone-400 mt-2">Issue and track digital gift cards</p>
                </div>
                <div className="flex bg-stone-900 p-1 rounded-lg border border-stone-800">
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'manage' ? 'bg-stone-800 text-stone-100 shadow-sm' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                        Manage Cards
                    </button>
                    <button
                        onClick={() => setActiveTab('issue')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'issue' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                        Issue New Card
                    </button>
                </div>
            </div>

            {activeTab === 'manage' ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass-panel p-4 rounded-xl border-l-4 border-purple-500">
                            <p className="text-sm text-stone-500 mb-1">Active Liability</p>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-bold text-stone-100">$4,250.00</span>
                                <span className="text-xs font-medium text-stone-400">Outstanding Balance</span>
                            </div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                            <p className="text-sm text-stone-500 mb-1">Redeemed (This Month)</p>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-bold text-stone-100">$850.00</span>
                                <span className="text-xs font-medium text-emerald-400">+12% vs Last Month</span>
                            </div>
                        </div>
                        <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                            <p className="text-sm text-stone-500 mb-1">Cards Issued</p>
                            <div className="flex items-end justify-between">
                                <span className="text-2xl font-bold text-stone-100">142</span>
                                <span className="text-xs font-medium text-blue-400">Total Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Cards Table */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-stone-800 flex items-center gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="text"
                                    placeholder="Search by code or email..."
                                    className="w-full bg-stone-900/50 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-stone-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-stone-400">
                                <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Card Code</th>
                                        <th className="px-6 py-3">Recipient</th>
                                        <th className="px-6 py-3 text-right">Initial Amount</th>
                                        <th className="px-6 py-3 text-right">Current Balance</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Issued</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-800">
                                    {[1, 2, 3].map((i) => (
                                        <tr key={i} className="hover:bg-stone-800/30 transition-colors">
                                            <td className="px-6 py-4 font-mono text-stone-300 flex items-center gap-2">
                                                XXXX-XXXX-482{i}
                                                <button className="text-stone-600 hover:text-stone-400"><Copy className="h-3 w-3" /></button>
                                            </td>
                                            <td className="px-6 py-4">jane.doe{i}@example.com</td>
                                            <td className="px-6 py-4 text-right">$100.00</td>
                                            <td className="px-6 py-4 text-right font-bold text-stone-100">$45.50</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    Active
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">Oct 2{i}, 2023</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* Issue New Card Form */
                <div className="max-w-2xl mx-auto glass-panel p-8 rounded-xl border border-stone-800">
                    <h2 className="text-xl font-bold text-stone-100 mb-6 flex items-center gap-2">
                        <Gift className="h-5 w-5 text-purple-500" />
                        Issue Digital Gift Card
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-stone-400 mb-2">Amount</label>
                            <div className="grid grid-cols-4 gap-4">
                                {['25', '50', '100', '200'].map((amt) => (
                                    <button key={amt} className="py-3 rounded-lg border border-stone-700 hover:border-purple-500 hover:bg-purple-500/10 transition-all text-stone-200 font-bold">
                                        ${amt}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="number"
                                    placeholder="Custom Amount"
                                    className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-10 pr-4 py-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-400 mb-2">Recipient Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="email"
                                    placeholder="customer@example.com"
                                    className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-10 pr-4 py-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-stone-400 mb-2">Personal Message (Optional)</label>
                            <textarea
                                rows={3}
                                placeholder="Enjoy your treatment!"
                                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                        </div>

                        <button className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Issue & Send Card
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
