'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Gift, Plus, Search, DollarSign, Calendar, Check, X } from 'lucide-react'

type GiftCard = {
    id: string
    code: string
    initialAmount: number
    currentBalance: number
    recipientEmail: string | null
    isActive: boolean
    createdAt: string
}

export default function GiftCardsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [giftCards, setGiftCards] = useState<GiftCard[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [formData, setFormData] = useState({
        initialAmount: '',
        recipientEmail: ''
    })

    const franchiseId = 'your-franchise-id' // TODO: Get from session/context

    useEffect(() => {
        if (status === 'authenticated') {
            fetchGiftCards()
        }
    }, [status])

    async function fetchGiftCards() {
        try {
            const res = await fetch(`/api/gift-cards?franchiseId=${franchiseId}`)
            if (res.ok) {
                const data = await res.json()
                setGiftCards(data)
            }
        } catch (error) {
            console.error('Error fetching gift cards:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate() {
        try {
            const res = await fetch('/api/gift-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId,
                    ...formData
                })
            })

            if (res.ok) {
                fetchGiftCards()
                setShowModal(false)
                setFormData({ initialAmount: '', recipientEmail: '' })
            }
        } catch (error) {
            console.error('Error creating gift card:', error)
        }
    }

    const filteredCards = giftCards.filter(card =>
        card.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.recipientEmail?.toLowerCase().includes(searchQuery.toLowerCase())
    )

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
                    <h1 className="text-3xl font-bold text-white mb-2">Gift Cards</h1>
                    <p className="text-stone-400">Manage and track gift card sales</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all font-medium flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Create Gift Card
                </button>
            </div>

            {/* Search */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                    <input
                        type="text"
                        placeholder="Search by code or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-900/50 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            {/* Gift Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCards.map((card) => (
                    <div key={card.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-purple-500/30 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                                <Gift className="h-6 w-6 text-purple-400" />
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${card.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                {card.isActive ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-stone-500 mb-1">Code</p>
                                <p className="text-white font-mono text-sm">{card.code}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Initial</p>
                                    <p className="text-white font-bold">${card.initialAmount.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Balance</p>
                                    <p className="text-emerald-400 font-bold">${card.currentBalance.toFixed(2)}</p>
                                </div>
                            </div>
                            {card.recipientEmail && (
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Recipient</p>
                                    <p className="text-stone-400 text-sm truncate">{card.recipientEmail}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-stone-500 mb-1">Created</p>
                                <p className="text-stone-400 text-sm">{new Date(card.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredCards.length === 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <Gift className="h-16 w-16 text-stone-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Gift Cards Found</h3>
                    <p className="text-stone-400">Create your first gift card to get started</p>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Create Gift Card</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-stone-400 hover:text-white transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Amount*</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                                    <input
                                        type="number"
                                        value={formData.initialAmount}
                                        onChange={(e) => setFormData({ ...formData, initialAmount: e.target.value })}
                                        placeholder="50.00"
                                        className="w-full pl-10 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Recipient Email (Optional)</label>
                                <input
                                    type="email"
                                    value={formData.recipientEmail}
                                    onChange={(e) => setFormData({ ...formData, recipientEmail: e.target.value })}
                                    placeholder="recipient@example.com"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!formData.initialAmount}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
