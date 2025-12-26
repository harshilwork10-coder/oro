'use client'

import { useState, useEffect } from 'react'
import { X, Ticket, Minus, Plus, Search, Trophy, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LotteryGame {
    id: string
    gameName: string
    gameNumber: string
    ticketPrice: number
    packs: {
        id: string
        packNumber: string
        ticketCount: number
        soldCount: number
        status: string
    }[]
}

interface LotteryModalProps {
    isOpen: boolean
    onClose: () => void
    onAddToCart: (item: { name: string; price: number; quantity: number; category: string }) => void
}

type SellType = 'scratch' | 'lottery'

export default function LotteryModal({ isOpen, onClose, onAddToCart }: LotteryModalProps) {
    const [sellType, setSellType] = useState<SellType>('scratch')
    const [games, setGames] = useState<LotteryGame[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedGame, setSelectedGame] = useState<LotteryGame | null>(null)
    const [selectedPack, setSelectedPack] = useState<string | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')

    // For lottery (quick sell)
    const [lotteryAmount, setLotteryAmount] = useState('')
    const [lotteryType, setLotteryType] = useState('Pick 3')

    const lotteryTypes = ['Pick 3', 'Pick 4', 'Cash 5', 'Lotto', 'Powerball', 'Mega Millions', 'Other']

    useEffect(() => {
        if (isOpen) {
            fetchGames()
        }
    }, [isOpen])

    const fetchGames = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/lottery/games')
            if (res.ok) {
                const data = await res.json()
                setGames(data.games || [])
            }
        } catch (error) {
            console.error('Failed to fetch lottery games:', error)
        }
        setLoading(false)
    }

    const handleSellScratchTickets = async () => {
        if (!selectedGame || !selectedPack) return

        const pack = selectedGame.packs.find(p => p.id === selectedPack)
        if (!pack) return

        const remaining = pack.ticketCount - pack.soldCount
        if (quantity > remaining) {
            alert(`Only ${remaining} tickets remaining in this pack`)
            return
        }

        try {
            const res = await fetch(`/api/lottery/packs/${selectedPack}/sell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity })
            })

            if (res.ok) {
                onAddToCart({
                    name: `${selectedGame.gameName} (Pack #${pack.packNumber})`,
                    price: selectedGame.ticketPrice * quantity,
                    quantity: 1,
                    category: 'LOTTERY'
                })

                setSelectedGame(null)
                setSelectedPack(null)
                setQuantity(1)
                onClose()
            }
        } catch (error) {
            console.error('Failed to sell lottery tickets:', error)
        }
    }

    const handleSellLottery = () => {
        const amount = parseFloat(lotteryAmount)
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount')
            return
        }

        onAddToCart({
            name: `Lottery - ${lotteryType}`,
            price: amount,
            quantity: 1,
            category: 'LOTTERY'
        })

        setLotteryAmount('')
        setLotteryType('Pick 3')
        onClose()
    }

    const filteredGames = games.filter(g =>
        g.gameName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.gameNumber.includes(searchQuery)
    )

    // Quick amounts for lottery
    const quickAmounts = [1, 2, 5, 10, 20, 50]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-stone-700">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700 bg-amber-500/10">
                    <div className="flex items-center gap-3">
                        <Ticket className="h-6 w-6 text-amber-400" />
                        <h2 className="text-xl font-bold text-white">Sell Lottery</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                {/* Type Selection Tabs */}
                <div className="flex border-b border-stone-700">
                    <button
                        onClick={() => setSellType('scratch')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-colors ${sellType === 'scratch'
                            ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
                            : 'text-stone-400 hover:bg-stone-800'
                            }`}
                    >
                        <Ticket className="h-5 w-5" />
                        Scratch-Off
                    </button>
                    <button
                        onClick={() => setSellType('lottery')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium transition-colors ${sellType === 'lottery'
                            ? 'bg-blue-500/20 text-blue-400 border-b-2 border-blue-500'
                            : 'text-stone-400 hover:bg-stone-800'
                            }`}
                    >
                        <Trophy className="h-5 w-5" />
                        Lottery / Draw
                    </button>
                </div>

                {/* Content based on type */}
                {sellType === 'scratch' ? (
                    <>
                        <div className="p-4 overflow-y-auto max-h-[50vh]">
                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search game..."
                                    className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            {loading ? (
                                <div className="text-center py-8 text-stone-400">Loading games...</div>
                            ) : filteredGames.length === 0 ? (
                                <div className="text-center py-8 text-stone-400">
                                    No scratch-off games found. Set up games in Lottery Management.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredGames.map((game) => {
                                        const activePacks = game.packs.filter(p => p.status === 'ACTIVATED')
                                        const isSelected = selectedGame?.id === game.id

                                        return (
                                            <div
                                                key={game.id}
                                                className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                                                    ? 'bg-amber-500/20 border-amber-500'
                                                    : 'bg-stone-800/50 border-stone-700 hover:border-stone-500'
                                                    }`}
                                                onClick={() => {
                                                    setSelectedGame(game)
                                                    if (activePacks.length === 1) {
                                                        setSelectedPack(activePacks[0].id)
                                                    }
                                                }}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-bold text-white">{game.gameName}</p>
                                                        <p className="text-sm text-stone-400">Game #{game.gameNumber}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xl font-bold text-amber-400">
                                                            {formatCurrency(game.ticketPrice)}
                                                        </p>
                                                        <p className="text-xs text-stone-500">
                                                            {activePacks.length} active pack{activePacks.length !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                {isSelected && activePacks.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-stone-700">
                                                        <p className="text-sm text-stone-400 mb-2">Select Pack:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {activePacks.map((pack) => {
                                                                const remaining = pack.ticketCount - pack.soldCount
                                                                return (
                                                                    <button
                                                                        key={pack.id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setSelectedPack(pack.id)
                                                                        }}
                                                                        className={`px-3 py-2 rounded-lg text-sm transition-all ${selectedPack === pack.id
                                                                            ? 'bg-amber-500 text-black font-bold'
                                                                            : 'bg-stone-700 text-white hover:bg-stone-600'
                                                                            }`}
                                                                    >
                                                                        Pack #{pack.packNumber}
                                                                        <span className="ml-2 text-xs opacity-75">
                                                                            ({remaining} left)
                                                                        </span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {isSelected && activePacks.length === 0 && (
                                                    <div className="mt-3 pt-3 border-t border-stone-700">
                                                        <p className="text-sm text-red-400">No active packs. Activate a pack first.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer - Quantity and Sell */}
                        {selectedGame && selectedPack && (
                            <div className="p-4 border-t border-stone-700 bg-stone-800/50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-stone-400">Quantity:</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="p-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </button>
                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-16 text-center py-2 bg-stone-700 border border-stone-600 rounded-lg text-white font-bold"
                                            />
                                            <button
                                                onClick={() => setQuantity(quantity + 1)}
                                                className="p-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-stone-400">Total</p>
                                            <p className="text-2xl font-bold text-white">
                                                {formatCurrency(selectedGame.ticketPrice * quantity)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleSellScratchTickets}
                                            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors"
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Lottery / Draw Quick Sell */}
                        <div className="p-4 space-y-4">
                            {/* Lottery Type */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">
                                    Game Type
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {lotteryTypes.map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setLotteryType(type)}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${lotteryType === type
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">
                                    Amount
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-stone-500" />
                                    <input
                                        type="number"
                                        value={lotteryAmount}
                                        onChange={(e) => setLotteryAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-12 pr-4 py-4 bg-stone-800 border border-stone-700 rounded-lg text-white text-3xl font-bold text-center placeholder-stone-600 focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Quick Amounts */}
                            <div className="grid grid-cols-6 gap-2">
                                {quickAmounts.map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setLotteryAmount(amt.toString())}
                                        className={`py-2 rounded-lg font-medium transition-colors ${lotteryAmount === amt.toString()
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                            }`}
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-stone-700 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-medium text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSellLottery}
                                disabled={!lotteryAmount || parseFloat(lotteryAmount) <= 0}
                                className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add {lotteryAmount ? formatCurrency(parseFloat(lotteryAmount)) : '$0.00'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
