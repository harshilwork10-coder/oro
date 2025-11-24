'use client'

import { useState, useEffect } from 'react'
import { Lock, Delete, User } from 'lucide-react'

interface LockScreenProps {
    isOpen: boolean
    onUnlock: (pin: string) => Promise<boolean>
    user?: {
        name: string | null
        image: string | null
    }
}

export default function LockScreen({ isOpen, onUnlock, user }: LockScreenProps) {
    const [pin, setPin] = useState('')
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!isOpen) {
            setPin('')
            setError(false)
        }
    }, [isOpen])

    const handleNumberClick = (num: number) => {
        if (pin.length < 4) {
            setPin(prev => prev + num)
            setError(false)
        }
    }

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1))
        setError(false)
    }

    const handleSubmit = async () => {
        if (pin.length !== 4) return

        setLoading(true)
        try {
            const success = await onUnlock(pin)
            if (!success) {
                setError(true)
                setPin('')
            }
        } catch (err) {
            setError(true)
            setPin('')
        } finally {
            setLoading(false)
        }
    }

    // Auto-submit when 4 digits are entered
    useEffect(() => {
        if (pin.length === 4) {
            handleSubmit()
        }
    }, [pin])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-700">
                        {user?.image ? (
                            <img src={user.image} alt={user.name || 'User'} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User className="h-10 w-10 text-slate-400" />
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        {user?.name || 'Employee Login'}
                    </h2>
                    <p className="text-slate-400">Enter your 4-digit PIN to unlock</p>
                </div>

                {/* PIN Display */}
                <div className="flex justify-center gap-4 mb-8">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                                    ? error
                                        ? 'bg-red-500 scale-125'
                                        : 'bg-blue-500 scale-125'
                                    : 'bg-slate-700'
                                }`}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-red-500 text-center mb-6 animate-pulse">
                        Incorrect PIN. Please try again.
                    </p>
                )}

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            disabled={loading}
                            className="h-20 rounded-2xl bg-slate-800 text-white text-2xl font-semibold hover:bg-slate-700 active:bg-slate-600 transition-all shadow-lg border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {num}
                        </button>
                    ))}
                    <div className="h-20" /> {/* Empty slot */}
                    <button
                        onClick={() => handleNumberClick(0)}
                        disabled={loading}
                        className="h-20 rounded-2xl bg-slate-800 text-white text-2xl font-semibold hover:bg-slate-700 active:bg-slate-600 transition-all shadow-lg border-b-4 border-slate-950 active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading || pin.length === 0}
                        className="h-20 rounded-2xl bg-slate-800/50 text-red-400 text-2xl font-semibold hover:bg-slate-800 hover:text-red-300 active:bg-slate-700 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Delete className="h-8 w-8" />
                    </button>
                </div>

                <div className="mt-12 text-center">
                    <button className="text-slate-500 hover:text-white transition-colors text-sm flex items-center justify-center gap-2 mx-auto">
                        <Lock className="h-4 w-4" />
                        Forgot PIN? Ask your manager
                    </button>
                </div>
            </div>
        </div>
    )
}
