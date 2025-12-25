'use client'

import { useState } from 'react'
import { X, Trophy, DollarSign, AlertTriangle, Ticket, Truck, Building2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PayoutModalProps {
    isOpen: boolean
    onClose: () => void
    onPayout: (amount: number, type: PayoutType, details: PayoutDetails) => void
    maxLotteryPayout?: number // Default $599 for most states
}

type PayoutType = 'lottery' | 'scratch' | 'vendor'

interface PayoutDetails {
    ticketNumber?: string
    vendorName?: string
    invoiceNumber?: string
    notes?: string
}

export default function PayoutModal({
    isOpen,
    onClose,
    onPayout,
    maxLotteryPayout = 599
}: PayoutModalProps) {
    const [amount, setAmount] = useState('')
    const [payoutType, setPayoutType] = useState<PayoutType>('scratch')
    const [ticketNumber, setTicketNumber] = useState('')
    const [vendorName, setVendorName] = useState('')
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [notes, setNotes] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    const payoutAmount = parseFloat(amount) || 0
    const isLotteryType = payoutType === 'lottery' || payoutType === 'scratch'
    const isOverLotteryLimit = isLotteryType && payoutAmount > maxLotteryPayout

    const getTypeIcon = () => {
        switch (payoutType) {
            case 'lottery': return <Trophy className="h-5 w-5" />
            case 'scratch': return <Ticket className="h-5 w-5" />
            case 'vendor': return <Truck className="h-5 w-5" />
        }
    }

    const getTypeColor = () => {
        switch (payoutType) {
            case 'lottery': return 'bg-blue-500/20 border-blue-500 text-blue-400'
            case 'scratch': return 'bg-purple-500/20 border-purple-500 text-purple-400'
            case 'vendor': return 'bg-orange-500/20 border-orange-500 text-orange-400'
        }
    }

    const handlePayout = async () => {
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            alert('Please enter a valid payout amount')
            return
        }

        if (isOverLotteryLimit) {
            alert(`Lottery winnings over $${maxLotteryPayout} cannot be paid from the store.`)
            return
        }

        if (payoutType === 'vendor' && !vendorName.trim()) {
            alert('Please enter vendor name')
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/pos/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: payoutAmount,
                    type: payoutType,
                    ticketNumber: ticketNumber || null,
                    vendorName: vendorName || null,
                    invoiceNumber: invoiceNumber || null,
                    notes: notes || null
                })
            })

            if (res.ok) {
                onPayout(payoutAmount, payoutType, {
                    ticketNumber,
                    vendorName,
                    invoiceNumber,
                    notes
                })
                // Reset form
                setAmount('')
                setTicketNumber('')
                setVendorName('')
                setInvoiceNumber('')
                setNotes('')
                onClose()
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to process payout')
            }
        } catch (error) {
            console.error('Failed to process payout:', error)
            alert('Failed to process payout')
        }
        setIsProcessing(false)
    }

    // Quick amount buttons
    const quickAmounts = payoutType === 'vendor'
        ? [20, 50, 100, 200, 300, 500, 750, 1000]
        : [5, 10, 20, 50, 100, 200, 500, 599]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl max-w-md w-full border border-stone-700 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b border-stone-700 ${getTypeColor().replace('border-', 'bg-').split(' ')[0]}/10`}>
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-6 w-6 text-teal-400" />
                        <h2 className="text-xl font-bold text-white">Payout</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Payout Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">
                            Payout Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setPayoutType('scratch')}
                                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg font-medium border transition-colors ${payoutType === 'scratch'
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                    }`}
                            >
                                <Ticket className="h-5 w-5" />
                                <span className="text-xs">Scratch</span>
                            </button>
                            <button
                                onClick={() => setPayoutType('lottery')}
                                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg font-medium border transition-colors ${payoutType === 'lottery'
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                    }`}
                            >
                                <Trophy className="h-5 w-5" />
                                <span className="text-xs">Lottery</span>
                            </button>
                            <button
                                onClick={() => setPayoutType('vendor')}
                                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg font-medium border transition-colors ${payoutType === 'vendor'
                                    ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                    }`}
                            >
                                <Truck className="h-5 w-5" />
                                <span className="text-xs">Vendor</span>
                            </button>
                        </div>
                    </div>

                    {/* Lottery/Scratch Warning */}
                    {isLotteryType && (
                        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-200">
                                <p>Verify winning ticket before paying.</p>
                                <p className="text-amber-300/70 mt-1">
                                    Store limit: <span className="font-bold">${maxLotteryPayout}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Dynamic Fields based on type */}
                    {isLotteryType && (
                        <div>
                            <label className="block text-sm font-medium text-stone-400 mb-2">
                                Ticket Number (Optional)
                            </label>
                            <input
                                type="text"
                                value={ticketNumber}
                                onChange={(e) => setTicketNumber(e.target.value)}
                                placeholder={payoutType === 'lottery' ? 'Scan barcode...' : 'Enter ticket #...'}
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    )}

                    {payoutType === 'vendor' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">
                                    Vendor Name *
                                </label>
                                <input
                                    type="text"
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                    placeholder="McLane, Coremark, etc."
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">
                                    Invoice # (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    placeholder="Invoice number..."
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </>
                    )}

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
                                className={`w-full pl-12 pr-4 py-4 bg-stone-800 border rounded-lg text-3xl font-bold text-center placeholder-stone-600 focus:ring-2 ${isOverLotteryLimit
                                    ? 'border-red-500 text-red-400 focus:ring-red-500'
                                    : 'border-stone-700 text-white focus:ring-teal-500'
                                    }`}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Over Limit Warning */}
                    {isOverLotteryLimit && (
                        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <Building2 className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-200">
                                <p className="font-bold">Cannot pay from store</p>
                                <p className="text-red-300/70 mt-1">
                                    Over ${maxLotteryPayout} → Customer must claim at Lottery Office
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
                                className={`py-2 rounded-lg font-medium transition-colors text-sm ${amount === amt.toString()
                                    ? 'bg-teal-500 text-black'
                                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                    }`}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>

                    {/* Notes (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">
                            Notes (Optional)
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional notes..."
                            className="w-full px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm placeholder-stone-500"
                        />
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
                        disabled={isProcessing || !amount || payoutAmount <= 0 || isOverLotteryLimit || (payoutType === 'vendor' && !vendorName.trim())}
                        className={`flex-1 py-3 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isOverLotteryLimit
                            ? 'bg-red-500/50 text-red-200'
                            : 'bg-teal-500 hover:bg-teal-400 text-black'
                            }`}
                    >
                        {isProcessing ? 'Processing...' : isOverLotteryLimit ? 'Cannot Pay' : `Pay ${formatCurrency(payoutAmount)}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
