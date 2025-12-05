'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Crown, Check, Plus, Users, CreditCard } from 'lucide-react'

type Plan = {
    id: string
    name: string
    price: number
    billingInterval: string
    description: string | null
    isActive: boolean
}

export default function MembershipsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        billingInterval: 'MONTHLY'
    })

    const franchiseId = 'your-franchise-id' // TODO: Get from session

    useEffect(() => {
        if (status === 'authenticated') {
            fetchPlans()
        }
    }, [status])

    async function fetchPlans() {
        try {
            const res = await fetch(`/api/memberships?franchiseId=${franchiseId}`)
            if (res.ok) {
                const data = await res.json()
                setPlans(data)
            }
        } catch (error) {
            console.error('Error fetching plans:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate() {
        try {
            const res = await fetch('/api/memberships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId,
                    ...formData
                })
            })

            if (res.ok) {
                fetchPlans()
                setShowModal(false)
                setFormData({ name: '', price: '', description: '', billingInterval: 'MONTHLY' })
            }
        } catch (error) {
            console.error('Error creating plan:', error)
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
                    <h1 className="text-3xl font-bold text-white mb-2">Memberships</h1>
                    <p className="text-stone-400">Manage subscription plans and benefits</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all font-medium flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    New Plan
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Users className="h-6 w-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Active Members</p>
                            <p className="text-2xl font-bold text-white">0</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                            <CreditCard className="h-6 w-6 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Monthly Revenue</p>
                            <p className="text-2xl font-bold text-white">$0.00</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-pink-500/20 rounded-xl">
                            <Crown className="h-6 w-6 text-pink-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Retention Rate</p>
                            <p className="text-2xl font-bold text-white">100%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div key={plan.id} className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-purple-500/30 transition-all relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Crown className="h-24 w-24 text-purple-500" />
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-3xl font-bold text-white">${plan.price}</span>
                            <span className="text-stone-400">/{plan.billingInterval.toLowerCase()}</span>
                        </div>

                        <div className="space-y-3 mb-8">
                            {plan.description?.split('\n').map((feature, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="p-1 bg-emerald-500/20 rounded-full mt-0.5">
                                        <Check className="h-3 w-3 text-emerald-400" />
                                    </div>
                                    <span className="text-stone-300 text-sm">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl transition-colors font-medium">
                            Edit Plan
                        </button>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-2xl font-bold text-white mb-6">New Membership Plan</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Plan Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. VIP Gold"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Price ($)</label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="99.00"
                                        className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Billing</label>
                                    <select
                                        value={formData.billingInterval}
                                        onChange={(e) => setFormData({ ...formData, billingInterval: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white"
                                    >
                                        <option value="MONTHLY">Monthly</option>
                                        <option value="YEARLY">Yearly</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Description / Benefits</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="List benefits (one per line)"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white h-32 resize-none"
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
                                    Create Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
