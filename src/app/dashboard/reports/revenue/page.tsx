'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, DollarSign, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function RevenueReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/reports/revenue?days=${days}`)
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [days])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div className="flex-1"><h1 className="text-3xl font-bold flex items-center gap-2"><DollarSign className="h-8 w-8 text-emerald-500" /> Revenue by Location</h1>
                    <p className="text-stone-400">Compare revenue performance across all locations</p></div>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-2">
                    <option value={7}>7 Days</option><option value={30}>30 Days</option><option value={90}>90 Days</option>
                </select>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : (data?.locations || []).length > 0 ? (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-stone-700">
                            <th className="text-left py-3 px-4 text-stone-400">#</th>
                            <th className="text-left py-3 px-4 text-stone-400">Location</th>
                            <th className="text-right py-3 px-4 text-stone-400">Revenue</th>
                            <th className="text-right py-3 px-4 text-stone-400">Transactions</th>
                            <th className="text-right py-3 px-4 text-stone-400">Avg Ticket</th>
                            <th className="text-right py-3 px-4 text-stone-400">Daily Avg</th>
                        </tr></thead>
                        <tbody>{(data.locations || []).map((loc: any, i: number) => (
                            <tr key={loc.locationId || i} className="border-b border-stone-800">
                                <td className="py-3 px-4 text-stone-500">{i + 1}</td>
                                <td className="py-3 px-4 font-medium">{loc.name || 'Location'}</td>
                                <td className="py-3 px-4 text-right font-mono text-emerald-400">{formatCurrency(loc.revenue || 0)}</td>
                                <td className="py-3 px-4 text-right">{loc.transactions || 0}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(loc.avgTicket || 0)}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(loc.dailyAverage || 0)}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            ) : <p className="text-center text-stone-500 py-20">No revenue data yet — process some transactions to see results here.</p>}
        </div>
    )
}
