'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function YearOverYearPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState('month')

    useEffect(() => { setLoading(true); fetch(`/api/reports/year-over-year?period=${period}`).then(r => r.json()).then(d => { setData(d.data); setLoading(false) }) }, [period])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div><h1 className="text-3xl font-bold flex items-center gap-2"><BarChart3 className="h-8 w-8 text-cyan-500" /> Year-over-Year</h1><p className="text-stone-400">Compare to same period last year</p></div>
                </div>
                <div className="flex gap-2">
                    {['week', 'month', 'quarter'].map(p => (
                        <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2 rounded-xl text-sm capitalize ${period === p ? 'bg-cyan-600' : 'bg-stone-800 hover:bg-stone-700'}`}>{p}</button>
                    ))}
                </div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <>
                    <div className="text-center mb-8">
                        {data.trend === 'UP' ? <TrendingUp className="h-12 w-12 text-emerald-400 mx-auto" /> : data.trend === 'DOWN' ? <TrendingDown className="h-12 w-12 text-red-400 mx-auto" /> : <Minus className="h-12 w-12 text-stone-400 mx-auto" />}
                        <p className={`text-5xl font-bold mt-3 ${data.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {data.revenueGrowth > 0 ? '+' : ''}{data.revenueGrowth?.toFixed(1) || 0}%
                        </p>
                        <p className="text-stone-400 mt-2">Revenue growth</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                            <h3 className="text-sm text-stone-400 mb-4">This {period}</h3>
                            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(data.currentRevenue || 0)}</p>
                            <p className="text-stone-400 mt-2">{data.currentTransactions || 0} transactions</p>
                            <p className="text-stone-400">Avg ticket: {formatCurrency(data.currentAvgTicket || 0)}</p>
                        </div>
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                            <h3 className="text-sm text-stone-400 mb-4">Same {period} last year</h3>
                            <p className="text-3xl font-bold">{formatCurrency(data.previousRevenue || 0)}</p>
                            <p className="text-stone-400 mt-2">{data.previousTransactions || 0} transactions</p>
                            <p className="text-stone-400">Avg ticket: {formatCurrency(data.previousAvgTicket || 0)}</p>
                        </div>
                    </div>
                </>
            ) : <p className="text-center py-20 text-stone-500">No data</p>}
        </div>
    )
}
