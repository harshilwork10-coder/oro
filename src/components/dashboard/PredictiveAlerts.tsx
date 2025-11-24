'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, TrendingDown, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type AnalysisResult = {
    franchiseId: string
    score: number
    trend: 'up' | 'down' | 'stable'
    predictedScore: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    breakdown: any
}

export default function PredictiveAlerts() {
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<AnalysisResult[]>([])
    const [lastRun, setLastRun] = useState<Date | null>(null)

    const runAnalysis = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/predictive-analysis', { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                setResults(data.results.filter((r: AnalysisResult) => r.riskLevel !== 'low'))
                setLastRun(new Date())
            }
        } catch (error) {
            console.error('Analysis failed:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Auto-run on mount if no data
        if (results.length === 0) {
            runAnalysis()
        }
    }, [])

    if (results.length === 0 && !loading) return null

    return (
        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-stone-100">AI Predictive Alerts</h2>
                        <p className="text-sm text-stone-400">
                            {loading ? 'Analyzing system data...' : `${results.length} franchises at risk`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="p-2 hover:bg-stone-800 rounded-full transition-colors"
                    title="Re-run Analysis"
                >
                    <RefreshCw className={`h-5 w-5 text-stone-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="space-y-3">
                {results.map((result) => (
                    <div key={result.franchiseId} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all">
                        <div className="flex items-center gap-3">
                            <TrendingDown className="h-5 w-5 text-red-500" />
                            <div>
                                <p className="font-semibold text-stone-100">Franchise ID: {result.franchiseId.slice(0, 8)}...</p>
                                <p className="text-sm text-red-300 font-medium">
                                    Predicted Drop: {result.score} → {result.predictedScore}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${result.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                {result.riskLevel}
                            </span>
                            <Link
                                href={`/dashboard/franchisees/${result.franchiseId}`}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                            >
                                <ArrowRight className="h-4 w-4 text-red-500" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
