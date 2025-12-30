'use client'

import { useState } from 'react'
import { Lock, Check, X } from 'lucide-react'

interface SetPinModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function SetPinModal({ isOpen, onClose, onSuccess }: SetPinModalProps) {
    const [pin, setPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const [step, setStep] = useState<'enter' | 'confirm'>('enter')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleNumberClick = (num: number) => {
        if (step === 'enter') {
            if (pin.length < 4) {
                setPin(prev => prev + num)
                setError('')
            }
        } else {
            if (confirmPin.length < 4) {
                setConfirmPin(prev => prev + num)
                setError('')
            }
        }
    }

    const handleDelete = () => {
        if (step === 'enter') {
            setPin(prev => prev.slice(0, -1))
        } else {
            setConfirmPin(prev => prev.slice(0, -1))
        }
        setError('')
    }

    const handleContinue = () => {
        if (pin.length !== 4) {
            setError('PIN must be exactly 4 digits')
            return
        }

        // Check for repeating digits
        if (/^(\d)\1{3}$/.test(pin)) {
            setError('PIN cannot be all the same digit')
            return
        }

        setStep('confirm')
    }

    const handleSubmit = async () => {
        if (confirmPin !== pin) {
            setError('PINs do not match')
            setConfirmPin('')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/user/pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            })

            if (res.ok) {
                onSuccess()
                handleReset()
                onClose()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to set PIN')
            }
        } catch (err) {
            setError('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleReset = () => {
        setPin('')
        setConfirmPin('')
        setStep('enter')
        setError('')
    }

    const handleBack = () => {
        setConfirmPin('')
        setStep('enter')
        setError('')
    }

    const currentPin = step === 'enter' ? pin : confirmPin

    // Auto-submit when both PINs are complete
    if (confirmPin.length === 4 && !loading) {
        handleSubmit()
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        {step === 'enter' ? 'Set Your PIN' : 'Confirm Your PIN'}
                    </h2>
                    <p className="text-gray-600">
                        {step === 'enter'
                            ? 'Choose a 4-digit PIN for lock terminal'
                            : 'Enter your PIN again to confirm'}
                    </p>
                </div>

                {/* PIN Display */}
                <div className="flex justify-center gap-4 mb-6">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < currentPin.length
                                    ? error
                                        ? 'bg-red-500 scale-125'
                                        : 'bg-blue-500 scale-125'
                                    : 'bg-gray-300'
                                }`}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-red-500 text-center mb-4 text-sm animate-pulse">
                        {error}
                    </p>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            disabled={loading}
                            className="h-16 rounded-xl bg-gray-100 text-gray-900 text-xl font-semibold hover:bg-gray-200 active:bg-gray-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {num}
                        </button>
                    ))}
                    {step === 'confirm' && (
                        <button
                            onClick={handleBack}
                            className="h-16 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-all"
                        >
                            Back
                        </button>
                    )}
                    {step === 'enter' && <div className="h-16" />}
                    <button
                        onClick={() => handleNumberClick(0)}
                        disabled={loading}
                        className="h-16 rounded-xl bg-gray-100 text-gray-900 text-xl font-semibold hover:bg-gray-200 active:bg-gray-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading || currentPin.length === 0}
                        className="h-16 rounded-xl bg-gray-100 text-red-500 hover:bg-red-50 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                    {step === 'enter' && (
                        <button
                            onClick={handleContinue}
                            disabled={pin.length !== 4}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

