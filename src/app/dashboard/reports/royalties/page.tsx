'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, DollarSign, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function RoyaltiesReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/reports/royalties?days=90')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    const royaltyRate = 0.06
    const locations = data?.locations || []

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><DollarSign className="h-8 w-8 text-emerald-500" /> Royalty Report</h1>
                    <p className="text-stone-400">Franchise royalty calculations by location</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : locations.length > 0 ? (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="border-b border-stone-700">
                            <th className="text-left py-3 px-4 text-stone-400">Location</th>
                            <th className="text-right py-3 px-4 text-stone-400">Revenue</th>
                            <th className="text-right py-3 px-4 text-stone-400">Rate</th>
                            <th className="text-right py-3 px-4 text-stone-400">Royalty Due</th>
                        </tr></thead>
                        <tbody>{locations.map((loc: any, i: number) => (
                            <tr key={i} className="border-b border-stone-800">
                                <td className="py-3 px-4 font-medium">{loc.name}</td>
                                <td className="py-3 px-4 text-right font-mono">{formatCurrency(loc.revenue || 0)}</td>
                                <td className="py-3 px-4 text-right text-stone-400">{(royaltyRate * 100).toFixed(0)}%</td>
                                <td className="py-3 px-4 text-right font-mono text-emerald-400">{formatCurrency((loc.revenue || 0) * royaltyRate)}</td>
                            </tr>
                        ))}
                            <tr className="bg-stone-800/50 font-bold">
                                <td className="py-3 px-4">Total</td>
                                <td className="py-3 px-4 text-right font-mono">{formatCurrency(locations.reduce((s: number, l: any) => s + (l.revenue || 0), 0))}</td>
                                <td className="py-3 px-4 text-right"></td>
                                <td className="py-3 px-4 text-right font-mono text-emerald-400">{formatCurrency(locations.reduce((s: number, l: any) => s + (l.revenue || 0), 0) * royaltyRate)}</td>
                            </tr></tbody>
                    </table>
                </div>
            ) : <p className="text-center text-stone-500 py-20">No royalty data available.</p>}
        </div>
    )
}
