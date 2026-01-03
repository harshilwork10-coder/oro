'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Wallet, RefreshCw, Plus, X,
    DollarSign, AlertTriangle, CheckCircle, Clock,
    Store, TrendingUp, TrendingDown, Banknote, PiggyBank
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ActiveDrawer {
    id: string
    locationId: string
    locationName: string
    openedBy: string
    openedAt: string
    startingCash: number
    expectedCash: number
}

interface CashCount {
    id: string
    locationId: string
    locationName: string
    type: string
    employeeName: string
    expectedCash: number
    countedCash: number
    variance: number
    createdAt: string
    approved: boolean
}

interface SafeDrop {
    id: string
    locationId: string
    locationName: string
    amount: number
    employeeName: string
    witnessedBy?: string
    createdAt: string
}

interface Deposit {
    id: string
    locationId: string
    locationName: string
    expectedAmount: number
    depositedAmount: number
    variance: number
    status: string
    bankDate: string
    slipNumber?: string
    reconciled: boolean
}

export default function CashManagementPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [activeDrawers, setActiveDrawers] = useState<ActiveDrawer[]>([])
    const [counts, setCounts] = useState<CashCount[]>([])
    const [drops, setDrops] = useState<SafeDrop[]>([])
    const [deposits, setDeposits] = useState<Deposit[]>([])
    const [varianceSummary, setVarianceSummary] = useState({ totalOver: 0, totalShort: 0, totalCounts: 0 })
    const [showLogModal, setShowLogModal] = useState<string | null>(null) // 'count', 'drop', 'deposit'
    const [selectedLocation, setSelectedLocation] = useState('')
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])

    // Form states
    const [formAmount, setFormAmount] = useState('')
    const [formExpected, setFormExpected] = useState('')
    const [formNote, setFormNote] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/owner/cash-management')
            const data = await res.json()

            setActiveDrawers(data.activeDrawers || [])
            setCounts(data.counts || [])
            setDrops(data.drops || [])
            setDeposits(data.deposits || [])
            setVarianceSummary(data.varianceSummary || { totalOver: 0, totalShort: 0, totalCounts: 0 })

            // Get unique locations
            const locs = new Map<string, { id: string, name: string }>()
            data.activeDrawers?.forEach((d: ActiveDrawer) => locs.set(d.locationId, { id: d.locationId, name: d.locationName }))
            data.counts?.forEach((c: CashCount) => locs.set(c.locationId, { id: c.locationId, name: c.locationName }))
            setLocations(Array.from(locs.values()))
            if (!selectedLocation && locs.size > 0) {
                setSelectedLocation(Array.from(locs.values())[0].id)
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 60000)
        return () => clearInterval(interval)
    }, [])

    const handleSubmit = async () => {
        if (!selectedLocation || !formAmount) return

        setSaving(true)
        try {
            const res = await fetch('/api/owner/cash-management', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: showLogModal === 'count' ? 'COUNT' : showLogModal === 'drop' ? 'DROP' : 'DEPOSIT',
                    locationId: selectedLocation,
                    countedCash: showLogModal === 'count' ? parseFloat(formAmount) : undefined,
                    expectedCash: showLogModal === 'count' ? parseFloat(formExpected) : undefined,
                    amount: showLogModal === 'drop' ? parseFloat(formAmount) : undefined,
                    depositedAmount: showLogModal === 'deposit' ? parseFloat(formAmount) : undefined,
                    expectedAmount: showLogModal === 'deposit' ? parseFloat(formExpected) : undefined,
                    note: formNote
                })
            })

            if (res.ok) {
                setShowLogModal(null)
                setFormAmount('')
                setFormExpected('')
                setFormNote('')
                fetchData()
            }
        } catch (error) {
            console.error('Submit failed:', error)
        } finally {
            setSaving(false)
        }
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
                            <Wallet className="h-8 w-8 text-green-500" />
                            Cash Management
                        </h1>
                        <p className="text-stone-400">Track drawer counts, drops, and deposits</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-green-600/30 to-green-900/30 border border-green-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-5 w-5 text-green-400" />
                        <span className="text-sm text-stone-400">Active Drawers</span>
                    </div>
                    <p className="text-3xl font-bold">{activeDrawers.length}</p>
                    <p className="text-sm text-green-400 mt-1">
                        {formatCurrency(activeDrawers.reduce((sum, d) => sum + d.expectedCash, 0))} expected
                    </p>
                </div>

                <div className="bg-gradient-to-br from-blue-600/30 to-blue-900/30 border border-blue-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <PiggyBank className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-stone-400">Safe Drops Today</span>
                    </div>
                    <p className="text-3xl font-bold">{drops.length}</p>
                    <p className="text-sm text-blue-400 mt-1">
                        {formatCurrency(drops.reduce((sum, d) => sum + d.amount, 0))}
                    </p>
                </div>

                <div className={`rounded-2xl p-4 border ${varianceSummary.totalShort > 0
                        ? 'bg-red-500/20 border-red-500/30'
                        : 'bg-stone-900/80 border-stone-700'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-5 w-5 text-red-400" />
                        <span className="text-sm text-stone-400">Short</span>
                    </div>
                    <p className={`text-3xl font-bold ${varianceSummary.totalShort > 0 ? 'text-red-400' : ''}`}>
                        {formatCurrency(varianceSummary.totalShort)}
                    </p>
                </div>

                <div className={`rounded-2xl p-4 border ${varianceSummary.totalOver > 0
                        ? 'bg-amber-500/20 border-amber-500/30'
                        : 'bg-stone-900/80 border-stone-700'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-amber-400" />
                        <span className="text-sm text-stone-400">Over</span>
                    </div>
                    <p className={`text-3xl font-bold ${varianceSummary.totalOver > 0 ? 'text-amber-400' : ''}`}>
                        {formatCurrency(varianceSummary.totalOver)}
                    </p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setShowLogModal('count')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                >
                    <DollarSign className="h-4 w-4" />
                    Log Count
                </button>
                <button
                    onClick={() => setShowLogModal('drop')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                >
                    <PiggyBank className="h-4 w-4" />
                    Log Drop
                </button>
                <button
                    onClick={() => setShowLogModal('deposit')}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                >
                    <Banknote className="h-4 w-4" />
                    Log Deposit
                </button>
            </div>

            {/* Active Drawers */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5 mb-6">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-green-400" />
                    Active Cash Drawers
                </h3>
                {activeDrawers.length === 0 ? (
                    <p className="text-stone-500 text-center py-4">No open drawers</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeDrawers.map(drawer => (
                            <div key={drawer.id} className="bg-stone-800/50 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium">{drawer.locationName}</span>
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                </div>
                                <p className="text-2xl font-bold text-green-400">
                                    {formatCurrency(drawer.expectedCash)}
                                </p>
                                <p className="text-sm text-stone-500 mt-1">
                                    Opened by {drawer.openedBy}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cash Counts */}
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold flex items-center gap-2 mb-4">
                        <DollarSign className="h-5 w-5 text-blue-400" />
                        Recent Counts
                    </h3>
                    {counts.length === 0 ? (
                        <p className="text-stone-500 text-center py-4">No counts today</p>
                    ) : (
                        <div className="space-y-3">
                            {counts.slice(0, 5).map(count => (
                                <div key={count.id} className={`bg-stone-800/50 rounded-xl p-4 border ${count.variance !== 0
                                        ? count.variance > 0 ? 'border-amber-500/30' : 'border-red-500/30'
                                        : 'border-stone-700'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{count.locationName}</p>
                                            <p className="text-sm text-stone-500">{count.employeeName} • {count.type}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatCurrency(count.countedCash)}</p>
                                            {count.variance !== 0 && (
                                                <p className={`text-sm ${count.variance > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {count.variance > 0 ? '+' : ''}{formatCurrency(count.variance)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Deposits */}
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold flex items-center gap-2 mb-4">
                        <Banknote className="h-5 w-5 text-purple-400" />
                        Recent Deposits
                    </h3>
                    {deposits.length === 0 ? (
                        <p className="text-stone-500 text-center py-4">No deposits logged</p>
                    ) : (
                        <div className="space-y-3">
                            {deposits.slice(0, 5).map(deposit => (
                                <div key={deposit.id} className="bg-stone-800/50 rounded-xl p-4 border border-stone-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{deposit.locationName}</p>
                                            <p className="text-sm text-stone-500">
                                                {new Date(deposit.bankDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatCurrency(deposit.depositedAmount)}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded ${deposit.status === 'RECONCILED'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                {deposit.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Log Modal */}
            {showLogModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-stone-700">
                            <h2 className="text-xl font-bold capitalize">Log {showLogModal}</h2>
                            <button onClick={() => setShowLogModal(null)} className="p-2 hover:bg-stone-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm text-stone-400">Location</label>
                                <select
                                    value={selectedLocation}
                                    onChange={(e) => setSelectedLocation(e.target.value)}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                >
                                    <option value="">Select location...</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            {showLogModal === 'count' && (
                                <div>
                                    <label className="text-sm text-stone-400">Expected Cash</label>
                                    <input
                                        type="number"
                                        value={formExpected}
                                        onChange={(e) => setFormExpected(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-sm text-stone-400">
                                    {showLogModal === 'count' ? 'Counted Amount' :
                                        showLogModal === 'drop' ? 'Drop Amount' : 'Deposit Amount'}
                                </label>
                                <input
                                    type="number"
                                    value={formAmount}
                                    onChange={(e) => setFormAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-xl"
                                />
                            </div>

                            {showLogModal === 'deposit' && (
                                <div>
                                    <label className="text-sm text-stone-400">Expected Amount</label>
                                    <input
                                        type="number"
                                        value={formExpected}
                                        onChange={(e) => setFormExpected(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-sm text-stone-400">Note (optional)</label>
                                <input
                                    type="text"
                                    value={formNote}
                                    onChange={(e) => setFormNote(e.target.value)}
                                    placeholder="Add a note..."
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>
                        </div>
                        <div className="p-5 border-t border-stone-700 flex gap-2">
                            <button
                                onClick={() => setShowLogModal(null)}
                                className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={saving || !selectedLocation || !formAmount}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

