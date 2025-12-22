'use client'

import { useState, useEffect } from 'react'
import { Star, Check, ChevronRight, ThumbsUp, ShieldCheck, AlertTriangle } from 'lucide-react'
import OroLogo from '@/components/ui/OroLogo'
import clsx from 'clsx'

interface ReviewProps {
    onComplete: () => void
    locationId?: string
    transactionId?: string
    clientId?: string
}

export default function Review({ onComplete, locationId, transactionId, clientId }: ReviewProps) {
    const [step, setStep] = useState<'rating' | 'feedback' | 'redirect' | 'done' | 'internal'>('rating')
    const [rating, setRating] = useState(0)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [countdown, setCountdown] = useState(5)

    // Fetch location's Google Place ID
    useEffect(() => {
        if (locationId) {
            fetch(`/api/location/${locationId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.googlePlaceId) {
                        setGooglePlaceId(data.googlePlaceId)
                    }
                })
                .catch(console.error)
        }
    }, [locationId])

    // Countdown for Google redirect
    useEffect(() => {
        if (step === 'redirect' && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        } else if (step === 'redirect' && countdown === 0 && googlePlaceId) {
            window.open(`https://search.google.com/local/writereview?placeid=${googlePlaceId}`, '_blank')
            setStep('done')
        }
    }, [step, countdown, googlePlaceId])

    // Auto-close after done
    useEffect(() => {
        if (step === 'done' || step === 'internal') {
            const timer = setTimeout(onComplete, 5000)
            return () => clearTimeout(timer)
        }
    }, [step, onComplete])

    const FEEDBACK_OPTIONS: Record<number, string[]> = {
        5: ['✨ Amazing Service', '💈 Love my new look!', '👨‍💼 Professional Staff', '🌟 Best Experience!', '💯 Highly Recommend'],
        4: ['👍 Great Service', '😊 Friendly Staff', '🧹 Clean Facility', '⭐ Good Value', '👌 Nice Atmosphere'],
        3: ['⏰ Wait Time', '💰 Price', '🧹 Cleanliness', '💬 Communication', '🤷 Service Quality'],
        2: ['⏰ Long Wait', '💰 Too Expensive', '🧹 Cleanliness Issues', '😐 Staff Behavior', '👎 Poor Service'],
        1: ['⏰ Very Long Wait', '💰 Overpriced', '🧹 Not Clean', '😤 Rude Staff', '❌ Terrible Experience']
    }

    const currentFeedbackTags = FEEDBACK_OPTIONS[rating] || FEEDBACK_OPTIONS[5]

    const handleRating = (stars: number) => {
        setRating(stars)
        setSelectedTags([])
        setTimeout(() => setStep('feedback'), 400)
    }

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag))
        } else {
            setSelectedTags([...selectedTags, tag])
        }
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)

        try {
            // Submit review to API
            if (locationId) {
                await fetch('/api/pos/review', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        locationId,
                        rating,
                        feedbackTag: selectedTags.join(', '),
                        transactionId,
                        clientId
                    })
                })
            }

            // Reset kiosk status
            await fetch('/api/pos/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [],
                    subtotal: 0,
                    tax: 0,
                    total: 0,
                    status: 'IDLE'
                })
            })
        } catch (error) {
            console.error('Error submitting review:', error)
        } finally {
            setIsSubmitting(false)
        }

        // 4-5 stars with Google configured -> redirect to Google
        if (rating >= 4 && googlePlaceId) {
            setStep('redirect')
        }
        // 1-3 stars -> internal capture, thank customer
        else if (rating <= 3) {
            setStep('internal')
        }
        // 4-5 stars without Google -> just thank
        else {
            setStep('done')
        }
    }

    // Internal feedback screen (1-3 stars)
    if (step === 'internal') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in duration-500">
                <div className="max-w-md w-full space-y-8">
                    <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="h-12 w-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold">We Hear You</h1>
                    <p className="text-xl text-blue-100">
                        Thank you for your honest feedback. Our manager has been notified and will review your concerns.
                    </p>
                    <p className="text-sm text-blue-200">
                        We're committed to improving your experience.
                    </p>
                </div>
            </div>
        )
    }

    // Google redirect countdown screen
    if (step === 'redirect') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in duration-500">
                <div className="max-w-md w-full space-y-8">
                    <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6">
                        <ThumbsUp className="h-12 w-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold">Thank You! 🎉</h1>
                    <p className="text-xl text-green-100">
                        Would you mind sharing your experience on Google?
                    </p>
                    <p className="text-3xl font-bold">
                        Opening in {countdown}...
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => {
                                if (googlePlaceId) {
                                    window.open(`https://search.google.com/local/writereview?placeid=${googlePlaceId}`, '_blank')
                                }
                                setStep('done')
                            }}
                            className="px-8 py-3 bg-white text-green-600 rounded-xl font-bold hover:bg-green-50 transition-colors"
                        >
                            Open Now
                        </button>
                        <button
                            onClick={() => setStep('done')}
                            className="px-8 py-3 bg-green-400/30 text-white rounded-xl font-medium hover:bg-green-400/40 transition-colors"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Thank you screen
    if (step === 'done') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in duration-500">
                <div className="max-w-md w-full space-y-8">
                    <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6">
                        <ThumbsUp className="h-12 w-12 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold">Thank You!</h1>
                    <p className="text-xl text-green-100">We appreciate your feedback. Have a wonderful day!</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-6 shadow-sm flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                        <OroLogo size={24} />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Rate Your Visit
                    </span>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 min-h-[500px] flex flex-col">

                    {/* Progress Steps */}
                    <div className="flex justify-center gap-2 mb-8">
                        {['rating', 'feedback'].map((s, i) => (
                            <div
                                key={s}
                                className={clsx(
                                    "h-2 rounded-full transition-all duration-300",
                                    step === s || (step === 'feedback' && i === 0)
                                        ? "w-8 bg-blue-500"
                                        : "w-2 bg-gray-200"
                                )}
                            />
                        ))}
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        {step === 'rating' && (
                            <div className="text-center space-y-8 animate-in fade-in slide-in-from-right duration-300">
                                <div>
                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">How was your visit?</h2>
                                    <p className="text-gray-500">Tap the stars to rate your experience</p>
                                </div>

                                <div className="flex justify-center gap-3">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => handleRating(star)}
                                            className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                                        >
                                            <Star
                                                className={clsx(
                                                    "h-14 w-14 transition-colors duration-300",
                                                    star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>

                                <div className="h-8 text-xl font-medium">
                                    {rating === 5 && <span className="text-yellow-500">Amazing! 🌟</span>}
                                    {rating === 4 && <span className="text-green-500">Great! 😊</span>}
                                    {rating === 3 && <span className="text-blue-500">Good 👍</span>}
                                    {rating === 2 && <span className="text-orange-500">Fair 😐</span>}
                                    {rating === 1 && <span className="text-red-500">Poor 😞</span>}
                                </div>
                            </div>
                        )}

                        {step === 'feedback' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                                <div className="text-center">
                                    <div className="flex justify-center gap-1 mb-3">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                className={clsx(
                                                    "h-6 w-6",
                                                    star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                                        {rating >= 4 ? 'What did you love?' : 'How can we improve?'}
                                    </h2>
                                    <p className="text-gray-500 text-sm">Select all that apply (optional)</p>
                                </div>

                                <div className="flex flex-wrap justify-center gap-2">
                                    {currentFeedbackTags.map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={clsx(
                                                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2",
                                                selectedTags.includes(tag)
                                                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm scale-105"
                                                    : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                                            )}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                                    <Check className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

