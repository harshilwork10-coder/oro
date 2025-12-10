'use client'

import { ThumbsUp, Calendar, Gift, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ThankYouProps {
    onComplete: () => void
}

export default function ThankYou({ onComplete }: ThankYouProps) {
    const [showPreBook, setShowPreBook] = useState(false)

    // After 3 seconds, show the pre-book offer
    useEffect(() => {
        const preBookTimer = setTimeout(() => setShowPreBook(true), 3000)
        return () => clearTimeout(preBookTimer)
    }, [])

    // Auto-reset after 15 seconds total (to give time for pre-book interaction)
    useEffect(() => {
        const timer = setTimeout(onComplete, 15000)
        return () => clearTimeout(timer)
    }, [onComplete])

    // Show pre-book offer
    if (showPreBook) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6 text-white text-center animate-in fade-in duration-500">
                <div className="max-w-lg w-full space-y-8">
                    {/* Success checkmark */}
                    <div className="mx-auto w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                        <ThumbsUp className="h-10 w-10 text-emerald-400" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">Thank You!</h1>
                        <p className="text-stone-400">We appreciate your visit</p>
                    </div>

                    {/* Pre-book offer card */}
                    <div className="bg-gradient-to-br from-orange-600 to-amber-600 rounded-3xl p-8 shadow-2xl mt-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Calendar className="h-8 w-8" />
                            <Gift className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Book Your Next Visit!</h2>
                        <p className="text-orange-100 mb-6">
                            Pre-book now and get <span className="font-bold text-white">10% OFF</span> your next service
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    // TODO: Open booking flow
                                    alert('Booking flow coming soon!')
                                }}
                                className="py-4 px-6 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                            >
                                Book Now
                                <ChevronRight className="h-5 w-5" />
                            </button>
                            <button
                                onClick={onComplete}
                                className="py-4 px-6 bg-orange-700/50 text-white rounded-xl font-semibold hover:bg-orange-700 transition-all"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>

                    <p className="text-stone-500 text-sm">
                        This offer expires in 24 hours
                    </p>
                </div>
            </div>
        )
    }

    // Initial thank you screen
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in duration-500">
            <div className="max-w-md w-full space-y-8">
                <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <ThumbsUp className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-5xl font-bold">Thank You!</h1>
                <p className="text-2xl text-green-100">We appreciate your business!</p>
                <div className="pt-8">
                    <div className="inline-block px-6 py-2 bg-white/20 rounded-full text-green-100">
                        🎉 Payment Successful
                    </div>
                </div>
            </div>
        </div>
    )
}
