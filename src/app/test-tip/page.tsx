'use client'

import { useState } from 'react'
import TipModal from '@/components/kiosk/TipModal'

export default function TestTipPage() {
    const [showTipModal, setShowTipModal] = useState(true)
    const [tipAmount, setTipAmount] = useState(0)
    const subtotal = 125.50 // Example subtotal

    const handleTipSelected = (amount: number) => {
        setTipAmount(amount)
        console.log('Tip selected:', amount)
    }

    const handleClose = () => {
        setShowTipModal(false)
        console.log('Final tip amount:', tipAmount)
    }

    const handleReset = () => {
        setShowTipModal(true)
        setTipAmount(0)
    }

    return (
        <div className="min-h-screen bg-stone-900 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-6">Tip Modal Test</h1>
                <div className="space-y-4 mb-8">
                    <div className="text-stone-300">
                        <p className="text-sm uppercase tracking-wider mb-1">Service Subtotal</p>
                        <p className="text-4xl font-bold text-white">${subtotal.toFixed(2)}</p>
                    </div>
                    {tipAmount > 0 && !showTipModal && (
                        <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4">
                            <p className="text-sm text-green-400 mb-1">Selected Tip</p>
                            <p className="text-3xl font-bold text-green-400">${tipAmount.toFixed(2)}</p>
                            <p className="text-lg text-white mt-2">
                                Total: ${(subtotal + tipAmount).toFixed(2)}
                            </p>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleReset}
                    className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-xl hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all"
                >
                    {showTipModal ? 'Modal is Open' : 'Open Tip Modal'}
                </button>
            </div>

            <TipModal
                isOpen={showTipModal}
                subtotal={subtotal}
                onTipSelected={handleTipSelected}
                onClose={handleClose}
            />
        </div>
    )
}

