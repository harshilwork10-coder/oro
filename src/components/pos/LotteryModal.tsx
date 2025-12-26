'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Ticket, Minus, Plus, Trophy, Delete, Scan } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LotteryModalProps {
    isOpen: boolean
    onClose: () => void
    onAddToCart: (item: { name: string; price: number; quantity: number; category: string }) => void
}

type SellType = 'scratch' | 'lottery'

export default function LotteryModal({ isOpen, onClose, onAddToCart }: LotteryModalProps) {
    const [sellType, setSellType] = useState<SellType>('scratch')
    const barcodeInputRef = useRef<HTMLInputElement>(null)

    // Scratch-off state
    const [scratchBarcode, setScratchBarcode] = useState('')
    const [scratchQuantity, setScratchQuantity] = useState(1)
    const [scratchPrice, setScratchPrice] = useState('')
    const [recentScans, setRecentScans] = useState<{ name: string; price: number; barcode: string }[]>([])

    // For lottery (quick sell) - stores as cents for precision
    const [lotteryAmount, setLotteryAmount] = useState('')

    // Common scratch ticket prices
    const scratchPrices = [1, 2, 3, 5, 10, 20, 30, 50]

    useEffect(() => {
        if (isOpen) {
            setLotteryAmount('')
            setScratchBarcode('')
            setScratchPrice('')
            setScratchQuantity(1)
            // Auto-focus barcode input
            setTimeout(() => barcodeInputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // Handle barcode scan (Enter key)
    const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && scratchBarcode.trim()) {
            // Try to lookup the game by barcode/game number
            try {
                const res = await fetch(`/api/lottery/lookup?code=${encodeURIComponent(scratchBarcode)}`)
                if (res.ok) {
                    const game = await res.json()
                    // Auto-fill price if found
                    setScratchPrice(game.ticketPrice.toString())
                    // Add to recent scans
                    setRecentScans(prev => [
                        { name: game.gameName, price: game.ticketPrice, barcode: scratchBarcode },
                        ...prev.slice(0, 4)
                    ])
                }
            } catch {
                // Game not in system - cashier enters price manually
            }
        }
    }

    const handleSellScratch = () => {
        const price = parseFloat(scratchPrice)
        if (isNaN(price) || price <= 0) {
            return
        }

        const ticketName = scratchBarcode
            ? `Scratch #${scratchBarcode.slice(-6)}`
            : 'Scratch Ticket'

        onAddToCart({
            name: ticketName,
            price: price * scratchQuantity,
            quantity: 1,
            category: 'LOTTERY'
        })

        // Track sale for lottery inventory
        if (scratchBarcode) {
            fetch('/api/lottery/sell', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barcode: scratchBarcode,
                    quantity: scratchQuantity,
                    price: price
                })
            }).catch(console.error)
        }

        setScratchBarcode('')
        setScratchPrice('')
        setScratchQuantity(1)
        onClose()
    }

    const handleSellLottery = () => {
        const amount = parseFloat(lotteryAmount) / 100 // Convert cents to dollars
        if (isNaN(amount) || amount <= 0) {
            return
        }

        onAddToCart({
            name: 'Lottery',
            price: amount,
            quantity: 1,
            category: 'LOTTERY'
        })

        setLotteryAmount('')
        onClose()
    }

    // Numpad handlers
    const handleNumpadPress = (key: string) => {
        if (key === 'C') {
            setLotteryAmount('')
        } else if (key === 'DEL') {
            setLotteryAmount(prev => prev.slice(0, -1))
        } else {
            if (lotteryAmount.length < 6) {
                setLotteryAmount(prev => prev + key)
            }
        }
    }

    const handleQuickAmount = (dollars: number) => {
        setLotteryAmount((dollars * 100).toString())
    }

    const getDisplayAmount = () => {
        if (!lotteryAmount) return '$0.00'
        const cents = parseInt(lotteryAmount)
        return formatCurrency(cents / 100)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden border border-stone-700">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-stone-700 bg-amber-500/10">
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
                        onClick={() => {
                            setSellType('scratch')
                            setTimeout(() => barcodeInputRef.current?.focus(), 100)
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 font-medium transition-colors ${sellType === 'scratch'
                            ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
                            : 'text-stone-400 hover:bg-stone-800'
                            }`}
                    >
                        <Ticket className="h-5 w-5" />
                        Scratch-Off
                    </button>
                    <button
                        onClick={() => setSellType('lottery')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 font-medium transition-colors ${sellType === 'lottery'
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
                        <div className="p-4 space-y-4">
                            {/* Barcode Scan Input */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">
                                    <Scan className="inline h-4 w-4 mr-1" />
                                    Scan Ticket Barcode
                                </label>
                                <input
                                    ref={barcodeInputRef}
                                    type="text"
                                    value={scratchBarcode}
                                    onChange={(e) => setScratchBarcode(e.target.value)}
                                    onKeyDown={handleBarcodeScan}
                                    placeholder="Scan or enter barcode..."
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white text-lg font-mono placeholder-stone-500 focus:ring-2 focus:ring-purple-500"
                                    autoFocus
                                />
                            </div>

                            {/* Price Selection */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">
                                    Ticket Price
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {scratchPrices.map((price) => (
                                        <button
                                            key={price}
                                            onClick={() => setScratchPrice(price.toString())}
                                            className={`py-3 rounded-lg font-bold text-lg transition-colors ${scratchPrice === price.toString()
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                                }`}
                                        >
                                            ${price}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quantity */}
                            <div className="flex items-center justify-between">
                                <span className="text-stone-400">Quantity:</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setScratchQuantity(Math.max(1, scratchQuantity - 1))}
                                        className="p-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
                                    >
                                        <Minus className="h-5 w-5" />
                                    </button>
                                    <span className="text-2xl font-bold text-white w-12 text-center">{scratchQuantity}</span>
                                    <button
                                        onClick={() => setScratchQuantity(scratchQuantity + 1)}
                                        className="p-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Total Display */}
                            {scratchPrice && (
                                <div className="bg-purple-500/20 rounded-xl p-4 text-center">
                                    <p className="text-purple-300 text-sm">Total</p>
                                    <p className="text-3xl font-bold text-white">
                                        {formatCurrency(parseFloat(scratchPrice) * scratchQuantity)}
                                    </p>
                                </div>
                            )}
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
                                onClick={handleSellScratch}
                                disabled={!scratchPrice}
                                className="flex-1 py-3 bg-purple-500 hover:bg-purple-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add {scratchPrice ? formatCurrency(parseFloat(scratchPrice) * scratchQuantity) : ''}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Lottery / Draw Quick Sell with Numpad */}
                        <div className="p-4">
                            {/* Amount Display */}
                            <div className="bg-stone-800 rounded-xl p-4 mb-4 text-center">
                                <p className="text-stone-500 text-sm mb-1">Amount</p>
                                <p className="text-4xl font-bold text-white">{getDisplayAmount()}</p>
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="grid grid-cols-6 gap-2 mb-4">
                                {[1, 2, 5, 10, 20, 50].map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => handleQuickAmount(amt)}
                                        className="py-2 rounded-lg font-bold text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 transition-colors"
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-2">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => handleNumpadPress(key)}
                                        className={`py-4 rounded-xl text-2xl font-bold transition-colors ${key === 'C'
                                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/40'
                                                : key === 'DEL'
                                                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/40'
                                                    : 'bg-stone-800 text-white hover:bg-stone-700'
                                            }`}
                                    >
                                        {key === 'DEL' ? <Delete className="h-6 w-6 mx-auto" /> : key}
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
                                disabled={!lotteryAmount || parseInt(lotteryAmount) <= 0}
                                className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add {getDisplayAmount()}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
