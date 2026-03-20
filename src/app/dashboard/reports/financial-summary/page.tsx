'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, DollarSign, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function FinancialSummaryPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/eod-summary')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><DollarSign className="h-8 w-8 text-emerald-500" /> Financial Summary</h1>
                    <p className="text-stone-400">Consolidated financial overview</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Revenue', val: formatCurrency(data.revenue || 0), color: 'text-emerald-400' },
                            { label: 'Refunds', val: formatCurrency(data.refunds || 0), color: 'text-red-400' },
                            { label: 'Voids', val: formatCurrency(data.voids || 0), color: 'text-orange-400' },
                            { label: 'Net Sales', val: formatCurrency((data.revenue || 0) - (data.refunds || 0) - (data.voids || 0)), color: 'text-blue-400' },
                        ].map(s => (
                            <div key={s.label} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                                <p className="text-sm text-stone-400">{s.label}</p>
                                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.val}</p>
                            </div>
                        ))}
                    </div>
                    {(data.paymentBreakdown || []).length > 0 && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold mb-4">Payment Method Breakdown</h2>
                            {(data.paymentBreakdown || []).map((p: any, i: number) => (
                                <div key={i} className="flex justify-between py-2 border-b border-stone-800 last:border-0">
                                    <span>{p.method}</span><span className="font-mono text-emerald-400">{formatCurrency(p.total || 0)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : <p className="text-center text-stone-500 py-20">No financial data yet.</p>}
        </div>
    )
}
