'use client'

import { useState, useEffect } from 'react'
import { DollarSign, AlertTriangle } from 'lucide-react'

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

// Validation limits
const MAX_TIP_PERCENT = 100 // Max 100% tip
const MAX_TIP_DOLLAR = 500  // Max $500 tip

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
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showNoTipConfirm, setShowNoTipConfirm] = useState(false)
    const [tipError, setTipError] = useState<string | null>(null)

    // Reset state when modal opens (fix for stale state)
    useEffect(() => {
        if (isOpen) {
            setSelectedOption(null)
            setCustomTip('')
            setIsSubmitting(false)
            setShowNoTipConfirm(false)
            setTipError(null)
        }
    }, [isOpen])

    if (!isOpen) return null

    const tipOptions = suggestions || (tipType === 'PERCENT' ? DEFAULT_PERCENTAGES : DEFAULT_DOLLARS)

    const handleOptionClick = (value: number) => {
        setSelectedOption(value)
        setCustomTip('')
        setTipError(null)
        setShowNoTipConfirm(false)
    }

    const handleCustomTipChange = (value: string) => {
        const numValue = parseFloat(value) || 0

        // Validate: no negative numbers
        if (numValue < 0) {
            setTipError('Tip cannot be negative')
            return
        }

        // Validate: max limit
        const maxTip = tipType === 'PERCENT'
            ? subtotal * (MAX_TIP_PERCENT / 100)
            : MAX_TIP_DOLLAR

        if (numValue > maxTip) {
            setTipError(`Maximum tip is $${maxTip.toFixed(2)}`)
            return
        }

        setTipError(null)
        setCustomTip(value)
        setSelectedOption(null)
        setShowNoTipConfirm(false)
    }

    const getTipAmount = () => {
        if (selectedOption !== null) {
            return tipType === 'PERCENT'
                ? subtotal * (selectedOption / 100)
                : selectedOption
        }
        if (customTip) {
            const parsed = parseFloat(customTip) || 0
            return Math.max(0, parsed) // Ensure non-negative
        }
        return 0
    }

    const getTotal = () => {
        return subtotal + getTipAmount()
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

    // Submit tip with double-click protection
    const handleSubmitTip = async (tipAmount: number) => {
        // Prevent double submission
        if (isSubmitting) return

        setIsSubmitting(true)

        try {
            await onTipSelected(tipAmount)
        } catch (error) {
            console.error('Error submitting tip:', error)
            // Reset on error so user can retry
            setIsSubmitting(false)
        }
        // Keep isSubmitting true - display page will handle next state
    }

    // Handle Continue button - check if tip is zero
    const handleContinueClick = () => {
        const tipAmount = getTipAmount()

        if (tipAmount === 0 && !showNoTipConfirm) {
            // Show confirmation for no tip
            setShowNoTipConfirm(true)
            return
        }

        handleSubmitTip(tipAmount)
    }

    // Show processing state after submission
    if (isSubmitting) {
        return (
            <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col items-center justify-center p-8">
                <div className="animate-spin h-16 w-16 border-4 border-orange-500 border-t-transparent rounded-full mb-6"></div>
                <h2 className="text-3xl font-bold text-white mb-2">Processing...</h2>
                <p className="text-stone-400 text-xl">Please wait while we process your payment</p>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            {/* Header with Logo */}
            <div className="w-full max-w-2xl mb-6 text-center">
                <div className="flex justify-center mb-4">
                    <img src="/oronext-logo.jpg" alt="OroNext" className="h-16 object-contain" />
                </div>
                <h1 className="text-5xl font-bold text-white mb-4">Add a Tip?</h1>
                <p className="text-2xl text-stone-400">Your service provider would greatly appreciate it!</p>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-2xl bg-stone-900 rounded-3xl p-10 shadow-2xl border border-stone-700">
                {/* Amount Display */}
                <div className="mb-10 text-center">
                    <p className="text-stone-400 text-xl mb-2">Service Total</p>
                    <p className="text-6xl font-bold text-emerald-400">${subtotal.toFixed(2)}</p>
                </div>

                {/* Tip Option Buttons - Orange theme */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {tipOptions.map((value) => {
                        const formatted = formatOption(value)
                        return (
                            <button
                                key={value}
                                onClick={() => handleOptionClick(value)}
                                disabled={isSubmitting}
                                className={`py-8 rounded-2xl text-3xl font-bold transition-all transform active:scale-95 disabled:opacity-50 ${selectedOption === value
                                    ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-[0_0_40px_rgba(249,115,22,0.5)] scale-105'
                                    : 'bg-stone-800 text-white hover:bg-stone-700 border-2 border-stone-600'
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
                            inputMode="decimal"
                            min="0"
                            max={MAX_TIP_DOLLAR}
                            step="0.01"
                            placeholder="0.00"
                            value={customTip}
                            onChange={(e) => handleCustomTipChange(e.target.value)}
                            disabled={isSubmitting}
                            className="w-full pl-16 pr-6 py-6 text-3xl bg-stone-800 border-2 border-stone-600 rounded-2xl focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 placeholder-stone-500 text-white transition-all disabled:opacity-50"
                        />
                    </div>
                    {tipError && (
                        <div className="mt-3 flex items-center gap-2 text-red-400">
                            <AlertTriangle className="h-5 w-5" />
                            <span>{tipError}</span>
                        </div>
                    )}
                </div>

                {/* Total with Tip */}
                <div className="bg-stone-800 rounded-2xl p-6 mb-8 border border-stone-700">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-stone-400 text-lg">Total with Tip</p>
                            <p className="text-5xl font-bold text-emerald-400 mt-2">${getTotal().toFixed(2)}</p>
                        </div>
                        {(selectedOption !== null || customTip) && (
                            <div className="text-right">
                                <p className="text-orange-400 text-lg">Tip Amount</p>
                                <p className="text-3xl font-bold text-orange-400 mt-2">${getTipAmount().toFixed(2)}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* No Tip Confirmation */}
                {showNoTipConfirm && (
                    <div className="mb-6 p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl text-center animate-in fade-in duration-200">
                        <p className="text-amber-300 text-xl font-medium">Continue without adding a tip?</p>
                        <p className="text-amber-400/70 text-sm mt-1">Tap Continue again to confirm</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleSubmitTip(0)}
                        disabled={isSubmitting}
                        className="py-6 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-2xl text-2xl font-semibold border-2 border-stone-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                        No Tip
                    </button>
                    <button
                        onClick={handleContinueClick}
                        disabled={isSubmitting || !!tipError}
                        className={`py-6 rounded-2xl text-2xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 ${showNoTipConfirm
                            ? 'bg-amber-500 hover:bg-amber-400 text-black'
                            : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white hover:shadow-[0_0_40px_rgba(249,115,22,0.4)]'
                            }`}
                    >
                        {showNoTipConfirm ? 'Confirm No Tip' : 'Continue'}
                    </button>
                </div>
            </div>

            {/* Footer hint */}
            <p className="text-stone-500 text-lg mt-8">Your cashier will complete the transaction</p>
        </div>
    )
}

