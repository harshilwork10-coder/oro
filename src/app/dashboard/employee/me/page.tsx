'use client'

import { TrendingUp, DollarSign, Star, Award, Users, Calendar } from 'lucide-react'

export default function MyPerformancePage() {
    const stats = {
        thisMonth: {
            sales: 8450,
            services: 42,
            avgRating: 4.8,
            commission: 676
        },
        lastMonth: {
            sales: 7200,
            services: 38,
            avgRating: 4.7,
            commission: 576
        }
    }

    const recentReviews = [
        { customer: 'Sarah M.', rating: 5, comment: 'Amazing haircut! Very professional.', date: '2 days ago' },
        { customer: 'John D.', rating: 5, comment: 'Great service, will come back!', date: '5 days ago' },
        { customer: 'Lisa K.', rating: 4, comment: 'Good experience overall.', date: '1 week ago' }
    ]

    const salesChange = ((stats.thisMonth.sales - stats.lastMonth.sales) / stats.lastMonth.sales * 100).toFixed(1)
    const servicesChange = stats.thisMonth.services - stats.lastMonth.services

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                    <Award className="h-8 w-8 text-purple-500" />
                    My Performance
                </h1>
                <p className="text-stone-400 mt-2">November 2024</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-panel p-6 rounded-xl border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-stone-500">Sales</p>
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold text-stone-100">${stats.thisMonth.sales.toLocaleString()}</p>
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        +{salesChange}% from last month
                    </p>
                </div>

                <div className="glass-panel p-6 rounded-xl border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-stone-500">Services</p>
                        <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-stone-100">{stats.thisMonth.services}</p>
                    <p className="text-xs text-blue-400 mt-1">+{servicesChange} from last month</p>
                </div>

                <div className="glass-panel p-6 rounded-xl border-l-4 border-amber-500">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-stone-500">Avg Rating</p>
                        <Star className="h-5 w-5 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold text-stone-100">{stats.thisMonth.avgRating} ⭐</p>
                    <p className="text-xs text-stone-400 mt-1">Excellent performance</p>
                </div>

                <div className="glass-panel p-6 rounded-xl border-l-4 border-purple-500">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-stone-500">Commission</p>
                        <Award className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold text-stone-100">${stats.thisMonth.commission}</p>
                    <p className="text-xs text-purple-400 mt-1">This month</p>
                </div>
            </div>

            {/* Recent Reviews */}
            <div className="glass-panel rounded-xl p-6">
                <h3 className="text-lg font-bold text-stone-100 mb-4 flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-500" />
                    Recent Customer Reviews
                </h3>
                <div className="space-y-4">
                    {recentReviews.map((review, idx) => (
                        <div key={idx} className="p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-stone-200">{review.customer}</span>
                                <div className="flex items-center gap-1">
                                    {[...Array(review.rating)].map((_, i) => (
                                        <Star key={i} className="h-4 w-4 text-amber-500 fill-amber-500" />
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-stone-400 italic">"{review.comment}"</p>
                            <p className="text-xs text-stone-600 mt-2">{review.date}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Performance Goals */}
            <div className="glass-panel rounded-xl p-6">
                <h3 className="text-lg font-bold text-stone-100 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Monthly Goals
                </h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-stone-300">Sales Target</span>
                            <span className="text-sm font-medium text-stone-100">${stats.thisMonth.sales.toLocaleString()} / $10,000</span>
                        </div>
                        <div className="w-full bg-stone-800 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(stats.thisMonth.sales / 10000) * 100}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-stone-300">Services Target</span>
                            <span className="text-sm font-medium text-stone-100">{stats.thisMonth.services} / 50</span>
                        </div>
                        <div className="w-full bg-stone-800 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(stats.thisMonth.services / 50) * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
