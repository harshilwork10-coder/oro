'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Delete, Check } from 'lucide-react'

interface NumpadModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (value: number) => void
    title: string
    initialValue?: number
    prefix?: string  // e.g., "$"
    allowDecimal?: boolean
    maxValue?: number
}

export default function NumpadModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    initialValue = 0,
    prefix = '$',
    allowDecimal = true,
    maxValue = 99999.99
}: NumpadModalProps) {
    const [display, setDisplay] = useState('')
    const [hasDecimal, setHasDecimal] = useState(false)

    // Initialize display when opened
    useEffect(() => {
        if (isOpen) {
            if (initialValue > 0) {
                setDisplay(initialValue.toFixed(2))
                setHasDecimal(true)
            } else {
                setDisplay('')
                setHasDecimal(false)
            }
        }
    }, [isOpen, initialValue])

    const handleDigit = useCallback((digit: string) => {
        setDisplay(prev => {
            const currentHasDecimal = prev.includes('.')
            if (currentHasDecimal) {
                const parts = prev.split('.')
                if (parts[1] && parts[1].length >= 2) return prev
            }
            const newValue = parseFloat(prev + digit) || 0
            if (newValue > maxValue) return prev
            return prev + digit
        })
    }, [maxValue])

    const handleDecimal = useCallback(() => {
        if (!allowDecimal) return
        setDisplay(prev => {
            if (prev.includes('.')) return prev
            setHasDecimal(true)
            return (prev || '0') + '.'
        })
    }, [allowDecimal])

    const handleBackspace = useCallback(() => {
        setDisplay(prev => {
            if (prev.endsWith('.')) {
                setHasDecimal(false)
            }
            return prev.slice(0, -1)
        })
    }, [])

    const handleClear = useCallback(() => {
        setDisplay('')
        setHasDecimal(false)
    }, [])

    const handleSubmit = useCallback(() => {
        setDisplay(prev => {
            const value = parseFloat(prev) || 0
            onSubmit(value)
            return prev
        })
        onClose()
    }, [onSubmit, onClose])

    const handleQuickAmount = (amount: number) => {
        setDisplay(amount.toFixed(2))
        setHasDecimal(true)
    }

    // Keyboard input support — allows physical keyboard to drive the numpad
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            // Digits 0-9
            if (/^[0-9]$/.test(e.key)) {
                e.preventDefault()
                handleDigit(e.key)
            }
            // Decimal point
            if (e.key === '.' || e.key === ',') {
                e.preventDefault()
                handleDecimal()
            }
            // Backspace / Delete
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault()
                handleBackspace()
            }
            // Enter = submit
            if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
            }
            // Escape = close
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, handleDigit, handleDecimal, handleBackspace, handleSubmit])

    if (!isOpen) return null

    const displayValue = display || '0'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
            <div className="w-full max-w-sm bg-stone-900 rounded-2xl border border-stone-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700">
                    <h2 className="text-lg font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Display */}
                <div className="p-4 bg-stone-950">
                    <div className="text-right text-4xl font-bold text-white font-mono">
                        {prefix}{displayValue}
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-1 p-2 bg-stone-800">
                    {[5, 10, 15, 20].map(amt => (
                        <button
                            key={amt}
                            onClick={() => handleQuickAmount(amt)}
                            className="py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm font-medium text-white"
                        >
                            {prefix}{amt}
                        </button>
                    ))}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-1 p-2">
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map(digit => (
                        <button
                            key={digit}
                            onClick={() => handleDigit(digit)}
                            className="py-6 bg-stone-800 hover:bg-stone-700 rounded-lg text-2xl font-bold text-white transition-colors"
                        >
                            {digit}
                        </button>
                    ))}
                    <button
                        onClick={handleClear}
                        className="py-6 bg-red-600/30 hover:bg-red-600/50 rounded-lg text-lg font-bold text-red-400 transition-colors"
                    >
                        C
                    </button>
                    <button
                        onClick={() => handleDigit('0')}
                        className="py-6 bg-stone-800 hover:bg-stone-700 rounded-lg text-2xl font-bold text-white transition-colors"
                    >
                        0
                    </button>
                    {allowDecimal ? (
                        <button
                            onClick={handleDecimal}
                            className="py-6 bg-stone-800 hover:bg-stone-700 rounded-lg text-2xl font-bold text-white transition-colors"
                        >
                            .
                        </button>
                    ) : (
                        <button
                            onClick={handleBackspace}
                            className="py-6 bg-stone-800 hover:bg-stone-700 rounded-lg text-xl font-bold text-white transition-colors"
                        >
                            <Delete className="h-6 w-6 mx-auto" />
                        </button>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 p-4 border-t border-stone-700">
                    <button
                        onClick={handleBackspace}
                        className="py-4 bg-stone-700 hover:bg-stone-600 rounded-lg flex items-center justify-center gap-2 font-medium text-white"
                    >
                        <Delete className="h-5 w-5" />
                        Backspace
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="py-4 bg-green-600 hover:bg-green-500 rounded-lg flex items-center justify-center gap-2 font-bold text-white"
                    >
                        <Check className="h-5 w-5" />
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
