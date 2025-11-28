'use client'

import { ThumbsUp } from 'lucide-react'
import { useEffect } from 'react'

interface ThankYouProps {
    onComplete: () => void
}

export default function ThankYou({ onComplete }: ThankYouProps) {
    // Auto-reset after 5 seconds
    useEffect(() => {
        const timer = setTimeout(onComplete, 5000)
        return () => clearTimeout(timer)
    }, [onComplete])

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in duration-500">
            <div className="max-w-md w-full space-y-8">
                <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6">
                    <ThumbsUp className="h-12 w-12 text-white" />
                </div>
                <h1 className="text-4xl font-bold">Thank You!</h1>
                <p className="text-xl text-green-100">We appreciate your business. Have a wonderful day!</p>
            </div>
        </div>
    )
}
