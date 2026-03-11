'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Briefcase, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function LaborReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/labor?days=30')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const laborCost = data?.laborCost || 0
    const revenue = data?.revenue || 0
    const laborPct = revenue > 0 ? ((laborCost / revenue) * 100).toFixed(1) : '0.0'

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Briefcase className="h-8 w-8 text-orange-500" /> Labor Report</h1>
                    <p className="text-stone-400">Labor costs as percentage of revenue</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                        <p className="text-sm text-stone-400">Today&apos;s Revenue</p>
                        <p className="text-3xl font-bold text-emerald-400 mt-1">{formatCurrency(revenue)}</p>
                    </div>
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                        <p className="text-sm text-stone-400">Labor Cost</p>
                        <p className="text-3xl font-bold text-orange-400 mt-1">{formatCurrency(laborCost)}</p>
                    </div>
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                        <p className="text-sm text-stone-400">Labor % of Revenue</p>
                        <p className={`text-3xl font-bold mt-1 ${Number(laborPct) < 30 ? 'text-emerald-400' : 'text-red-400'}`}>{laborPct}%</p>
                    </div>
                </div>
            ) : <p className="text-center text-stone-500 py-20">No labor data yet.</p>}
        </div>
    )
}
