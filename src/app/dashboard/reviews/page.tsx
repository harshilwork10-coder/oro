'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Star, MessageSquare, ThumbsUp, Filter, Search } from 'lucide-react'
import ReviewCard from '@/components/reviews/ReviewCard'

type Review = {
    id: string
    rating: number
    comment: string | null
    feedbackTag: string | null
    createdAt: string
    client: {
        firstName: string
        lastName: string
    }
    postedToGoogle: boolean
}

export default function ReviewsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [reviews, setReviews] = useState<Review[]>([])
    const [loading, setLoading] = useState(true)
    const [filterRating, setFilterRating] = useState<number | 'ALL'>('ALL')
    const [stats, setStats] = useState({
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    })

    useEffect(() => {
        if (status === 'authenticated') {
            fetchReviews()
        }
    }, [status])

    async function fetchReviews() {
        try {
            const res = await fetch('/api/reviews?limit=100')
            if (res.ok) {
                const data = await res.json()
                setReviews(data.reviews)
                calculateStats(data.reviews)
            }
        } catch (error) {
            console.error('Error fetching reviews:', error)
        } finally {
            setLoading(false)
        }
    }

    function calculateStats(data: Review[]) {
        if (data.length === 0) return

        const total = data.length
        const sum = data.reduce((acc, r) => acc + r.rating, 0)
        const average = sum / total

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as any
        data.forEach(r => {
            if (distribution[r.rating] !== undefined) {
                distribution[r.rating]++
            }
        })

        setStats({ average, total, distribution })
    }

    const filteredReviews = reviews.filter(r =>
        filterRating === 'ALL' || r.rating === filterRating
    )

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Customer Reviews</h1>
                <p className="text-stone-400">Monitor and respond to client feedback</p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Overall Rating */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-6">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-white mb-1">{stats.average.toFixed(1)}</div>
                        <div className="flex gap-1 justify-center mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-4 w-4 ${star <= Math.round(stats.average) ? 'text-yellow-400 fill-yellow-400' : 'text-stone-600'
                                        }`}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-stone-400">{stats.total} total reviews</p>
                    </div>
                    <div className="flex-1 space-y-2">
                        {[5, 4, 3, 2, 1].map((rating) => (
                            <div key={rating} className="flex items-center gap-2 text-xs">
                                <span className="w-3 text-stone-400">{rating}</span>
                                <Star className="h-3 w-3 text-stone-600" />
                                <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 rounded-full"
                                        style={{
                                            width: `${stats.total ? ((stats.distribution as any)[rating] / stats.total) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                                <span className="w-6 text-right text-stone-500">
                                    {(stats.distribution as any)[rating]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <ThumbsUp className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Positive Feedback</p>
                            <p className="text-xl font-bold text-white">
                                {stats.total ? Math.round(((stats.distribution[5] + stats.distribution[4]) / stats.total) * 100) : 0}%
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <MessageSquare className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-stone-400">Response Rate</p>
                            <p className="text-xl font-bold text-white">0%</p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-white/10 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                    <h3 className="text-lg font-bold text-white mb-2">Get More Reviews</h3>
                    <p className="text-sm text-purple-200 mb-4">Send automated review requests to recent clients</p>
                    <button className="px-4 py-2 bg-white text-purple-900 rounded-lg font-medium hover:bg-purple-50 transition-colors">
                        Configure Automation
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setFilterRating('ALL')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterRating === 'ALL'
                            ? 'bg-white text-stone-900'
                            : 'bg-white/5 text-stone-400 hover:text-white'
                        }`}
                >
                    All Reviews
                </button>
                {[5, 4, 3, 2, 1].map((rating) => (
                    <button
                        key={rating}
                        onClick={() => setFilterRating(rating)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${filterRating === rating
                                ? 'bg-white text-stone-900'
                                : 'bg-white/5 text-stone-400 hover:text-white'
                            }`}
                    >
                        {rating} <Star className="h-3 w-3 fill-current" />
                    </button>
                ))}
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {filteredReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                ))}

                {filteredReviews.length === 0 && (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        <MessageSquare className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-1">No reviews found</h3>
                        <p className="text-stone-400">Try adjusting your filters</p>
                    </div>
                )}
            </div>
        </div>
    )
}
