'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Grid3x3, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6am to 10pm
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function HourlyHeatmapPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetch('/api/reports/hourly-heatmap').then(r => r.json()).then(d => { setData(d.data); setLoading(false) }) }, [])

    const getColor = (val: number, max: number) => {
        if (!max || !val) return 'bg-stone-800'
        const pct = val / max
        if (pct > 0.8) return 'bg-emerald-500'
        if (pct > 0.6) return 'bg-emerald-600'
        if (pct > 0.4) return 'bg-emerald-700'
        if (pct > 0.2) return 'bg-emerald-800'
        return 'bg-emerald-900/50'
    }

    const heatmap = data?.heatmap || {}
    const maxVal = Math.max(...Object.values(heatmap).map((d: any) => Math.max(...Object.values(d).map(Number))), 1)

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Grid3x3 className="h-8 w-8 text-orange-500" /> Hourly Heatmap</h1><p className="text-stone-400">Sales activity by hour & day of week</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : (
                <>
                    {data?.summary && (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5"><p className="text-sm text-stone-400">Busiest Hour</p><p className="text-2xl font-bold text-emerald-400">{data.summary.busiestHour}</p></div>
                            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5"><p className="text-sm text-stone-400">Busiest Day</p><p className="text-2xl font-bold text-blue-400">{data.summary.busiestDay}</p></div>
                            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5"><p className="text-sm text-stone-400">Peak Revenue</p><p className="text-2xl font-bold text-amber-400">{formatCurrency(data.summary.peakRevenue || 0)}</p></div>
                        </div>
                    )}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr>
                                <th className="py-2 px-2 text-stone-400">Hour</th>
                                {DAYS.map(d => <th key={d} className="py-2 px-2 text-stone-400">{d}</th>)}
                            </tr></thead>
                            <tbody>
                                {HOURS.map(h => (
                                    <tr key={h}>
                                        <td className="py-1 px-2 text-stone-400 font-mono">{h > 12 ? `${h - 12}pm` : h === 12 ? '12pm' : `${h}am`}</td>
                                        {DAYS.map(d => {
                                            const val = heatmap?.[d]?.[h] || 0
                                            return <td key={d} className="py-1 px-1"><div className={`w-full h-8 rounded ${getColor(val, maxVal)} flex items-center justify-center text-[10px] font-mono`}>{val > 0 ? formatCurrency(val) : ''}</div></td>
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}
