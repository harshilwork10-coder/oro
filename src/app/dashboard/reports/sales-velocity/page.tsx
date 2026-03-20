'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function SalesVelocityPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    useEffect(() => { setLoading(true); fetch(`/api/reports/sales-velocity?days=${days}`).then(r => r.json()).then(d => { setData(d.data?.items || []); setLoading(false) }).catch(() => setLoading(false)) }, [days])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div><h1 className="text-3xl font-bold flex items-center gap-2"><TrendingUp className="h-8 w-8 text-blue-500" /> Sales Velocity</h1><p className="text-stone-400">Items ranked by sell-through speed (units/day)</p></div>
                </div>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2">
                    <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
                </select>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-stone-700">
                            <th className="text-left py-3 px-4 text-stone-400">#</th>
                            <th className="text-left py-3 px-4 text-stone-400">Item</th>
                            <th className="text-right py-3 px-4 text-stone-400">Units/Day</th>
                            <th className="text-right py-3 px-4 text-stone-400">Stock</th>
                            <th className="text-right py-3 px-4 text-stone-400">Days Left</th>
                            <th className="text-right py-3 px-4 text-stone-400">Revenue</th>
                            <th className="text-center py-3 px-4 text-stone-400">Status</th>
                        </tr></thead>
                        <tbody>
                            {data.map((item, i) => (
                                <tr key={i} className="border-b border-stone-800 hover:bg-stone-800/50">
                                    <td className="py-3 px-4 text-stone-500">{i + 1}</td>
                                    <td className="py-3 px-4 font-medium">{item.name}</td>
                                    <td className="py-3 px-4 text-right font-mono">{item.unitsPerDay?.toFixed(1)}</td>
                                    <td className="py-3 px-4 text-right">{item.stock}</td>
                                    <td className="py-3 px-4 text-right font-mono">{item.daysOfStock || '∞'}</td>
                                    <td className="py-3 px-4 text-right font-mono text-emerald-400">{formatCurrency(item.revenue || 0)}</td>
                                    <td className="py-3 px-4 text-center">
                                        {item.flag === 'CRITICAL' ? <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs flex items-center gap-1 justify-center"><AlertTriangle className="h-3 w-3" />CRITICAL</span>
                                            : item.flag === 'LOW' ? <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">LOW</span>
                                                : <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">OK</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
