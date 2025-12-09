'use client'

import { useState } from 'react'
import { DollarSign, X } from 'lucide-react'

interface TipModalProps {
    isOpen: boolean
    subtotal: number
    tipType?: 'PERCENT' | 'DOLLAR'
    suggestions?: number[]
    onTipSelected: (tipAmount: number) => void
    onClose: () => void
}

const DEFAULT_PERCENTAGES = [15, 18, 20, 25]
const DEFAULT_DOLLARS = [2, 5, 10, 15]

export default function TipModal({
    isOpen,
    subtotal,
    tipType = 'PERCENT',
    suggestions,
    onTipSelected,
    onClose
}: TipModalProps) {
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [customTip, setCustomTip] = useState('')

    if (!isOpen) return null

    const tipOptions = suggestions || (tipType === 'PERCENT' ? DEFAULT_PERCENTAGES : DEFAULT_DOLLARS)

    const handleOptionClick = (value: number) => {
        setSelectedOption(value)
        setCustomTip('')
        const tipAmount = tipType === 'PERCENT' ? subtotal * (value / 100) : value
        onTipSelected(tipAmount)
    }

    const handleCustomTipChange = (value: string) => {
        setCustomTip(value)
        setSelectedOption(null)
        const tipAmount = parseFloat(value) || 0
        onTipSelected(tipAmount)
    }

    const handleNoTip = () => {
        setSelectedOption(null)
        setCustomTip('')
        onTipSelected(0)
    }

    const getTipAmount = () => {
        if (selectedOption !== null) {
            return tipType === 'PERCENT'
                ? (subtotal * (selectedOption / 100)).toFixed(2)
                : selectedOption.toFixed(2)
        }
        if (customTip) {
            return parseFloat(customTip).toFixed(2)
        }
        return '0.00'
    }

    const getTotal = () => {
        return (subtotal + parseFloat(getTipAmount())).toFixed(2)
    }

    const formatOption = (value: number) => {
        if (tipType === 'PERCENT') {
            return {
                label: `${value}%`,
                amount: `$${(subtotal * (value / 100)).toFixed(2)}`
            }
        }
        return {
            label: `$${value}`,
            amount: ''
        }
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-stone-950 to-slate-900 z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="w-full max-w-2xl mb-8 text-center">
                <h1 className="text-5xl font-bold text-white mb-4">Add a Tip?</h1>
                <p className="text-2xl text-stone-400">Your service provider would greatly appreciate it!</p>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border border-white/20">
                {/* Amount Display */}
                <div className="mb-10 text-center">
                    <p className="text-stone-400 text-xl mb-2">Service Total</p>
                    <p className="text-6xl font-bold text-white">${subtotal.toFixed(2)}</p>
                </div>

                {/* Tip Option Buttons */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {tipOptions.map((value) => {
                        const formatted = formatOption(value)
                        return (
                            <button
                                key={value}
                                onClick={() => handleOptionClick(value)}
                                className={`py-8 rounded-2xl text-3xl font-bold transition-all transform active:scale-95 ${selectedOption === value
                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-[0_0_40px_rgba(34,197,94,0.5)] scale-105'
                                    : 'bg-white/5 text-white hover:bg-white/10 border-2 border-white/20'
                                    }`}
                            >
                                {formatted.label}
                                {formatted.amount && (
                                    <div className="text-lg font-normal mt-2 text-stone-300">
                                        {formatted.amount}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Custom Tip Input */}
                <div className="mb-8">
                    <label className="block text-stone-300 text-xl mb-3 font-medium">Custom Amount</label>
                    <div className="relative">
                        <DollarSign className="absolute left-6 top-1/2 transform -translate-y-1/2 text-stone-400 h-8 w-8" />
                        <input
                            type="number"
                            placeholder="0.00"
                            value={customTip}
                            onChange={(e) => handleCustomTipChange(e.target.value)}
                            className="w-full pl-16 pr-6 py-6 text-3xl bg-white/5 border-2 border-white/20 rounded-2xl focus:ring-4 focus:ring-green-500/50 focus:border-green-500 placeholder-stone-500 text-white transition-all"
                        />
                    </div>
                </div>

                {/* Total with Tip */}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-6 mb-8 border border-green-500/30">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-stone-300 text-lg">Total with Tip</p>
                            <p className="text-5xl font-bold text-white mt-2">${getTotal()}</p>
                        </div>
                        {(selectedOption !== null || customTip) && (
                            <div className="text-right">
                                <p className="text-green-400 text-lg">Tip Amount</p>
                                <p className="text-3xl font-bold text-green-400 mt-2">${getTipAmount()}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleNoTip}
                        className="py-6 bg-white/5 hover:bg-white/10 text-stone-300 rounded-2xl text-2xl font-semibold border-2 border-white/20 transition-all active:scale-95"
                    >
                        No Tip
                    </button>
                    <button
                        onClick={onClose}
                        className="py-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-2xl text-2xl font-bold shadow-lg hover:shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all active:scale-95"
                    >
                        Continue
                    </button>
                </div>
            </div>

            {/* Footer hint */}
            <p className="text-stone-500 text-lg mt-8">Your cashier will process the payment</p>
        </div>
    )
}

