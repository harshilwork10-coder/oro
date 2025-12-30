'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Gift, RefreshCw, Search, Plus, CreditCard,
    DollarSign, CheckCircle, XCircle, Copy
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface GiftCard {
    id: string
    code: string
    initialAmount: number
    currentBalance: number
    isActive: boolean
    createdAt: string
}

interface Stats {
    totalCards: number
    activeCards: number
    totalIssued: number
    totalOutstanding: number
    totalRedeemed: number
}

export default function GiftCardsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<Stats | null>(null)
    const [recentCards, setRecentCards] = useState<GiftCard[]>([])
    const [searchCode, setSearchCode] = useState('')
    const [searchResult, setSearchResult] = useState<any>(null)
    const [searching, setSearching] = useState(false)
    const [showIssue, setShowIssue] = useState(false)
    const [issueAmount, setIssueAmount] = useState('')
    const [issueEmail, setIssueEmail] = useState('')
    const [newCard, setNewCard] = useState<any>(null)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/owner/gift-cards?type=stats')
            const data = await res.json()

            setStats(data.stats)
            setRecentCards(data.recentCards || [])
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const searchCard = async () => {
        if (!searchCode || searchCode.length < 4) return
        setSearching(true)
        setSearchResult(null)
        try {
            const res = await fetch(`/api/owner/gift-cards?type=search&code=${encodeURIComponent(searchCode)}`)
            const data = await res.json()
            setSearchResult(data)
        } catch (error) {
            console.error('Search failed:', error)
        } finally {
            setSearching(false)
        }
    }

    const issueCard = async () => {
        const amount = parseFloat(issueAmount)
        if (!amount || amount <= 0) return
        setSaving(true)
        setNewCard(null)
        try {
            const res = await fetch('/api/owner/gift-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'issue',
                    amount,
                    recipientEmail: issueEmail || null
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setNewCard(data.giftCard)
                setMessage('✓ Gift card issued!')
                fetchData()
            }
        } catch (error) {
            setMessage('Failed to issue card')
        } finally {
            setSaving(false)
        }
    }

    const toggleCardStatus = async (cardId: string, isActive: boolean) => {
        try {
            const res = await fetch('/api/owner/gift-cards', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId, isActive })
            })
            if (res.ok) {
                fetchData()
                if (searchResult?.giftCard?.id === cardId) {
                    setSearchResult({ ...searchResult, giftCard: { ...searchResult.giftCard, isActive } })
                }
            }
        } catch (error) {
            console.error('Toggle failed')
        }
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        setMessage('✓ Code copied!')
        setTimeout(() => setMessage(''), 2000)
    }

    const formatCode = (code: string) => {
        return code.match(/.{1,4}/g)?.join('-') || code
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Gift className="h-8 w-8 text-pink-500" />
                            Gift Card Network
                        </h1>
                        <p className="text-stone-400">Issue and track gift cards across all stores</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} disabled={loading} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl">
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => { setShowIssue(true); setNewCard(null); setIssueAmount(''); setIssueEmail('') }}
                        className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-xl"
                    >
                        <Plus className="h-4 w-4" />
                        Issue Card
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-xl ${message.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-pink-600/30 to-pink-900/30 border border-pink-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-5 w-5 text-pink-400" />
                        <span className="text-sm text-stone-400">Active Cards</span>
                    </div>
                    <p className="text-3xl font-bold">{stats?.activeCards || 0}</p>
                    <p className="text-sm text-stone-500">{stats?.totalCards || 0} total issued</p>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm text-stone-400">Outstanding</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-400">{formatCurrency(stats?.totalOutstanding || 0)}</p>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Gift className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-stone-400">Total Issued</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(stats?.totalIssued || 0)}</p>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-purple-400" />
                        <span className="text-sm text-stone-400">Redeemed</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(stats?.totalRedeemed || 0)}</p>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                        <input
                            type="text"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                            placeholder="Enter gift card code..."
                            className="w-full pl-12 pr-4 py-4 bg-stone-900 border border-stone-700 rounded-2xl text-lg font-mono"
                        />
                    </div>
                    <button
                        onClick={searchCard}
                        disabled={searching}
                        className="px-6 py-4 bg-pink-600 hover:bg-pink-500 rounded-2xl"
                    >
                        {searching ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Search Result */}
            {searchResult && (
                <div className="mb-6 bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    {searchResult.found ? (
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-2xl font-mono font-bold">{formatCode(searchResult.giftCard.code)}</p>
                                    <p className="text-stone-500">From: {searchResult.giftCard.franchise?.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {searchResult.giftCard.isActive ? (
                                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">Active</span>
                                    ) : (
                                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">Deactivated</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="bg-stone-800 p-4 rounded-xl">
                                    <p className="text-sm text-stone-400">Balance</p>
                                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(searchResult.giftCard.currentBalance)}</p>
                                </div>
                                <div className="bg-stone-800 p-4 rounded-xl">
                                    <p className="text-sm text-stone-400">Original</p>
                                    <p className="text-2xl font-bold">{formatCurrency(searchResult.giftCard.initialAmount)}</p>
                                </div>
                                <div className="bg-stone-800 p-4 rounded-xl">
                                    <p className="text-sm text-stone-400">Used</p>
                                    <p className="text-2xl font-bold text-pink-400">
                                        {formatCurrency(searchResult.giftCard.initialAmount - searchResult.giftCard.currentBalance)}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => toggleCardStatus(searchResult.giftCard.id, !searchResult.giftCard.isActive)}
                                className={`w-full py-3 rounded-xl ${searchResult.giftCard.isActive
                                        ? 'bg-red-600 hover:bg-red-500'
                                        : 'bg-emerald-600 hover:bg-emerald-500'
                                    }`}
                            >
                                {searchResult.giftCard.isActive ? 'Deactivate Card' : 'Reactivate Card'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <XCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
                            <p className="text-xl">Card Not Found</p>
                            <p className="text-stone-500">Check the code and try again</p>
                        </div>
                    )}
                </div>
            )}

            {/* Recent Cards */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-pink-400" />
                    Recent Gift Cards
                </h3>

                {recentCards.length === 0 ? (
                    <div className="text-center py-8 text-stone-500">
                        <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No gift cards issued yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentCards.map(card => (
                            <div key={card.id} className="flex items-center justify-between p-3 bg-stone-800 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => copyCode(card.code)}
                                        className="p-2 hover:bg-stone-700 rounded"
                                    >
                                        <Copy className="h-4 w-4 text-stone-400" />
                                    </button>
                                    <div>
                                        <p className="font-mono text-sm">{formatCode(card.code)}</p>
                                        <p className="text-xs text-stone-500">
                                            {new Date(card.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-400">{formatCurrency(card.currentBalance)}</p>
                                    <p className="text-xs text-stone-500">of {formatCurrency(card.initialAmount)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Issue Modal */}
            {showIssue && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-md">
                        <div className="p-5 border-b border-stone-700">
                            <h2 className="text-xl font-bold">Issue Gift Card</h2>
                        </div>

                        {newCard ? (
                            <div className="p-5">
                                <div className="text-center mb-6">
                                    <Gift className="h-16 w-16 mx-auto text-pink-400 mb-4" />
                                    <p className="text-stone-400">Gift Card Created!</p>
                                </div>

                                <div className="bg-gradient-to-br from-pink-600 to-purple-600 rounded-2xl p-6 text-center mb-4">
                                    <p className="text-3xl font-mono font-bold mb-2">{formatCode(newCard.code)}</p>
                                    <p className="text-2xl font-bold">{formatCurrency(newCard.amount)}</p>
                                </div>

                                <button
                                    onClick={() => copyCode(newCard.code)}
                                    className="w-full py-3 bg-stone-700 rounded-xl flex items-center justify-center gap-2 mb-4"
                                >
                                    <Copy className="h-4 w-4" />
                                    Copy Code
                                </button>

                                <button
                                    onClick={() => setShowIssue(false)}
                                    className="w-full py-3 bg-pink-600 rounded-xl"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <label className="text-sm text-stone-400">Amount *</label>
                                        <div className="relative mt-1">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={issueAmount}
                                                onChange={(e) => setIssueAmount(e.target.value)}
                                                placeholder="25.00"
                                                className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-xl"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm text-stone-400">Recipient Email (optional)</label>
                                        <input
                                            type="email"
                                            value={issueEmail}
                                            onChange={(e) => setIssueEmail(e.target.value)}
                                            placeholder="customer@email.com"
                                            className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        {[25, 50, 100].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => setIssueAmount(val.toString())}
                                                className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                                            >
                                                ${val}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-5 border-t border-stone-700 flex gap-2">
                                    <button onClick={() => setShowIssue(false)} className="flex-1 py-3 bg-stone-700 rounded-xl">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={issueCard}
                                        disabled={saving || !issueAmount}
                                        className="flex-1 py-3 bg-pink-600 rounded-xl disabled:opacity-50"
                                    >
                                        {saving ? 'Issuing...' : 'Issue Card'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

