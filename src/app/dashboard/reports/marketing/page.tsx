'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Megaphone, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function MarketingReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/nps?days=30')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const segments = data?.segments || []
    const totalCustomers = segments.reduce((s: number, seg: any) => s + (seg.count || 0), 0)
    const totalRevenue = segments.reduce((s: number, seg: any) => s + (seg.totalSpend || 0), 0)

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Megaphone className="h-8 w-8 text-indigo-500" /> Marketing Report</h1>
                    <p className="text-stone-400">Customer acquisition and engagement</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <p className="text-sm text-stone-400">Total Customers</p>
                            <p className="text-3xl font-bold text-indigo-400">{totalCustomers}</p>
                        </div>
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <p className="text-sm text-stone-400">Customer Revenue</p>
                            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
                        </div>
                    </div>
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold mb-4">Customer Segments</h2>
                        {segments.map((seg: any, i: number) => (
                            <div key={i} className="flex justify-between py-2 border-b border-stone-800 last:border-0">
                                <span>{seg.name}</span>
                                <span className="font-mono text-indigo-400">{seg.count} customers • {formatCurrency(seg.totalSpend || 0)}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
