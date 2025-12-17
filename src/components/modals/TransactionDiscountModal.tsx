'use client'

import { useState, useEffect } from 'react'
import { X, Percent, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TransactionDiscountModalProps {
    subtotal: number
    onApply: (type: 'PERCENT' | 'AMOUNT', value: number) => void
    onClose: () => void
}

export default function TransactionDiscountModal({ subtotal, onApply, onClose }: TransactionDiscountModalProps) {
    const [value, setValue] = useState('')
    const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT')

    // Handle keyboard input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= '0' && e.key <= '9') {
                handleInput(e.key)
            } else if (e.key === 'Backspace') {
                handleInput('backspace')
            } else if (e.key === 'Escape') {
                onClose()
            } else if (e.key === '.') {
                handleInput('.')
            } else if (e.key === 'Enter' && parseFloat(value) > 0) {
                onApply(discountType, parseFloat(value))
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [value, discountType])

    const handleInput = (key: string) => {
        if (key === 'backspace') {
            setValue(prev => prev.slice(0, -1))
        } else if (key === 'clear') {
            setValue('')
        } else if (key === '.') {
            if (!value.includes('.')) setValue(prev => prev + '.')
        } else {
            if (value.includes('.') && value.split('.')[1].length >= 2) return
            if (value.length > 8) return
            setValue(prev => prev + key)
        }
    }

    const numericValue = parseFloat(value) || 0
    const previewDiscount = discountType === 'PERCENT'
        ? subtotal * (numericValue / 100)
        : numericValue

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-900">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Percent className="w-6 h-6 text-orange-500" />
                        Transaction Discount
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Discount Type Toggle */}
                <div className="p-4 flex gap-2 bg-stone-950">
                    <button
                        onClick={() => setDiscountType('PERCENT')}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${discountType === 'PERCENT'
                                ? 'bg-orange-600 text-white'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            }`}
                    >
                        <Percent className="w-5 h-5" />
                        Percent Off
                    </button>
                    <button
                        onClick={() => setDiscountType('AMOUNT')}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${discountType === 'AMOUNT'
                                ? 'bg-orange-600 text-white'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            }`}
                    >
                        <DollarSign className="w-5 h-5" />
                        Fixed Amount
                    </button>
                </div>

                {/* Display */}
                <div className="p-6 bg-stone-950 flex flex-col items-center justify-center border-b border-stone-800">
                    <div className="text-stone-400 text-sm font-medium mb-1">
                        {discountType === 'PERCENT' ? 'DISCOUNT PERCENTAGE' : 'DISCOUNT AMOUNT'}
                    </div>
                    <div className="text-5xl font-bold text-white tracking-tight">
                        {discountType === 'PERCENT' ? `${value || '0'}%` : `$${value || '0.00'}`}
                    </div>
                    {numericValue > 0 && (
                        <div className="mt-3 text-lg text-orange-400">
                            Saves: {formatCurrency(previewDiscount)}
                        </div>
                    )}
                </div>

                {/* Keypad */}
                <div className="p-4 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleInput(num.toString())}
                                className="h-16 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-2xl font-bold text-white transition-colors"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={() => handleInput('.')}
                            className="h-16 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-2xl font-bold text-white transition-colors"
                        >
                            .
                        </button>
                        <button
                            onClick={() => handleInput('0')}
                            className="h-16 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 text-2xl font-bold text-white transition-colors"
                        >
                            0
                        </button>
                        <button
                            onClick={() => handleInput('clear')}
                            className="h-16 rounded-xl bg-red-900/20 hover:bg-red-900/40 border border-red-900/30 text-red-500 font-bold transition-colors"
                        >
                            C
                        </button>
                    </div>

                    {/* Quick Percentages (only show for percent mode) */}
                    {discountType === 'PERCENT' && (
                        <div className="grid grid-cols-4 gap-2 mt-4">
                            {[5, 10, 15, 20].map((pct) => (
                                <button
                                    key={pct}
                                    onClick={() => setValue(pct.toString())}
                                    className="py-3 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-600/30 text-orange-400 font-bold transition-colors"
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        <button
                            onClick={onClose}
                            className="py-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (numericValue > 0) {
                                    onApply(discountType, numericValue)
                                }
                            }}
                            disabled={numericValue <= 0}
                            className="py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Apply Discount
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
