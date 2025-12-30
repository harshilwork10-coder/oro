'use client'

import { useState, useEffect } from 'react'
import { Star, CheckCircle, ThumbsUp } from 'lucide-react'

interface ReviewPromptProps {
    locationId: string
    transactionId?: string
    clientId?: string
    onComplete: () => void
}

const feedbackTags: Record<number, string[]> = {
    5: ['✨ Amazing experience!', '💈 Best service ever!', '⭐ Highly recommend!', '💯 Perfect!'],
    4: ['👍 Great service!', '😊 Very friendly staff', '🎯 Will come back!', '💇 Love my new look!'],
    3: ['👌 Good service', '😐 It was okay', '🕐 A bit slow today'],
    2: ['😕 Needs improvement', '⏰ Long wait', '💬 Communication issues'],
    1: ['😞 Very disappointed', '❌ Not satisfied', '👎 Would not recommend']
}

export default function ReviewPrompt({ locationId, transactionId, clientId, onComplete }: ReviewPromptProps) {
    const [rating, setRating] = useState(0)
    const [hoveredRating, setHoveredRating] = useState(0)
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [step, setStep] = useState<'rating' | 'feedback' | 'redirect' | 'thanks'>('rating')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [googleUrl, setGoogleUrl] = useState<string | null>(null)
    const [countdown, setCountdown] = useState(5)

    // Auto-complete after 10 seconds on thanks screen
    useEffect(() => {
        if (step === 'thanks' || step === 'redirect') {
            const timer = setTimeout(() => {
                onComplete()
            }, 8000)
            return () => clearTimeout(timer)
        }
    }, [step, onComplete])

    // Countdown for redirect
    useEffect(() => {
        if (step === 'redirect' && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(timer)
        } else if (step === 'redirect' && countdown === 0 && googleUrl) {
            window.open(googleUrl, '_blank')
            setStep('thanks')
        }
    }, [step, countdown, googleUrl])

    const handleRatingSelect = (selectedRating: number) => {
        setRating(selectedRating)
        setSelectedTag(null)
        setStep('feedback')
    }

    const handleSubmit = async (tag?: string) => {
        if (!rating) return

        setIsSubmitting(true)
        try {
            const res = await fetch('/api/pos/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId,
                    rating,
                    feedbackTag: tag || selectedTag,
                    transactionId,
                    clientId
                })
            })

            if (res.ok) {
                const data = await res.json()
                if (data.shouldRedirect && data.googleReviewUrl) {
                    setGoogleUrl(data.googleReviewUrl)
                    setStep('redirect')
                } else {
                    setStep('thanks')
                }
            } else {
                setStep('thanks') // Still show thanks even on error
            }
        } catch (error) {
            console.error('Review submit error:', error)
            setStep('thanks')
        } finally {
            setIsSubmitting(false)
        }
    }

    const displayRating = hoveredRating || rating

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center p-8">
            <div className="max-w-lg w-full">
                {/* Rating Step */}
                {step === 'rating' && (
                    <div className="text-center animate-fade-in">
                        <h1 className="text-3xl font-bold text-white mb-2">
                            How was your experience?
                        </h1>
                        <p className="text-stone-400 mb-8">
                            Tap a star to rate your visit
                        </p>

                        {/* Stars */}
                        <div className="flex justify-center gap-4 mb-8">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => handleRatingSelect(star)}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="transform hover:scale-110 transition-all duration-200"
                                >
                                    <Star
                                        className={`h-16 w-16 transition-colors ${star <= displayRating
                                                ? 'text-yellow-400 fill-yellow-400'
                                                : 'text-stone-600'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>

                        {/* Rating Label */}
                        <div className="h-8 text-xl font-medium">
                            {displayRating === 5 && <span className="text-yellow-400">Amazing! 🌟</span>}
                            {displayRating === 4 && <span className="text-green-400">Great! 😊</span>}
                            {displayRating === 3 && <span className="text-blue-400">Good 👍</span>}
                            {displayRating === 2 && <span className="text-orange-400">Fair 😐</span>}
                            {displayRating === 1 && <span className="text-red-400">Poor 😞</span>}
                        </div>
                    </div>
                )}

                {/* Feedback Step */}
                {step === 'feedback' && (
                    <div className="text-center animate-fade-in">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            What made your visit {rating >= 4 ? 'great' : rating >= 3 ? 'good' : 'less than ideal'}?
                        </h2>
                        <p className="text-stone-400 mb-6">
                            Select one that best describes your experience
                        </p>

                        {/* Selected rating display */}
                        <div className="flex justify-center gap-1 mb-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-8 w-8 ${star <= rating
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-stone-700'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Feedback Tags */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {feedbackTags[rating]?.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => {
                                        setSelectedTag(tag)
                                        handleSubmit(tag)
                                    }}
                                    disabled={isSubmitting}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedTag === tag
                                            ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                                            : 'border-stone-700 bg-stone-800/50 text-stone-300 hover:border-stone-600'
                                        } ${isSubmitting ? 'opacity-50' : ''}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>

                        {/* Skip button */}
                        <button
                            onClick={() => handleSubmit()}
                            disabled={isSubmitting}
                            className="text-stone-500 hover:text-stone-400 transition-colors"
                        >
                            Skip →
                        </button>
                    </div>
                )}

                {/* Redirect Step (4-5 stars with Google configured) */}
                {step === 'redirect' && (
                    <div className="text-center animate-fade-in">
                        <div className="w-24 h-24 rounded-full bg-green-500/20 mx-auto flex items-center justify-center mb-6">
                            <ThumbsUp className="h-12 w-12 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Thank you for the awesome rating!
                        </h2>
                        <p className="text-stone-400 mb-6">
                            Would you mind sharing your experience on Google?
                        </p>
                        <p className="text-2xl font-bold text-green-400 mb-4">
                            Opening Google Reviews in {countdown}...
                        </p>
                        <button
                            onClick={() => {
                                if (googleUrl) window.open(googleUrl, '_blank')
                                setStep('thanks')
                            }}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
                        >
                            Open Now →
                        </button>
                        <br />
                        <button
                            onClick={() => setStep('thanks')}
                            className="mt-4 text-stone-500 hover:text-stone-400 transition-colors"
                        >
                            Skip Google Review
                        </button>
                    </div>
                )}

                {/* Thanks Step */}
                {step === 'thanks' && (
                    <div className="text-center animate-fade-in">
                        <div className="w-24 h-24 rounded-full bg-green-500/20 mx-auto flex items-center justify-center mb-6">
                            <CheckCircle className="h-12 w-12 text-green-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            Thank You!
                        </h2>
                        <p className="text-stone-400 text-lg">
                            We appreciate your feedback
                        </p>
                        <p className="text-stone-600 text-sm mt-4">
                            This screen will close automatically...
                        </p>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
            `}</style>
        </div>
    )
}

