'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Mail, Plus, BarChart2, Users, LayoutTemplate, Megaphone, MessageSquare, Send } from 'lucide-react'
import RoleGuard from '@/components/auth/RoleGuard'
import { Role } from '@/lib/permissions'

type Campaign = {
    id: string
    name: string
    type: string
    status: string
    sentCount: number
    openRate: number
    createdAt: string
}

// Only FRANCHISOR and FRANCHISEE can access marketing
const ALLOWED_ROLES = [Role.FRANCHISOR, Role.FRANCHISEE]

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

    const franchiseId = session?.user?.franchiseId || ''

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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <RoleGuard allowedRoles={ALLOWED_ROLES}>
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Marketing</h1>
                        <p className="text-stone-400">Create and manage marketing campaigns</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl shadow-lg hover:shadow-orange-900/40 transition-all font-medium flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        New Campaign
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <button className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors text-left group">
                        <div className="p-3 bg-emerald-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                            <MessageSquare className="h-6 w-6 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">SMS Blast</h3>
                        <p className="text-sm text-stone-400">Send text to customers</p>
                    </button>
                    <button className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors text-left group">
                        <div className="p-3 bg-blue-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                            <Mail className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Email Blast</h3>
                        <p className="text-sm text-stone-400">Send email campaigns</p>
                    </button>
                    <button className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors text-left group">
                        <div className="p-3 bg-orange-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                            <Users className="h-6 w-6 text-orange-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Segments</h3>
                        <p className="text-sm text-stone-400">Manage customer lists</p>
                    </button>
                    <button className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors text-left group">
                        <div className="p-3 bg-pink-500/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                            <BarChart2 className="h-6 w-6 text-pink-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">Analytics</h3>
                        <p className="text-sm text-stone-400">View performance</p>
                    </button>
                </div>

                {/* Campaigns List */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                        <h2 className="text-xl font-bold text-white">Recent Campaigns</h2>
                    </div>

                    <div className="divide-y divide-white/5">
                        {campaigns.length === 0 ? (
                            <div className="p-12 text-center text-stone-500">
                                <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No campaigns yet</p>
                                <p className="text-sm mt-1">Create your first campaign to get started</p>
                            </div>
                        ) : (
                            campaigns.map((campaign) => (
                                <div key={campaign.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-stone-800 rounded-xl flex items-center justify-center">
                                            {campaign.type === 'SMS' ? (
                                                <MessageSquare className="h-6 w-6 text-emerald-400" />
                                            ) : (
                                                <Mail className="h-6 w-6 text-blue-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white">{campaign.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${campaign.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    campaign.status === 'ACTIVE' ? 'bg-orange-500/10 text-orange-400' :
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
                            ))
                        )}
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
                                        <option value="SMS">SMS Campaign</option>
                                        <option value="EMAIL">Email Campaign</option>
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
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg"
                                    >
                                        Create Draft
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    )
}
