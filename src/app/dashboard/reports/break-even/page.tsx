'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function BreakEvenReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/revenue?days=30')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const revenue = data?.revenue || 0
    const fixedCosts = revenue * 0.25
    const variableCosts = revenue * 0.35
    const contributionMargin = revenue > 0 ? ((revenue - variableCosts) / revenue * 100).toFixed(1) : '0.0'
    const breakEvenPoint = Number(contributionMargin) > 0 ? fixedCosts / (Number(contributionMargin) / 100) : 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><TrendingUp className="h-8 w-8 text-cyan-500" /> Break-Even Analysis</h1>
                    <p className="text-stone-400">Revenue needed to cover costs</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Today Revenue', val: formatCurrency(revenue), color: 'text-emerald-400' },
                        { label: 'Est. Fixed Costs', val: formatCurrency(fixedCosts), color: 'text-orange-400' },
                        { label: 'Contribution Margin', val: `${contributionMargin}%`, color: 'text-cyan-400' },
                        { label: 'Break-Even Point', val: formatCurrency(isFinite(breakEvenPoint) ? breakEvenPoint : 0), color: revenue >= breakEvenPoint ? 'text-emerald-400' : 'text-red-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <p className="text-sm text-stone-400">{s.label}</p>
                            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.val}</p>
                        </div>
                    ))}
                    <p className="col-span-full text-xs text-stone-600">* Costs estimated. Connect accounting for exact figures.</p>
                </div>
            ) : <p className="text-center text-stone-500 py-20">No data yet.</p>}
        </div>
    )
}
