'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function BenchmarkingReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/multi-store-comparison?days=30')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const locations = data?.locations || []
    const avgRevenue = locations.length > 0 ? locations.reduce((s: number, l: any) => s + (l.revenue || 0), 0) / locations.length : 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><BarChart3 className="h-8 w-8 text-cyan-500" /> Location Benchmarking</h1>
                    <p className="text-stone-400">Compare location performance against network average</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : locations.length > 0 ? (
                <div className="space-y-3">
                    <div className="bg-stone-800/50 border border-stone-600 rounded-xl p-4 mb-6 text-center">
                        <p className="text-sm text-stone-400">Network Average Revenue (30 days)</p>
                        <p className="text-2xl font-bold text-cyan-400">{formatCurrency(avgRevenue)}</p>
                    </div>
                    {locations.map((loc: any, i: number) => {
                        const diff = avgRevenue > 0 ? ((loc.revenue - avgRevenue) / avgRevenue * 100) : 0
                        return (
                            <div key={i} className="bg-stone-900/80 border border-stone-700 rounded-xl p-5 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-lg">{loc.name || 'Location'}</p>
                                    <p className="text-sm text-stone-400">{loc.transactions || 0} transactions • Avg {formatCurrency(loc.avgTicket || 0)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(loc.revenue || 0)}</p>
                                    <p className={`text-sm font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {diff >= 0 ? '+' : ''}{isFinite(diff) ? diff.toFixed(1) : '0.0'}% vs avg
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : <p className="text-center text-stone-500 py-20">Add multiple locations to see benchmarking data.</p>}
        </div>
    )
}
