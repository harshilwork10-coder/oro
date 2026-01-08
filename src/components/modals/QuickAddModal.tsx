import { useState, useEffect } from 'react'
import { X, DollarSign, ArrowLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface QuickAddModalProps {
    onAdd: (price: number, taxType: 'NO_TAX' | 'HIGH_TAX' | 'LOW_TAX' | 'EBT') => void
    onClose: () => void
}

export default function QuickAddModal({ onAdd, onClose }: QuickAddModalProps) {
    const [value, setValue] = useState('')

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
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [value])

    const handleInput = (key: string) => {
        if (key === 'backspace') {
            setValue(prev => prev.slice(0, -1))
        } else if (key === 'clear') {
            setValue('')
        } else if (key === '.') {
            if (!value.includes('.')) setValue(prev => prev + '.')
        } else {
            // Prevent too many decimals
            if (value.includes('.') && value.split('.')[1].length >= 2) return
            // Prevent ridiculous amounts
            if (value.length > 8) return

            setValue(prev => prev + key)
        }
    }

    const price = parseFloat(value) || 0

    const handleInitialAdd = (type: 'NO_TAX' | 'HIGH_TAX' | 'LOW_TAX' | 'EBT') => {
        if (price <= 0) return
        onAdd(price, type)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-stone-900 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-stone-800 flex justify-between items-center bg-stone-900">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-emerald-500" />
                        Quick Add Item
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-stone-800 rounded-full text-stone-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Display */}
                <div className="p-6 bg-stone-950 flex flex-col items-center justify-center border-b border-stone-800">
                    <div className="text-stone-400 text-sm font-medium mb-1">ENTER PRICE</div>
                    <div className="text-5xl font-bold text-white tracking-tight">
                        {value ? `$${value}` : '$0.00'}
                    </div>
                </div>

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {/* Keypad */}
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
                            onClick={() => handleInput('backspace')}
                            className="h-16 rounded-xl bg-red-900/20 hover:bg-red-900/40 border border-red-900/30 text-red-500 flex items-center justify-center transition-colors"
                        >
                            <ArrowLeft className="w-8 h-8" />
                        </button>
                    </div>

                    {/* Tax Options (Action Buttons) */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                            onClick={() => handleInitialAdd('NO_TAX')}
                            disabled={price <= 0}
                            className="h-14 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/30 text-emerald-400 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            NO TAX
                        </button>
                        <button
                            onClick={() => handleInitialAdd('HIGH_TAX')}
                            disabled={price <= 0}
                            className="h-14 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            HIGH TAX
                        </button>
                        <button
                            onClick={() => handleInitialAdd('LOW_TAX')}
                            disabled={price <= 0}
                            className="h-14 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-400 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            LOW TAX
                        </button>
                        <button
                            onClick={() => handleInitialAdd('EBT')}
                            disabled={price <= 0}
                            className="h-14 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 text-purple-400 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            EBT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

