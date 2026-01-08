'use client'

import { DollarSign, TrendingUp, Star, Target, Edit2, Check, X } from 'lucide-react'
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
    const [isEditingGoal, setIsEditingGoal] = useState(false)
    const [newGoal, setNewGoal] = useState('')
    const [updatingGoal, setUpdatingGoal] = useState(false)

    const handleUpdateGoal = async () => {
        if (!newGoal || isNaN(Number(newGoal))) return

        setUpdatingGoal(true)
        try {
            const res = await fetch('/api/employee/goal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dailyGoal: Number(newGoal) })
            })

            if (res.ok) {
                const updatedUser = await res.json()
                setStats(prev => prev ? { ...prev, dailyGoal: updatedUser.dailyGoal } : null)
                setIsEditingGoal(false)
            }
        } catch (error) {
            console.error('Failed to update goal', error)
        } finally {
            setUpdatingGoal(false)
        }
    }

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Earnings Card */}
            <div className="glass-panel p-4 rounded-xl">
                <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Today's Earnings</p>
                <p className="text-2xl font-bold text-white">${stats.totalEarnings.toFixed(2)}</p>
                <p className="text-xs text-emerald-500 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    On track
                </p>
            </div>

            {/* Commission Card */}
            <div className="glass-panel p-4 rounded-xl">
                <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Commission</p>
                <p className="text-2xl font-bold text-stone-200">${stats.commission.toFixed(2)}</p>
            </div>

            {/* Tips Card */}
            <div className="glass-panel p-4 rounded-xl">
                <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Tips</p>
                <p className="text-2xl font-bold text-emerald-400">+${stats.tips.toFixed(2)}</p>
            </div>

            {/* Daily Goal Card */}
            <div className="glass-panel p-4 rounded-xl relative group">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-stone-500 uppercase tracking-wide">Daily Goal</p>
                    {isEditingGoal ? (
                        <div className="flex gap-1">
                            <button
                                onClick={handleUpdateGoal}
                                disabled={updatingGoal}
                                className="p-1 hover:bg-emerald-500/20 text-stone-500 hover:text-emerald-500 rounded transition-colors"
                            >
                                <Check className="h-3 w-3" />
                            </button>
                            <button
                                onClick={() => setIsEditingGoal(false)}
                                className="p-1 hover:bg-red-500/20 text-stone-500 hover:text-red-500 rounded transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setIsEditingGoal(true)
                                setNewGoal(stats.dailyGoal.toString())
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-stone-800 text-stone-500 rounded transition-all"
                        >
                            <Edit2 className="h-3 w-3" />
                        </button>
                    )}
                </div>

                {isEditingGoal ? (
                    <div className="flex items-center gap-2 h-8">
                        <span className="text-stone-400 font-bold">$</span>
                        <input
                            type="number"
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                            className="bg-stone-900 border-none rounded px-2 py-1 text-white font-bold w-full focus:ring-1 focus:ring-orange-500"
                            autoFocus
                        />
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3">
                            <p className="text-2xl font-bold text-orange-400">{Math.round(goalProgress)}%</p>
                            <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                                    style={{ width: `${goalProgress}%` }}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">${Math.max(0, stats.dailyGoal - stats.totalEarnings).toFixed(0)} to reach goal</p>
                    </>
                )}
            </div>
        </div>
    )
}

