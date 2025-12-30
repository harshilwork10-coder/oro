'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { DollarSign, Plus, Users, TrendingUp, Settings } from 'lucide-react'

type CommissionRule = {
    id: string
    name: string
    serviceCommission: number
    productCommission: number
    type: string
}

export default function CommissionsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [rules, setRules] = useState<CommissionRule[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        serviceCommission: '',
        productCommission: ''
    })

    const franchiseId = 'your-franchise-id' // TODO: Get from session

    useEffect(() => {
        if (status === 'authenticated') {
            fetchRules()
        }
    }, [status])

    async function fetchRules() {
        try {
            const res = await fetch(`/api/commissions?franchiseId=${franchiseId}`)
            if (res.ok) {
                const data = await res.json()
                setRules(data)
            }
        } catch (error) {
            console.error('Error fetching rules:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate() {
        try {
            const res = await fetch('/api/commissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId,
                    ...formData
                })
            })

            if (res.ok) {
                fetchRules()
                setShowModal(false)
                setFormData({ name: '', serviceCommission: '', productCommission: '' })
            }
        } catch (error) {
            console.error('Error creating rule:', error)
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
                    <h1 className="text-3xl font-bold text-white mb-2">Commissions</h1>
                    <p className="text-stone-400">Manage employee commission structures</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all font-medium flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    New Rule
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <DollarSign className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Total Payouts (Month)</p>
                            <p className="text-2xl font-bold text-white">$0.00</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Users className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Active Staff</p>
                            <p className="text-2xl font-bold text-white">0</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-500/20 rounded-xl">
                            <TrendingUp className="h-6 w-6 text-pink-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Avg Commission Rate</p>
                            <p className="text-2xl font-bold text-white">0%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rules.map((rule) => (
                    <div key={rule.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
                        <div className="flex items-start justify-between mb-6">
                            <div className="p-2 bg-stone-800 rounded-lg">
                                <Settings className="h-5 w-5 text-stone-400" />
                            </div>
                            <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">
                                {rule.type}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-4">{rule.name}</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-stone-900/50 rounded-lg">
                                <span className="text-stone-400 text-sm">Services</span>
                                <span className="text-emerald-400 font-bold">{rule.serviceCommission}%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-stone-900/50 rounded-lg">
                                <span className="text-stone-400 text-sm">Products</span>
                                <span className="text-emerald-400 font-bold">{rule.productCommission}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-2xl font-bold text-white mb-6">New Commission Rule</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Rule Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Senior Stylist"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Service Commission (%)</label>
                                <input
                                    type="number"
                                    value={formData.serviceCommission}
                                    onChange={(e) => setFormData({ ...formData, serviceCommission: e.target.value })}
                                    placeholder="40"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Product Commission (%)</label>
                                <input
                                    type="number"
                                    value={formData.productCommission}
                                    onChange={(e) => setFormData({ ...formData, productCommission: e.target.value })}
                                    placeholder="10"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg"
                                >
                                    Create Rule
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

