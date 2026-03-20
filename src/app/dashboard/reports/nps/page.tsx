'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Star, RefreshCw } from 'lucide-react'

export default function NPSReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/nps?days=90')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const segments = data?.segments || []
    const totalCustomers = segments.reduce((s: number, seg: any) => s + (seg.count || 0), 0)

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Star className="h-8 w-8 text-yellow-500" /> NPS & Customer Satisfaction</h1>
                    <p className="text-stone-400">Customer engagement metrics</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 text-center">
                        <p className="text-sm text-stone-400">Total Customers</p>
                        <p className="text-4xl font-bold text-yellow-400 mt-2">{totalCustomers}</p>
                    </div>
                    {segments.map((seg: any, i: number) => (
                        <div key={i} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <p className="text-sm text-stone-400">{seg.name}</p>
                            <p className="text-3xl font-bold text-purple-400">{seg.count || 0}</p>
                            <p className="text-xs text-stone-500 mt-1">{totalCustomers > 0 ? ((seg.count / totalCustomers) * 100).toFixed(0) : 0}% of total</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
