'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Heart, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function RetentionReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/customers/segmentation?days=90')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Heart className="h-8 w-8 text-pink-500" /> Customer Retention</h1>
                    <p className="text-stone-400">Customer loyalty and return rate analysis</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {(data.segments || []).map((seg: any, i: number) => (
                        <div key={i} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <p className="text-sm text-stone-400">{seg.name}</p>
                            <p className="text-3xl font-bold text-pink-400">{seg.count || 0}</p>
                            <p className="text-xs text-stone-500 mt-1">{formatCurrency(seg.totalSpend || 0)} lifetime value</p>
                        </div>
                    ))}
                </div>
            ) : <p className="text-center text-stone-500 py-20">No retention data yet.</p>}
        </div>
    )
}
