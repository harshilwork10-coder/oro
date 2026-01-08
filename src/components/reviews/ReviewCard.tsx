'use client'

import { Star, MoreVertical, MessageCircle, Share2 } from 'lucide-react'

type ReviewProps = {
    review: {
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
}

export default function ReviewCard({ review }: ReviewProps) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {review.client.firstName[0]}
                    </div>
                    <div>
                        <h4 className="font-semibold text-white">
                            {review.client.firstName} {review.client.lastName}
                        </h4>
                        <p className="text-xs text-stone-400">
                            {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-stone-900/50 px-2 py-1 rounded-lg border border-stone-700">
                    <span className="font-bold text-white">{review.rating}.0</span>
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                </div>
            </div>

            {review.feedbackTag && (
                <div className="mb-3">
                    <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-md border border-purple-500/20">
                        {review.feedbackTag}
                    </span>
                </div>
            )}

            {review.comment && (
                <p className="text-stone-300 text-sm leading-relaxed mb-4">
                    "{review.comment}"
                </p>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-300 transition-colors flex items-center gap-2">
                        <MessageCircle className="h-3 w-3" />
                        Reply
                    </button>
                    {!review.postedToGoogle && (
                        <button className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-xs text-stone-300 transition-colors flex items-center gap-2">
                            <Share2 className="h-3 w-3" />
                            Share to Google
                        </button>
                    )}
                </div>

                <button className="p-1.5 hover:bg-stone-800 rounded-lg text-stone-500 transition-colors">
                    <MoreVertical className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}

