'use client'

import { useState } from 'react'
import { X, Trophy, DollarSign, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LotteryPayoutModalProps {
    isOpen: boolean
    onClose: () => void
    onPayout: (amount: number) => void
}

export default function LotteryPayoutModal({ isOpen, onClose, onPayout }: LotteryPayoutModalProps) {
    const [amount, setAmount] = useState('')
    const [ticketNumber, setTicketNumber] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    const handlePayout = async () => {
        const payoutAmount = parseFloat(amount)
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            alert('Please enter a valid payout amount')
            return
        }

        setIsProcessing(true)
        try {
            // Record the payout
            const res = await fetch('/api/lottery/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: payoutAmount,
                    ticketNumber: ticketNumber || null
                })
            })

            if (res.ok) {
                onPayout(payoutAmount)
                setAmount('')
                setTicketNumber('')
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
    const quickAmounts = [5, 10, 20, 50, 100, 200, 500, 1000]

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
                    {/* Warning */}
                    <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-200">
                            Verify winning ticket before paying out. This will be deducted from your cash drawer.
                        </p>
                    </div>

                    {/* Ticket Number (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">
                            Ticket Number (Optional)
                        </label>
                        <input
                            type="text"
                            value={ticketNumber}
                            onChange={(e) => setTicketNumber(e.target.value)}
                            placeholder="Enter ticket number for records..."
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
                                className="w-full pl-12 pr-4 py-4 bg-stone-800 border border-stone-700 rounded-lg text-white text-3xl font-bold text-center placeholder-stone-600 focus:ring-2 focus:ring-teal-500"
                                autoFocus
                            />
                        </div>
                    </div>

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
                        disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                        className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? 'Processing...' : `Pay ${amount ? formatCurrency(parseFloat(amount)) : '$0.00'}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
