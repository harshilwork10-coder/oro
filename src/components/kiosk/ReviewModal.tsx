'use client'

import { useState } from 'react'
import { Star, Check, Sparkles } from 'lucide-react'

interface ReviewModalProps {
    isOpen: boolean
    clientName: string
    onSubmit: (rating: number, feedbackTag: string | null) => void
    onSkip: () => void
}

const FEEDBACK_TAGS = {
    5: ["Amazing service! ⭐", "Outstanding! 🌟", "Perfect experience! ✨"],
    4: ["Great service! 👍", "Very good! 😊"],
    3: ["Good service ✓", "Satisfied 👌"],
    2: ["Needs improvement 📝"],
    1: ["Poor experience 😔"]
}

export default function ReviewModal({ isOpen, clientName, onSubmit, onSkip }: ReviewModalProps) {
    const [rating, setRating] = useState<number | null>(null)
    const [hoveredRating, setHoveredRating] = useState<number | null>(null)
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)

    if (!isOpen) return null

    const handleRatingClick = (stars: number) => {
        setRating(stars)
        setSelectedTag(null)
    }

    const handleSubmit = () => {
        if (rating) {
            setShowSuccess(true)
            setTimeout(() => {
                onSubmit(rating, selectedTag)
                // Reset for next use
                setRating(null)
                setSelectedTag(null)
                setShowSuccess(false)
            }, 2000)
        }
    }

    const handleSkip = () => {
        setRating(null)
        setSelectedTag(null)
        setShowSuccess(false)
        onSkip()
    }

    if (showSuccess) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-purple-950 to-pink-900 z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
                <div className="text-center animate-in zoom-in duration-500">
                    <div className="mx-auto w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(34,197,94,0.6)]">
                        <Check className="h-20 w-20 text-white" strokeWidth={3} />
                    </div>
                    <h1 className="text-6xl font-bold text-white mb-4">Thank You!</h1>
                    <p className="text-3xl text-purple-200">Your feedback has been saved</p>
                </div>
            </div>
        )
    }

    const displayRating = hoveredRating || rating || 0
    const availableTags = rating ? FEEDBACK_TAGS[rating as keyof typeof FEEDBACK_TAGS] : []

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-950 to-pink-900 z-50 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="w-full max-w-3xl mb-8 text-center">
                <div className="mb-4">
                    <Sparkles className="h-16 w-16 text-yellow-400 mx-auto animate-pulse" />
                </div>
                <h1 className="text-5xl font-bold text-white mb-4">How was your experience?</h1>
                <p className="text-2xl text-purple-200">We'd love to hear from you, {clientName}!</p>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-3xl bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20">
                {/* Star Rating */}
                <div className="flex justify-center gap-6 mb-12">
                    {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                            key={stars}
                            onClick={() => handleRatingClick(stars)}
                            onMouseEnter={() => setHoveredRating(stars)}
                            onMouseLeave={() => setHoveredRating(null)}
                            className="transition-all transform hover:scale-110 active:scale-95"
                        >
                            <Star
                                className={`h-24 w-24 transition-all ${stars <= displayRating
                                        ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]'
                                        : 'fill-none text-white/30'
                                    }`}
                                strokeWidth={2}
                            />
                        </button>
                    ))}
                </div>

                {/* Rating Text */}
                {rating && (
                    <div className="text-center mb-8 animate-in slide-in-from-bottom duration-300">
                        <p className="text-4xl font-bold text-white">
                            {rating === 5 && "Excellent! ⭐⭐⭐⭐⭐"}
                            {rating === 4 && "Great! ⭐⭐⭐⭐"}
                            {rating === 3 && "Good ⭐⭐⭐"}
                            {rating === 2 && "Fair ⭐⭐"}
                            {rating === 1 && "Poor ⭐"}
                        </p>
                    </div>
                )}

                {/* Feedback Tags */}
                {rating && availableTags.length > 0 && (
                    <div className="mb-10 animate-in slide-in-from-bottom duration-500">
                        <p className="text-white text-xl mb-4 text-center font-medium">Tell us more (optional)</p>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {availableTags.map((tag) => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                                    className={`px-6 py-4 rounded-2xl text-xl font-semibold transition-all transform active:scale-95 ${selectedTag === tag
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] scale-105'
                                            : 'bg-white/10 text-white hover:bg-white/20 border-2 border-white/30'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-6 mt-10">
                    <button
                        onClick={handleSkip}
                        className="py-6 bg-white/5 hover:bg-white/10 text-stone-300 rounded-2xl text-2xl font-semibold border-2 border-white/20 transition-all active:scale-95"
                    >
                        Skip
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!rating}
                        className={`py-6 rounded-2xl text-2xl font-bold shadow-lg transition-all active:scale-95 ${rating
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-[0_0_40px_rgba(168,85,247,0.5)]'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Submit Review
                    </button>
                </div>
            </div>

            {/* Footer */}
            <p className="text-purple-300 text-lg mt-8">Your feedback helps us improve our service</p>
        </div>
    )
}
