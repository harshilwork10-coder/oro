'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function COGSReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/pnl?days=30')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const revenue = data?.revenue || 0
    const topItems = data?.topItems || []

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Package className="h-8 w-8 text-orange-500" /> Cost of Goods Sold</h1>
                    <p className="text-stone-400">Product costs and margin analysis</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <p className="text-sm text-stone-400">Revenue</p>
                            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(revenue)}</p>
                        </div>
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <p className="text-sm text-stone-400">Est. COGS (35%)</p>
                            <p className="text-3xl font-bold text-orange-400">{formatCurrency(revenue * 0.35)}</p>
                        </div>
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <p className="text-sm text-stone-400">Gross Margin</p>
                            <p className="text-3xl font-bold text-emerald-400">65%</p>
                        </div>
                    </div>
                    {topItems.length > 0 && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold mb-4">Top Items by Revenue</h2>
                            {topItems.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between py-2 border-b border-stone-800 last:border-0">
                                    <span>{item.name}</span>
                                    <span className="font-mono text-emerald-400">{item.quantity} sold • {formatCurrency(item.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-stone-600 mt-4">* COGS estimated at 35%. Connect inventory costs for exact figures.</p>
                </>
            ) : <p className="text-center text-stone-500 py-20">No COGS data yet.</p>}
        </div>
    )
}
