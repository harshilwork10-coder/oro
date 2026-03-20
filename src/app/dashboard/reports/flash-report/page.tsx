'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Zap, RefreshCw, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function FlashReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetch('/api/reports/flash-report').then(r => r.json()).then(d => { setData(d.data); setLoading(false) }).catch(() => setLoading(false)) }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2"><Zap className="h-8 w-8 text-amber-500" /> Flash Report</h1>
                    <p className="text-stone-400">Today&apos;s quick summary</p>
                </div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Today Revenue', val: formatCurrency(data.todayRevenue || 0), color: 'text-emerald-400' },
                            { label: 'Transactions', val: data.todayTransactions || 0, color: 'text-blue-400' },
                            { label: 'Avg Ticket', val: formatCurrency(data.avgTicket || 0), color: 'text-purple-400' },
                            { label: 'vs Yesterday', val: `${(data.vsYesterday || 0) > 0 ? '+' : ''}${isFinite(data.vsYesterday) ? Number(data.vsYesterday).toFixed(1) : '0.0'}%`, color: (data.vsYesterday || 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
                        ].map(s => (
                            <div key={s.label} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                                <p className="text-sm text-stone-400">{s.label}</p>
                                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.val}</p>
                            </div>
                        ))}
                    </div>
                    {data.topItems && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold mb-4">Top Sellers Today</h2>
                            {data.topItems.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between py-2 border-b border-stone-800 last:border-0">
                                    <span>{item.name}</span><span className="font-mono text-emerald-400">{item.quantity} sold • {formatCurrency(item.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : <p className="text-center text-stone-500 py-20">No data available</p>}
        </div>
    )
}
