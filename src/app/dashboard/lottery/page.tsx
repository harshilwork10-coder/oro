'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
    Ticket,
    Plus,
    Search,
    Package,
    DollarSign,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    X,
    Gift,
    Banknote,
    ArrowLeft,
    Lock,
    Scan
} from "lucide-react"
import Link from 'next/link'

interface LotteryGame {
    id: string
    gameName: string
    gameNumber: string
    ticketPrice: string
    isActive: boolean
    _count?: { packs: number }
}

interface LotteryPack {
    id: string
    packNumber: string
    ticketCount: number
    soldCount: number
    status: string
    game: LotteryGame
}

export default function LotteryPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [games, setGames] = useState<LotteryGame[]>([])
    const [packs, setPacks] = useState<LotteryPack[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddGameModal, setShowAddGameModal] = useState(false)
    const [showAddPackModal, setShowAddPackModal] = useState(false)
    const [showQuickAddModal, setShowQuickAddModal] = useState(false)
    const [selectedGameId, setSelectedGameId] = useState('')
    const [scanInput, setScanInput] = useState('')
    const [scanToast, setScanToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const scanInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [newGame, setNewGame] = useState({
        gameName: '',
        gameNumber: '',
        ticketPrice: ''
    })
    const [newPack, setNewPack] = useState({
        gameId: '',
        packNumber: '',
        ticketCount: 300
    })
    const [quickTicket, setQuickTicket] = useState({
        barcode: '',
        price: ''
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [gamesRes, packsRes] = await Promise.all([
                fetch('/api/lottery/games'),
                fetch('/api/lottery/packs?status=ACTIVATED')
            ])

            if (gamesRes.ok) {
                const data = await gamesRes.json()
                setGames(data.games || [])
            }
            if (packsRes.ok) {
                const data = await packsRes.json()
                setPacks(data.packs || [])
            }
        } catch (error) {
            console.error('Failed to fetch lottery data:', error)
        } finally {
            setLoading(false)
        }
    }

    const createGame = async () => {
        try {
            const res = await fetch('/api/lottery/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newGame,
                    ticketPrice: parseFloat(newGame.ticketPrice)
                })
            })

            if (res.ok) {
                setShowAddGameModal(false)
                setNewGame({ gameName: '', gameNumber: '', ticketPrice: '' })
                fetchData()
            }
        } catch (error) {
            console.error('Failed to create game:', error)
        }
    }

    const createPack = async () => {
        try {
            const res = await fetch('/api/lottery/packs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPack)
            })

            if (res.ok) {
                setShowAddPackModal(false)
                setNewPack({ gameId: '', packNumber: '', ticketCount: 300 })
                fetchData()
            }
        } catch (error) {
            console.error('Failed to create pack:', error)
        }
    }

    const saveQuickTicket = async () => {
        if (!quickTicket.barcode || !quickTicket.price) return

        try {
            const res = await fetch('/api/lottery/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barcode: quickTicket.barcode,
                    price: parseFloat(quickTicket.price)
                })
            })

            if (res.ok) {
                setShowQuickAddModal(false)
                setQuickTicket({ barcode: '', price: '' })
                alert('Ticket saved! Now cashiers can scan this barcode and price will auto-fill.')
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to save ticket')
            }
        } catch (error) {
            console.error('Failed to save quick ticket:', error)
        }
    }

    const activatePack = async (packId: string) => {
        try {
            await fetch(`/api/lottery/packs/${packId}/activate`, { method: 'POST' })
            fetchData()
        } catch (error) {
            console.error('Failed to activate pack:', error)
        }
    }

    const settlePack = async (packId: string) => {
        if (!confirm('Are you sure you want to close this pack? This action cannot be undone.')) {
            return
        }
        try {
            const res = await fetch(`/api/lottery/packs/${packId}/settle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            })
            if (res.ok) {
                fetchData()
            }
        } catch (error) {
            console.error('Failed to settle pack:', error)
        }
    }

    // Scan-to-Activate: instantly activate pack by scanning barcode
    const handleScanActivate = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && scanInput.trim()) {
            e.preventDefault()
            const barcode = scanInput.trim()
            setScanInput('')

            try {
                const res = await fetch('/api/lottery/packs/activate-by-scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ barcode })
                })

                const data = await res.json()

                if (res.ok && data.data) {
                    setScanToast({
                        message: `✓ Pack #${barcode} activated (${data.data.gameName})`,
                        type: 'success'
                    })
                    fetchData() // Refresh the pack list
                } else {
                    setScanToast({
                        message: data.error?.message || 'Failed to activate pack',
                        type: 'error'
                    })
                }
            } catch (error) {
                console.error('Scan activation failed:', error)
                setScanToast({ message: 'Scan activation failed', type: 'error' })
            }

            // Clear toast after 3 seconds
            setTimeout(() => setScanToast(null), 3000)
        }
    }

    // Keep focus on scan input for instant scanning
    useEffect(() => {
        const focusScan = () => {
            if (!showAddGameModal && !showAddPackModal && !showQuickAddModal) {
                scanInputRef.current?.focus()
            }
        }
        focusScan()
        const interval = setInterval(focusScan, 2000)
        return () => clearInterval(interval)
    }, [showAddGameModal, showAddPackModal, showQuickAddModal])

    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0)
    }

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    // Calculate stats
    const totalActivePacks = packs.filter(p => p.status === 'ACTIVATED').length
    const totalSold = packs.reduce((sum, p) => sum + p.soldCount, 0)
    const totalRevenue = packs.reduce((sum, p) => {
        const price = parseFloat(p.game?.ticketPrice || '0')
        return sum + (p.soldCount * price)
    }, 0)

    return (
        <div className="p-6 space-y-6">
            {/* Hidden Barcode Scanner for Instant Pack Activation */}
            <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleScanActivate}
                className="sr-only"
                placeholder="Scan pack barcode..."
                aria-label="Pack barcode scanner"
            />

            {/* Scan Toast Notification */}
            {scanToast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl border ${scanToast.type === 'success'
                        ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100'
                        : 'bg-red-900/90 border-red-500/50 text-red-100'
                    } animate-in slide-in-from-top-5 backdrop-blur-sm`}>
                    <p className="font-medium">{scanToast.message}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5 text-stone-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
                            <Ticket className="h-6 w-6 text-purple-500" />
                            Lottery Management
                        </h1>
                        <p className="text-stone-500 text-sm">Track scratch-off games, packs, and payouts</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowQuickAddModal(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Scan className="h-4 w-4" />
                        Quick Add Ticket
                    </button>
                    <button
                        onClick={() => setShowAddGameModal(true)}
                        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Game
                    </button>
                    <button
                        onClick={() => setShowAddPackModal(true)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Package className="h-4 w-4" />
                        Add Pack
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Ticket className="h-5 w-5 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-500 uppercase">Active Games</p>
                            <p className="text-xl font-bold text-stone-100">{games.filter(g => g.isActive).length}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Package className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-500 uppercase">Active Packs</p>
                            <p className="text-xl font-bold text-stone-100">{totalActivePacks}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-500 uppercase">Tickets Sold</p>
                            <p className="text-xl font-bold text-stone-100">{totalSold}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-stone-500 uppercase">Revenue</p>
                            <p className="text-xl font-bold text-stone-100">{formatCurrency(totalRevenue)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Games List */}
            <div className="glass-panel rounded-xl p-6">
                <h2 className="text-lg font-semibold text-stone-100 mb-4">Lottery Games</h2>

                {games.length === 0 ? (
                    <div className="text-center py-8 text-stone-500">
                        <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No lottery games configured</p>
                        <p className="text-sm mt-1">Add games to start tracking scratch-offs</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {games.map(game => (
                            <div key={game.id} className="p-4 bg-stone-800/50 rounded-xl border border-stone-700">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-medium text-stone-200">{game.gameName}</h3>
                                        <p className="text-sm text-stone-500">Game #{game.gameNumber}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs ${game.isActive
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-stone-500/20 text-stone-400'
                                        }`}>
                                        {game.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="mt-3 flex justify-between items-center">
                                    <span className="text-lg font-bold text-purple-400">{formatCurrency(game.ticketPrice)}</span>
                                    <span className="text-sm text-stone-500">{game._count?.packs || 0} packs</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Active Packs */}
            <div className="glass-panel rounded-xl p-6">
                <h2 className="text-lg font-semibold text-stone-100 mb-4">Active Packs</h2>

                {packs.length === 0 ? (
                    <div className="text-center py-8 text-stone-500">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No active lottery packs</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-stone-800/50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Pack #</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Game</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Price</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Sold</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Remaining</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Revenue</th>
                                    <th className="text-left px-4 py-3 text-xs text-stone-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800">
                                {packs.map(pack => {
                                    const price = parseFloat(pack.game?.ticketPrice || '0')
                                    const revenue = pack.soldCount * price
                                    const remaining = pack.ticketCount - pack.soldCount
                                    const percentSold = (pack.soldCount / pack.ticketCount) * 100

                                    return (
                                        <tr key={pack.id} className="hover:bg-stone-800/30">
                                            <td className="px-4 py-3 font-mono text-stone-200">{pack.packNumber}</td>
                                            <td className="px-4 py-3 text-stone-300">{pack.game?.gameName}</td>
                                            <td className="px-4 py-3 text-stone-400">{formatCurrency(price)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-stone-200">{pack.soldCount}</span>
                                                    <div className="w-16 h-2 bg-stone-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-purple-500 rounded-full"
                                                            style={{ width: `${percentSold}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-stone-400">{remaining}</td>
                                            <td className="px-4 py-3 font-medium text-emerald-400">{formatCurrency(revenue)}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => settlePack(pack.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <Lock className="h-3.5 w-3.5" />
                                                    Close
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Game Modal */}
            {showAddGameModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="glass-panel w-full max-w-md mx-4 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-stone-100">Add Lottery Game</h2>
                            <button onClick={() => setShowAddGameModal(false)} className="text-stone-500 hover:text-stone-300">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Game Name</label>
                                <input
                                    type="text"
                                    value={newGame.gameName}
                                    onChange={(e) => setNewGame({ ...newGame, gameName: e.target.value })}
                                    placeholder="e.g., Cash Explosion"
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Game Number</label>
                                <input
                                    type="text"
                                    value={newGame.gameNumber}
                                    onChange={(e) => setNewGame({ ...newGame, gameNumber: e.target.value })}
                                    placeholder="e.g., 1234"
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Ticket Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newGame.ticketPrice}
                                    onChange={(e) => setNewGame({ ...newGame, ticketPrice: e.target.value })}
                                    placeholder="e.g., 5.00"
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddGameModal(false)}
                                className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createGame}
                                disabled={!newGame.gameName || !newGame.ticketPrice}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
                            >
                                Add Game
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Pack Modal */}
            {showAddPackModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="glass-panel w-full max-w-md mx-4 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-stone-100">Add Lottery Pack</h2>
                            <button onClick={() => setShowAddPackModal(false)} className="text-stone-500 hover:text-stone-300">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Game</label>
                                <select
                                    value={newPack.gameId}
                                    onChange={(e) => setNewPack({ ...newPack, gameId: e.target.value })}
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                >
                                    <option value="">Select a game...</option>
                                    {games.filter(g => g.isActive).map(game => (
                                        <option key={game.id} value={game.id}>{game.gameName} ({formatCurrency(game.ticketPrice)})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Pack Number</label>
                                <input
                                    type="text"
                                    value={newPack.packNumber}
                                    onChange={(e) => setNewPack({ ...newPack, packNumber: e.target.value })}
                                    placeholder="Scan or enter pack number"
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Ticket Count</label>
                                <input
                                    type="number"
                                    value={newPack.ticketCount}
                                    onChange={(e) => setNewPack({ ...newPack, ticketCount: parseInt(e.target.value) || 0 })}
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddPackModal(false)}
                                className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createPack}
                                disabled={!newPack.gameId || !newPack.packNumber}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
                            >
                                Add Pack
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Add Ticket Modal - Simple barcode to price mapping */}
            {showQuickAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="glass-panel w-full max-w-md mx-4 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
                                <Scan className="h-5 w-5 text-emerald-500" />
                                Quick Add Ticket
                            </h2>
                            <button onClick={() => setShowQuickAddModal(false)} className="text-stone-500 hover:text-stone-300">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-stone-400 text-sm mb-4">
                            Scan a scratch ticket barcode and set its price. Cashiers can then scan this barcode at POS and the price will auto-fill.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Scan Ticket Barcode</label>
                                <input
                                    type="text"
                                    value={quickTicket.barcode}
                                    onChange={(e) => setQuickTicket({ ...quickTicket, barcode: e.target.value })}
                                    placeholder="Scan or enter barcode..."
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono text-lg focus:border-emerald-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-2">Ticket Price</label>
                                <div className="grid grid-cols-4 gap-2 mb-3">
                                    {[1, 2, 3, 5, 10, 20, 30, 50].map((price) => (
                                        <button
                                            key={price}
                                            onClick={() => setQuickTicket({ ...quickTicket, price: price.toString() })}
                                            className={`py-2 rounded-lg font-bold transition-colors ${quickTicket.price === price.toString()
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                                }`}
                                        >
                                            ${price}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={quickTicket.price}
                                    onChange={(e) => setQuickTicket({ ...quickTicket, price: e.target.value })}
                                    placeholder="Or enter custom price..."
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowQuickAddModal(false)}
                                className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveQuickTicket}
                                disabled={!quickTicket.barcode || !quickTicket.price}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="h-4 w-4" />
                                Save Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

