'use client'

import { useState } from 'react'
import { X, ArrowDownToLine, ArrowUpFromLine, DollarSign } from 'lucide-react'

interface CashDropPayoutModalProps {
    isOpen: boolean
    mode: 'drop' | 'payout' // drop = money OUT of drawer, payout = money OUT to vendor/expense
    onClose: () => void
    onComplete: () => void
    locationId: string
    shiftId?: string
}

export default function CashDropPayoutModal({
    isOpen,
    mode,
    onClose,
    onComplete,
    locationId,
    shiftId
}: CashDropPayoutModalProps) {
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount)
        if (isNaN(numAmount) || numAmount <= 0) {
            alert('Please enter a valid amount')
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/drawer-activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: mode === 'drop' ? 'CASH_DROP' : 'PAID_OUT',
                    amount: numAmount,
                    note: note || (mode === 'drop' ? 'Cash drop to safe' : 'Payout/expense'),
                    reason: mode === 'drop' ? 'cash_drop' : 'paid_out',
                    locationId,
                    shiftId: shiftId || null
                })
            })

            if (res.ok) {
                setAmount('')
                setNote('')
                onComplete()
                onClose()
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to process')
            }
        } catch (error) {
            console.error('Failed to process cash operation:', error)
            alert('Failed to process')
        }
        setIsProcessing(false)
    }

    const quickAmounts = mode === 'drop' ? [50, 100, 200, 500] : [5, 10, 20, 50]

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 rounded-2xl max-w-md w-full border border-stone-700">
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b border-stone-700 ${mode === 'drop' ? 'bg-blue-500/10' : 'bg-orange-500/10'}`}>
                    <div className="flex items-center gap-3">
                        {mode === 'drop' ? (
                            <ArrowDownToLine className="h-6 w-6 text-blue-400" />
                        ) : (
                            <ArrowUpFromLine className="h-6 w-6 text-orange-400" />
                        )}
                        <h2 className="text-xl font-bold text-white">
                            {mode === 'drop' ? 'Cash Drop' : 'Pay Out'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg">
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Description */}
                    <p className="text-sm text-stone-400">
                        {mode === 'drop'
                            ? 'Remove excess cash from drawer and deposit in safe. This will be tracked in end-of-day reconciliation.'
                            : 'Record cash paid out for expenses or vendor payments. Requires note for audit trail.'}
                    </p>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">Amount</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-stone-500" />
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-12 pr-4 py-4 bg-stone-800 border border-stone-700 rounded-lg text-white text-3xl font-bold text-center"
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
                                className={`py-2 rounded-lg font-medium transition-colors
                                    ${mode === 'drop'
                                        ? 'bg-blue-900/30 hover:bg-blue-900/50 text-blue-300'
                                        : 'bg-orange-900/30 hover:bg-orange-900/50 text-orange-300'}`}
                            >
                                ${amt}
                            </button>
                        ))}
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">
                            Note {mode === 'payout' && <span className="text-red-400">*</span>}
                        </label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={mode === 'drop' ? 'Optional note...' : 'Reason for payout (required)...'}
                            className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl font-medium text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !amount || (mode === 'payout' && !note)}
                        className={`flex-1 py-3 font-bold rounded-xl disabled:opacity-50
                            ${mode === 'drop'
                                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                : 'bg-orange-600 hover:bg-orange-500 text-white'}`}
                    >
                        {isProcessing ? 'Processing...' : (mode === 'drop' ? 'Record Drop' : 'Record Payout')}
                    </button>
                </div>
            </div>
        </div>
    )
}

