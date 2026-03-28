'use client'

import { useState } from 'react'
import { X, ArrowDownCircle, ArrowUpCircle, CheckCircle, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    cashDrawerSessionId: string
    storeName?: string
    cashierName?: string
}

const REASONS_IN = [
    'Making Change from Safe',
    'Starting Cash Replenishment',
    'Found Cash',
    'Manager Override',
    'Other'
]

const REASONS_OUT = [
    'Vendor COD Payment',
    'Petty Cash',
    'Customer Refund (Cash)',
    'Lottery Payout',
    'Employee Advance',
    'Miscellaneous Expense',
    'Other'
]

export default function PaidInOutModal({ isOpen, onClose, onSuccess, cashDrawerSessionId, storeName, cashierName }: Props) {
    const [type, setType] = useState<'PAID_IN' | 'PAID_OUT'>('PAID_IN')
    const [amount, setAmount] = useState('')
    const [reason, setReason] = useState('')
    const [note, setNote] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    if (!isOpen) return null

    const reasons = type === 'PAID_IN' ? REASONS_IN : REASONS_OUT

    const handleSubmit = async () => {
        const numAmount = parseFloat(amount)
        if (!numAmount || numAmount <= 0) {
            setToast({ type: 'error', message: 'Enter a valid amount' })
            return
        }
        if (!reason) {
            setToast({ type: 'error', message: 'Select a reason' })
            return
        }

        setIsProcessing(true)
        try {
            const res = await fetch('/api/pos/paid-in-out', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    amount: numAmount,
                    reason,
                    note: note || undefined,
                    cashDrawerSessionId
                })
            })

            if (res.ok) {
                setToast({ type: 'success', message: `✓ ${type === 'PAID_IN' ? 'Paid In' : 'Paid Out'} — ${formatCurrency(numAmount)}` })

                // Print receipt
                try {
                    const { printReceipt, isPrintAgentAvailable } = await import('@/lib/print-agent')
                    const agentAvailable = await isPrintAgentAvailable()
                    if (agentAvailable) {
                        await printReceipt({
                            storeName: storeName || undefined,
                            cashier: cashierName || undefined,
                            header: type === 'PAID_IN' ? '*** PAID IN ***' : '*** PAID OUT ***',
                            items: [{ name: reason, quantity: 1, price: numAmount, total: numAmount }],
                            subtotal: numAmount,
                            tax: 0,
                            total: numAmount,
                            date: new Date().toLocaleString(),
                            footer: note ? `Note: ${note}` : '',
                            openDrawer: true,
                        }).catch(console.error)
                    }
                } catch (e) { console.error('Paid in/out receipt error:', e) }

                setTimeout(() => { onSuccess(); onClose() }, 1200)
            } else {
                const error = await res.json()
                setToast({ type: 'error', message: error.error || 'Failed' })
            }
        } catch (error) {
            console.error('Paid in/out error:', error)
            setToast({ type: 'error', message: 'Network error' })
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-stone-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {type === 'PAID_IN' ? '💵 Paid In' : '💸 Paid Out'}
                    </h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Type Toggle */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => { setType('PAID_IN'); setReason('') }}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'PAID_IN'
                                ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400'
                                : 'bg-stone-800 border-stone-700 text-stone-400'
                                }`}
                        >
                            <ArrowDownCircle className="h-5 w-5" />
                            <span className="font-bold">Paid In</span>
                        </button>
                        <button
                            onClick={() => { setType('PAID_OUT'); setReason('') }}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'PAID_OUT'
                                ? 'bg-red-900/30 border-red-500 text-red-400'
                                : 'bg-stone-800 border-stone-700 text-stone-400'
                                }`}
                        >
                            <ArrowUpCircle className="h-5 w-5" />
                            <span className="font-bold">Paid Out</span>
                        </button>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="text-stone-400 text-sm mb-1 block">Amount *</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 text-xl">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-10 pr-4 py-3 text-white text-2xl font-bold text-right focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="text-stone-400 text-sm mb-1 block">Reason *</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                            <option value="">Select a reason...</option>
                            {reasons.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="text-stone-400 text-sm mb-1 block">Note (optional)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Additional details..."
                            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-stone-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!amount || !reason || isProcessing}
                        className={`flex-1 px-4 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${type === 'PAID_IN'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                            }`}
                    >
                        {isProcessing ? 'Processing...' : `Record ${type === 'PAID_IN' ? 'Paid In' : 'Paid Out'}`}
                    </button>
                </div>
            </div>
        </div>
    )
}
