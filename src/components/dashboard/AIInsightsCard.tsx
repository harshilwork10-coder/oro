'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2, RefreshCw } from 'lucide-react'

interface Insight {
    type: string
    icon: string
    message: string
    value?: string
}

export default function AIInsightsCard() {
    const [insights, setInsights] = useState<Insight[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function fetchInsights() {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/insights/daily-summary')
            if (res.ok) {
                const data = await res.json()
                setInsights(data.insights || [])
            } else {
                setError('Failed to load insights')
            }
        } catch (e) {
            setError('Connection error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInsights()
        // Refresh every 5 minutes
        const interval = setInterval(fetchInsights, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <h2 className="text-lg font-semibold text-stone-100">AI Insights</h2>
                </div>
                <button
                    onClick={fetchInsights}
                    disabled={loading}
                    className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading && insights.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                </div>
            ) : error ? (
                <div className="text-center py-6 text-stone-500">
                    <p>{error}</p>
                </div>
            ) : insights.length === 0 ? (
                <div className="text-center py-6 text-stone-500">
                    <p>No insights available yet</p>
                    <p className="text-sm mt-1">Make some sales to generate insights!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {insights.map((insight, idx) => (
                        <div
                            key={idx}
                            className="p-3 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-purple-500/30 transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{insight.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-stone-200 font-medium">{insight.message}</p>
                                    {insight.value && (
                                        <p className="text-sm text-purple-400 mt-0.5">{insight.value}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

