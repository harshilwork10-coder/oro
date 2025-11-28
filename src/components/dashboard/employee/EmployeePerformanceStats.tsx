'use client'

import { DollarSign, TrendingUp, Star, Target } from 'lucide-react'
import { useEffect, useState } from 'react'

interface EmployeeStats {
    revenue: number
    tips: number
    commission: number
    totalEarnings: number
    appointments: {
        total: number
        completed: number
        remaining: number
    }
    dailyGoal: number
}

export default function EmployeePerformanceStats() {
    const [stats, setStats] = useState<EmployeeStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/employee/stats')
                if (res.ok) {
                    const data = await res.json()
                    setStats(data)
                }
            } catch (error) {
                console.error('Error fetching stats:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return <div className="animate-pulse h-48 bg-stone-900/50 rounded-2xl"></div>
    }

    if (!stats) return null

    const goalProgress = Math.min((stats.totalEarnings / stats.dailyGoal) * 100, 100)

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Earnings Card */}
            <div className="md:col-span-2 glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign className="h-32 w-32 text-emerald-500" />
                </div>

                <div className="relative z-10">
                    <h3 className="text-stone-400 font-medium mb-1">Today's Earnings</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-white">
                            ${stats.totalEarnings.toFixed(2)}
                        </span>
                        <span className="text-emerald-500 text-sm font-medium flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            On track
                        </span>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="bg-stone-900/50 p-3 rounded-xl border border-stone-800">
                            <p className="text-xs text-stone-500 uppercase tracking-wider">Commission</p>
                            <p className="text-lg font-semibold text-stone-200">${stats.commission.toFixed(2)}</p>
                        </div>
                        <div className="bg-stone-900/50 p-3 rounded-xl border border-stone-800">
                            <p className="text-xs text-stone-500 uppercase tracking-wider">Tips</p>
                            <p className="text-lg font-semibold text-emerald-400">+${stats.tips.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Daily Goal Card */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center relative">
                <h3 className="text-stone-400 font-medium mb-4 absolute top-6 left-6">Daily Goal</h3>

                {/* Circular Progress */}
                <div className="relative h-32 w-32 mt-4">
                    <svg className="h-full w-full transform -rotate-90">
                        {/* Background Circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            className="stroke-stone-800"
                            strokeWidth="12"
                            fill="none"
                        />
                        {/* Progress Circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            className="stroke-orange-500 transition-all duration-1000 ease-out"
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={351.86} // 2 * pi * 56
                            strokeDashoffset={351.86 - (351.86 * goalProgress) / 100}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-white">{Math.round(goalProgress)}%</span>
                        <Target className="h-4 w-4 text-orange-500 mt-1" />
                    </div>
                </div>

                <p className="text-sm text-stone-500 mt-4">
                    ${(stats.dailyGoal - stats.totalEarnings).toFixed(0)} to reach goal
                </p>
            </div>
        </div>
    )
}
