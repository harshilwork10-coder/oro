'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function SameStoreSalesPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/multi-store-comparison?days=30')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><TrendingUp className="h-8 w-8 text-emerald-500" /> Same-Store Sales</h1>
                    <p className="text-stone-400">Consistent location-to-location comparison</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : (data?.locations || []).length > 0 ? (
                <div className="space-y-3">
                    {(data.locations || []).map((loc: any, i: number) => (
                        <div key={i} className="bg-stone-900/80 border border-stone-700 rounded-xl p-5 flex items-center justify-between">
                            <div><p className="font-semibold">{loc.name}</p><p className="text-sm text-stone-400">{loc.transactions || 0} txns</p></div>
                            <div className="text-right"><p className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(loc.revenue || 0)}</p>
                                <p className="text-sm text-stone-400">Avg {formatCurrency(loc.dailyAverage || 0)}/day</p></div>
                        </div>
                    ))}
                </div>
            ) : <p className="text-center text-stone-500 py-20">No same-store data available yet.</p>}
        </div>
    )
}
