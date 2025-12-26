'use client'

import { useState } from 'react'
import { X, Trophy, DollarSign, AlertTriangle, Ticket, Building2, Truck, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LotteryPayoutModalProps {
    isOpen: boolean
    onClose: () => void
    onPayout: (amount: number, type?: 'lottery' | 'vendor') => void
    maxStorePayout?: number // Default $599 for most states
}

type PayoutTab = 'lottery' | 'vendor'
type TicketType = 'scratch' | 'draw'

export default function LotteryPayoutModal({
    isOpen,
    onClose,
    onPayout,
    maxStorePayout = 599
}: LotteryPayoutModalProps) {
    const [tab, setTab] = useState<PayoutTab>('lottery')
    const [amount, setAmount] = useState('')
    const [ticketNumber, setTicketNumber] = useState('')
    const [ticketType, setTicketType] = useState<TicketType>('scratch')
    const [isProcessing, setIsProcessing] = useState(false)

    // Vendor payout fields
    const [vendorName, setVendorName] = useState('')
    const [vendorInvoice, setVendorInvoice] = useState('')
    const [vendorNote, setVendorNote] = useState('')

    const payoutAmount = parseFloat(amount) || 0
    const isOverLimit = tab === 'lottery' && payoutAmount > maxStorePayout

    const handlePayout = async () => {
        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            alert('Please enter a valid payout amount')
            return
        }

        if (tab === 'lottery' && isOverLimit) {
            alert(`Winnings over $${maxStorePayout} cannot be paid from the store. Customer must claim at lottery office.`)
            return
        }

        if (tab === 'vendor' && !vendorName.trim()) {
            alert('Please enter vendor name')
            return
        }

        // For lottery payouts, don't call API here - just add to cart
        // The API will be called when transaction completes
        if (tab === 'lottery') {
            onPayout(payoutAmount, 'lottery')
            resetForm()
            onClose()
            return
        }

        // Only call API immediately for vendor payouts (standalone transactions)
        setIsProcessing(true)
        try {
            const res = await fetch('/api/pos/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: payoutAmount,
                    type: 'VENDOR_PAYOUT',
                    vendorName,
                    invoiceNumber: vendorInvoice || null,
                    note: vendorNote || `Vendor payout to ${vendorName}`
                })
            })

            if (res.ok) {
                onPayout(payoutAmount, 'vendor')
                resetForm()
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

    const resetForm = () => {
        setAmount('')
        setTicketNumber('')
        setTicketType('scratch')
        setVendorName('')
        setVendorInvoice('')
        setVendorNote('')
    }

    // Quick amount buttons
    const lotteryAmounts = [5, 10, 20, 50, 100, 200, 500, 599]
    const vendorAmounts = [25, 50, 100, 200, 500, 1000, 2000, 5000]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl max-w-md w-full border border-stone-700 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header with Tabs */}
                <div className="border-b border-stone-700">
                    <div className="flex items-center justify-between p-4 pb-0">
                        <h2 className="text-xl font-bold text-white">💰 Payout</h2>
                        <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                            <X className="h-5 w-5 text-stone-400" />
                        </button>
                    </div>
                    {/* Tab Buttons */}
                    <div className="flex gap-1 p-2">
                        <button
                            onClick={() => { setTab('lottery'); resetForm() }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${tab === 'lottery'
                                ? 'bg-teal-500 text-black'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                }`}
                        >
                            <Trophy className="h-4 w-4" />
                            Lottery
                        </button>
                        <button
                            onClick={() => { setTab('vendor'); resetForm() }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${tab === 'vendor'
                                ? 'bg-orange-500 text-black'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                }`}
                        >
                            <Truck className="h-4 w-4" />
                            Vendor
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                    {/* LOTTERY PAYOUT TAB */}
                    {tab === 'lottery' && (
                        <>
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

                            {/* Warning */}
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
                        </>
                    )}

                    {/* VENDOR PAYOUT TAB */}
                    {tab === 'vendor' && (
                        <>
                            {/* Info */}
                            <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                                <Truck className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-orange-200">
                                    <p>Pay vendors/suppliers from the cash register.</p>
                                    <p className="text-orange-300/70 mt-1">
                                        This will be recorded as a cash-out transaction.
                                    </p>
                                </div>
                            </div>

                            {/* Vendor Name */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">
                                    Vendor / Supplier Name *
                                </label>
                                <input
                                    type="text"
                                    value={vendorName}
                                    onChange={(e) => setVendorName(e.target.value)}
                                    placeholder="e.g., McLane, Sysco, Coca-Cola..."
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            {/* Invoice Number */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">
                                    Invoice # (Optional)
                                </label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <input
                                        type="text"
                                        value={vendorInvoice}
                                        onChange={(e) => setVendorInvoice(e.target.value)}
                                        placeholder="INV-12345"
                                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">
                                    Note (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={vendorNote}
                                    onChange={(e) => setVendorNote(e.target.value)}
                                    placeholder="e.g., Weekly beverage delivery"
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </>
                    )}

                    {/* Amount (both tabs) */}
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
                                    : `border-stone-700 text-white focus:ring-${tab === 'lottery' ? 'teal' : 'orange'}-500`
                                    }`}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Over Limit Warning (Lottery only) */}
                    {tab === 'lottery' && isOverLimit && (
                        <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <Building2 className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-200">
                                <p className="font-bold">Cannot pay from store</p>
                                <p className="text-red-300/70 mt-1">
                                    Winnings over ${maxStorePayout} must be claimed at the Lottery Office.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Quick Amounts */}
                    <div className="grid grid-cols-4 gap-2">
                        {(tab === 'lottery' ? lotteryAmounts : vendorAmounts).map((amt) => (
                            <button
                                key={amt}
                                onClick={() => setAmount(amt.toString())}
                                className={`py-2 rounded-lg font-medium transition-colors ${amount === amt.toString()
                                    ? tab === 'lottery' ? 'bg-teal-500 text-black' : 'bg-orange-500 text-black'
                                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                    }`}
                            >
                                ${amt >= 1000 ? `${amt / 1000}k` : amt}
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
                        disabled={isProcessing || !amount || payoutAmount <= 0 || isOverLimit || (tab === 'vendor' && !vendorName.trim())}
                        className={`flex-1 py-3 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isOverLimit
                            ? 'bg-red-500/50 text-red-200 cursor-not-allowed'
                            : tab === 'lottery'
                                ? 'bg-teal-500 hover:bg-teal-400 text-black'
                                : 'bg-orange-500 hover:bg-orange-400 text-black'
                            }`}
                    >
                        {isProcessing ? 'Processing...' : isOverLimit ? 'Cannot Pay' : `Pay ${formatCurrency(payoutAmount)}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
