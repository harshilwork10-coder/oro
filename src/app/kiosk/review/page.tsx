'use client'

import { useState } from 'react'
import { Star, Check, ChevronRight, ThumbsUp, MessageSquare, ShieldCheck } from 'lucide-react'
import AuraLogo from '@/components/ui/AuraLogo'
import clsx from 'clsx'

export default function KioskReviewPage() {
    const [step, setStep] = useState<'rating' | 'feedback' | 'waiver' | 'done'>('rating')
    const [rating, setRating] = useState(0)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [waiverAgreed, setWaiverAgreed] = useState(false)

    const feedbackTags = [
        'Great Service', 'Friendly Staff', 'Clean Facility',
        'Professional', 'Good Value', 'Relaxing Atmosphere'
    ]

    const handleRating = (stars: number) => {
        setRating(stars)
        // Auto-advance after a short delay if 5 stars, or let them click continue
        setTimeout(() => setStep('feedback'), 500)
    }

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag))
        } else {
            setSelectedTags([...selectedTags, tag])
        }
    }

    const handleDone = () => {
        // TODO: Submit review to backend

        if (rating === 5) {
            // Redirect to Google Reviews (Placeholder URL)
            window.location.href = 'https://search.google.com/local/writereview?placeid=PLACEHOLDER'
        } else {
            setStep('done')
            // Reset after 5 seconds
            setTimeout(() => {
                window.location.href = '/kiosk/check-in'
            }, 5000)
        }
    }

    if (step === 'done') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-6 text-white text-center">
                <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white p-6 shadow-sm flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                        <AuraLogo size={24} />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Aura Salon
                    </span>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl p-8 min-h-[500px] flex flex-col">

                    {/* Progress Steps */}
                    <div className="flex justify-center gap-2 mb-8">
                        {['rating', 'feedback', 'waiver'].map((s, i) => (
                            <div
                                key={s}
                                className={clsx(
                                    "h-2 rounded-full transition-all duration-300",
                                    step === s || (step === 'feedback' && i === 0) || (step === 'waiver' && i <= 1)
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

                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => handleRating(star)}
                                            className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                                        >
                                            <Star
                                                className={clsx(
                                                    "h-12 w-12 transition-colors duration-300",
                                                    star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 'feedback' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
                                <div className="text-center">
                                    <h2 className="text-3xl font-bold text-gray-900 mb-2">What did you like?</h2>
                                    <p className="text-gray-500">Select all that apply</p>
                                </div>

                                <div className="flex flex-wrap justify-center gap-3">
                                    {feedbackTags.map((tag) => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={clsx(
                                                "px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 border-2",
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
                                    onClick={() => setStep('waiver')}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                >
                                    Continue
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        )}

                        {step === 'waiver' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
                                <div className="text-center">
                                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                        <ShieldCheck className="h-8 w-8 text-blue-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">One last thing...</h2>
                                    <p className="text-gray-500">Please review and agree to our terms.</p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-500 h-32 overflow-y-auto border border-gray-200">
                                    <p className="mb-2"><strong>Liability Waiver:</strong> By checking the box below, I acknowledge that I have received the services requested and am satisfied with the results. I release Aura Salon and its employees from any liability regarding...</p>
                                    <p>I also consent to the use of my contact information for future appointment reminders and promotional offers from Aura Salon.</p>
                                </div>

                                <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={waiverAgreed}
                                            onChange={(e) => setWaiverAgreed(e.target.checked)}
                                            className="h-6 w-6 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        I have read and agree to the Liability Waiver and Terms of Service.
                                    </span>
                                </label>

                                <button
                                    onClick={handleDone}
                                    disabled={!waiverAgreed}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    Finish
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
