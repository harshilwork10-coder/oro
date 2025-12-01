'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, Building2, MapPin, DollarSign } from 'lucide-react'

type ChartData = {
    month: string
    clients: number
    locations: number
    revenue: number
}

type GrowthStats = {
    clients: { current: number; growth: number }
    locations: { current: number; growth: number }
    agents: { current: number; growth: number }
    revenue: { current: number; growth: number }
}

export default function Analytics() {
    const [chartData, setChartData] = useState<ChartData[]>([])
    const [stats, setStats] = useState<GrowthStats | null>(null)
    const [loading, setLoading] = useState(true)

    async function fetchAnalytics() {
        try {
            const res = await fetch('/api/admin/analytics-chart')
            if (res.ok) {
                const data = await res.json()
                setChartData(data.chartData)
                setStats(data.stats)
            }
        } catch (error) {
            console.error('Error fetching analytics:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAnalytics()
    }, [])

    if (loading) {
        return (
            <div className="glass-panel p-6 rounded-2xl">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-stone-800/50 rounded w-1/3"></div>
                    <div className="h-64 bg-stone-800/50 rounded"></div>
                </div>
            </div>
        )
    }

    const maxValue = Math.max(...chartData.map(d => Math.max(d.clients, d.locations)))

    return (
        <div className="space-y-6">
            {/* Growth Stats Grid */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Clients"
                        value={stats.clients.current}
                        growth={stats.clients.growth}
                        icon={Building2}
                        color="purple"
                    />
                    <StatCard
                        title="Locations"
                        value={stats.locations.current}
                        growth={stats.locations.growth}
                        icon={MapPin}
                        color="emerald"
                    />
                    <StatCard
                        title="Agents"
                        value={stats.agents.current}
                        growth={stats.agents.growth}
                        icon={Users}
                        color="orange"
                    />
                    <StatCard
                        title="Revenue"
                        value={`$${(stats.revenue.current / 1000).toFixed(1)}k`}
                        growth={stats.revenue.growth}
                        icon={DollarSign}
                        color="blue"
                    />
                </div>
            )}

            {/* Growth Chart */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-6">Growth Trends</h2>
                <div className="space-y-6">
                    {chartData.map((data, index) => (
                        <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-stone-400 font-medium w-16">{data.month}</span>
                                <div className="flex gap-4 text-xs">
                                    <span className="text-purple-400">{data.clients} clients</span>
                                    <span className="text-emerald-400">{data.locations} locations</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {/* Clients Bar */}
                                <div className="flex-1 bg-stone-800 rounded-full h-6 relative overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-500"
                                        style={{ width: `${(data.clients / maxValue) * 100}%` }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-bold text-white drop-shadow-lg">
                                                {data.clients}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {/* Locations Bar */}
                                <div className="flex-1 bg-stone-800 rounded-full h-6 relative overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                                        style={{ width: `${(data.locations / maxValue) * 100}%` }}
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-bold text-white drop-shadow-lg">
                                                {data.locations}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, growth, icon: Icon, color }: {
    title: string
    value: string | number
    growth: number
    icon: any
    color: 'purple' | 'emerald' | 'orange' | 'blue'
}) {
    const isPositive = growth >= 0

    const colorClasses = {
        purple: 'from-purple-600 to-purple-400',
        emerald: 'from-emerald-600 to-emerald-400',
        orange: 'from-orange-600 to-orange-400',
        blue: 'from-blue-600 to-blue-400'
    }

    return (
        <div className="glass-panel p-4 rounded-xl hover:border-stone-700 transition-all">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-400 uppercase tracking-wider">{title}</span>
                <Icon className={`h-4 w-4 text-${color}-400`} />
            </div>
            <div className="text-2xl font-bold text-stone-100">{value}</div>
            <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                ) : (
                    <TrendingDown className="h-3 w-3 text-red-400" />
                )}
                <span className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{growth}%
                </span>
                <span className="text-xs text-stone-500">vs last month</span>
            </div>
        </div>
    )
}
