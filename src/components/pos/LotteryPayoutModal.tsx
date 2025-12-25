'use client'

import { useState } from 'react'
import { X, Trophy, DollarSign, AlertTriangle, Ticket, HelpCircle, Building2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LotteryPayoutModalProps {
    isOpen: boolean
    onClose: () => void
    onPayout: (amount: number) => void
    maxStorePayout?: number // Default $599 for most states
}

type TicketType = 'scratch' | 'draw'

export default function LotteryPayoutModal({
    isOpen,
    onClose,
    onPayout,
    maxStorePayout = 599
}: LotteryPayoutModalProps) {
    const [amount, setAmount] = useState('')
    const [ticketNumber, setTicketNumber] = useState('')
    const [ticketType, setTicketType] = useState<TicketType>('scratch')
    const [isProcessing, setIsProcessing] = useState(false)

    const payoutAmount = parseFloat(amount) || 0
    const isOverLimit = payoutAmount > maxStorePayout
    const requiresClaimForm = payoutAmount >= 600

    const handlePayout = async () => {
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            alert('Please enter a valid payout amount')
            return
        }

        if (isOverLimit) {
            alert(`Winnings over $${maxStorePayout} cannot be paid from the store. Customer must claim at lottery office.`)
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/lottery/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: payoutAmount,
                    ticketNumber: ticketNumber || null,
                    ticketType
                })
            })

            if (res.ok) {
                onPayout(payoutAmount)
                setAmount('')
                setTicketNumber('')
                setTicketType('scratch')
                onClose()
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to process payout')
            }
        } catch (error) {
            console.error('Failed to process lottery payout:', error)
            alert('Failed to process payout')
        }
        setIsProcessing(false)
    }

    // Quick amount buttons
    const quickAmounts = [5, 10, 20, 50, 100, 200, 500, 599]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl max-w-md w-full border border-stone-700">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700 bg-teal-500/10">
                    <div className="flex items-center gap-3">
                        <Trophy className="h-6 w-6 text-teal-400" />
                        <h2 className="text-xl font-bold text-white">Lottery Payout</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Ticket Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">
                            Ticket Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setTicketType('scratch')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium border transition-colors ${ticketType === 'scratch'
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                    }`}
                            >
                                <Ticket className="h-4 w-4" />
                                Scratch-Off
                            </button>
                            <button
                                onClick={() => setTicketType('draw')}
                                className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium border transition-colors ${ticketType === 'draw'
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                    }`}
                            >
                                <Trophy className="h-4 w-4" />
                                Draw Game
                            </button>
                        </div>
                    </div>

                    {/* Warning / Info based on type */}
                    <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-200">
                            <p>Verify winning ticket before paying out.</p>
                            <p className="text-amber-300/70 mt-1">
                                Store limit: <span className="font-bold">${maxStorePayout}</span> |
                                Over ${maxStorePayout} → Lottery Office
                            </p>
                        </div>
                    </div>

                    {/* Ticket Number */}
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">
                            {ticketType === 'draw' ? 'Ticket Barcode / Serial' : 'Ticket Number'} (Optional)
                        </label>
                        <input
                            type="text"
                            value={ticketNumber}
                            onChange={(e) => setTicketNumber(e.target.value)}
                            placeholder={ticketType === 'draw' ? 'Scan barcode or enter serial...' : 'Enter ticket number...'}
                            className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-teal-500"
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">
                            Payout Amount
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-stone-500" />
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className={`w-full pl-12 pr-4 py-4 bg-stone-800 border rounded-lg text-3xl font-bold text-center placeholder-stone-600 focus:ring-2 ${isOverLimit
                                    ? 'border-red-500 text-red-400 focus:ring-red-500'
                                    : 'border-stone-700 text-white focus:ring-teal-500'
                                    }`}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Over Limit Warning */}
                    {isOverLimit && (
                        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <Building2 className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-200">
                                <p className="font-bold">Cannot pay from store</p>
                                <p className="text-red-300/70 mt-1">
                                    Winnings over ${maxStorePayout} must be claimed at:
                                </p>
                                <ul className="text-red-300/70 mt-1 list-disc list-inside">
                                    <li>$600 - $50,000 → Lottery District Office</li>
                                    <li>$50,000+ → State Lottery Headquarters</li>
                                </ul>
                                <p className="text-red-300/70 mt-2">
                                    Provide customer with claim form and direct to lottery office.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Quick Amounts */}
                    <div className="grid grid-cols-4 gap-2">
                        {quickAmounts.map((amt) => (
                            <button
                                key={amt}
                                onClick={() => setAmount(amt.toString())}
                                className={`py-2 rounded-lg font-medium transition-colors ${amount === amt.toString()
                                    ? 'bg-teal-500 text-black'
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
                        onClick={handlePayout}
                        disabled={isProcessing || !amount || payoutAmount <= 0 || isOverLimit}
                        className={`flex-1 py-3 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isOverLimit
                            ? 'bg-red-500/50 text-red-200 cursor-not-allowed'
                            : 'bg-teal-500 hover:bg-teal-400 text-black'
                            }`}
                    >
                        {isProcessing ? 'Processing...' : isOverLimit ? 'Cannot Pay' : `Pay ${formatCurrency(payoutAmount)}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
