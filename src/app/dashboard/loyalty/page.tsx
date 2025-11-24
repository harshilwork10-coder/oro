'use client'

import { useState } from 'react'
import {
    Heart,
    Trophy,
    Users,
    TrendingUp,
    Settings,
    Gift,
    Star,
    Crown,
    Zap
} from 'lucide-react'

export default function LoyaltyPage() {
    const [pointsPerDollar, setPointsPerDollar] = useState(1)
    const [redemptionRate, setRedemptionRate] = useState(100) // 100 points = $1

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <Heart className="h-8 w-8 text-pink-500" />
                        Loyalty Program
                    </h1>
                    <p className="text-stone-400 mt-2">Manage rewards and boost customer retention</p>
                </div>
                <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg border border-stone-700 flex items-center gap-2 transition-colors">
                    <Settings className="h-4 w-4" />
                    Configure Rules
                </button>
            </div>

            {/* Program Config Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-xl border-t-4 border-pink-500">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-pink-500/10 rounded-full text-pink-400">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-stone-100">Earning Rules</h3>
                            <p className="text-sm text-stone-500">How customers earn points</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                            <span className="text-stone-300">Points per $1 Spent</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setPointsPerDollar(Math.max(1, pointsPerDollar - 0.5))} className="w-8 h-8 rounded bg-stone-800 hover:bg-stone-700 text-stone-200">-</button>
                                <span className="font-bold text-xl text-stone-100 w-8 text-center">{pointsPerDollar}</span>
                                <button onClick={() => setPointsPerDollar(pointsPerDollar + 0.5)} className="w-8 h-8 rounded bg-stone-800 hover:bg-stone-700 text-stone-200">+</button>
                            </div>
                        </div>
                        <p className="text-xs text-stone-500 text-center">
                            A customer spending $50 will earn <span className="text-pink-400 font-bold">{50 * pointsPerDollar} points</span>.
                        </p>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-xl border-t-4 border-purple-500">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-500/10 rounded-full text-purple-400">
                            <Gift className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-stone-100">Redemption Rules</h3>
                            <p className="text-sm text-stone-500">How points convert to cash</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-stone-900/50 rounded-lg border border-stone-800">
                            <span className="text-stone-300">Points for $1 Reward</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setRedemptionRate(Math.max(10, redemptionRate - 10))} className="w-8 h-8 rounded bg-stone-800 hover:bg-stone-700 text-stone-200">-</button>
                                <span className="font-bold text-xl text-stone-100 w-12 text-center">{redemptionRate}</span>
                                <button onClick={() => setRedemptionRate(redemptionRate + 10)} className="w-8 h-8 rounded bg-stone-800 hover:bg-stone-700 text-stone-200">+</button>
                            </div>
                        </div>
                        <p className="text-xs text-stone-500 text-center">
                            1000 points = <span className="text-purple-400 font-bold">${(1000 / redemptionRate).toFixed(2)} off</span> next purchase.
                        </p>
                    </div>
                </div>
            </div>

            {/* Top Loyal Customers */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100 flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-500" />
                        Top Loyal Customers
                    </h3>
                    <button className="text-sm text-stone-400 hover:text-stone-200">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Tier</th>
                                <th className="px-6 py-3 text-right">Lifetime Points</th>
                                <th className="px-6 py-3 text-right">Current Balance</th>
                                <th className="px-6 py-3 text-right">Last Visit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            <tr className="hover:bg-stone-800/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-stone-200">Sarah Jenkins</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        Gold
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">12,450</td>
                                <td className="px-6 py-4 text-right font-bold text-stone-100">850</td>
                                <td className="px-6 py-4 text-right">2 days ago</td>
                            </tr>
                            <tr className="hover:bg-stone-800/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-stone-200">Michael Chen</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-500/10 text-stone-400 border border-stone-500/20">
                                        Silver
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">5,200</td>
                                <td className="px-6 py-4 text-right font-bold text-stone-100">1,200</td>
                                <td className="px-6 py-4 text-right">1 week ago</td>
                            </tr>
                            <tr className="hover:bg-stone-800/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-stone-200">Emma Wilson</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                        Gold
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">15,800</td>
                                <td className="px-6 py-4 text-right font-bold text-stone-100">450</td>
                                <td className="px-6 py-4 text-right">Yesterday</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
