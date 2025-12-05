'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Mail, Send, Plus, BarChart2, Users, LayoutTemplate } from 'lucide-react'

type Campaign = {
    id: string
    name: string
    type: string
    status: string
    sentCount: number
    openRate: number
    createdAt: string
}

export default function MarketingPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const franchiseId = 'your-franchise-id' // TODO: Get from session

    useEffect(() => {
        if (status === 'authenticated') {
            fetchCampaigns()
        }
    }, [status])

    async function fetchCampaigns() {
        try {
            const res = await fetch(`/api/marketing/campaigns?franchiseId=${franchiseId}`)
            if (res.ok) {
                const data = await res.json()
                setCampaigns(data)
            }
        } catch (error) {
            console.error('Error fetching campaigns:', error)
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Marketing</h1>
                    <p className="text-stone-400">Create and manage email campaigns</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all font-medium flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    New Campaign
                </button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <button className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors text-left group">
                    <div className="p-3 bg-purple-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                        <LayoutTemplate className="h-6 w-6 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Templates</h3>
                    <p className="text-sm text-stone-400">Browse pre-made designs</p>
                </button>
                <button className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors text-left group">
                    <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                        <Users className="h-6 w-6 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Segments</h3>
                    <p className="text-sm text-stone-400">Manage customer lists</p>
                </button>
                <button className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors text-left group">
                    <div className="p-3 bg-pink-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                        <BarChart2 className="h-6 w-6 text-pink-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Analytics</h3>
                    <p className="text-sm text-stone-400">View campaign performance</p>
                </button>
            </div>

            {/* Campaigns List */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white">Recent Campaigns</h2>
                </div>

                <div className="divide-y divide-white/5">
                    {campaigns.map((campaign) => (
                        <div key={campaign.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-stone-800 rounded-xl flex items-center justify-center">
                                    <Mail className="h-6 w-6 text-stone-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{campaign.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${campaign.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400' :
                                                campaign.status === 'ACTIVE' ? 'bg-purple-500/10 text-purple-400' :
                                                    'bg-stone-700 text-stone-400'
                                            }`}>
                                            {campaign.status}
                                        </span>
                                        <span className="text-xs text-stone-500">
                                            {new Date(campaign.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-center">
                                    <p className="text-xs text-stone-500 mb-1">Recipients</p>
                                    <p className="font-bold text-white">{campaign.sentCount.toLocaleString()}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-stone-500 mb-1">Open Rate</p>
                                    <p className="font-bold text-emerald-400">{campaign.openRate}%</p>
                                </div>
                                <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-sm font-medium transition-colors">
                                    View Report
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-2xl font-bold text-white mb-6">New Campaign</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Campaign Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Monthly Newsletter"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Type</label>
                                <select className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white">
                                    <option value="EMAIL">Email Blast</option>
                                    <option value="AUTOMATION">Automated Flow</option>
                                    <option value="SMS">SMS Campaign</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowModal(false)
                                        alert('Campaign created!')
                                    }}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg"
                                >
                                    Create Draft
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
