'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Layers, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function AbcAnalysisPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetch('/api/reports/abc-analysis').then(r => r.json()).then(d => { setData(d.data); setLoading(false) }) }, [])

    const tiers = [
        { key: 'A', color: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400', desc: 'Top 80% of revenue — always in stock' },
        { key: 'B', color: 'bg-blue-500/20 border-blue-500/50 text-blue-400', desc: 'Next 15% of revenue — monitor closely' },
        { key: 'C', color: 'bg-stone-500/20 border-stone-500/50 text-stone-400', desc: 'Bottom 5% — review for discontinuation' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Layers className="h-8 w-8 text-purple-500" /> ABC Analysis</h1><p className="text-stone-400">Inventory classification by revenue contribution</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {tiers.map(t => (
                            <div key={t.key} className={`border rounded-2xl p-5 ${t.color}`}>
                                <p className="text-3xl font-bold">{t.key}</p>
                                <p className="text-lg font-semibold mt-2">{data.summary?.[t.key]?.count || 0} items</p>
                                <p className="text-sm">{formatCurrency(data.summary?.[t.key]?.revenue || 0)} revenue</p>
                                <p className="text-xs mt-2 opacity-70">{t.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-stone-700">
                                <th className="text-left py-3 px-4 text-stone-400">Item</th>
                                <th className="text-center py-3 px-4 text-stone-400">Tier</th>
                                <th className="text-right py-3 px-4 text-stone-400">Revenue</th>
                                <th className="text-right py-3 px-4 text-stone-400">Units Sold</th>
                                <th className="text-right py-3 px-4 text-stone-400">% of Total</th>
                            </tr></thead>
                            <tbody>
                                {(data.items || []).slice(0, 50).map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800">
                                        <td className="py-3 px-4">{item.name}</td>
                                        <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${item.tier === 'A' ? 'bg-emerald-500/20 text-emerald-400' : item.tier === 'B' ? 'bg-blue-500/20 text-blue-400' : 'bg-stone-500/20 text-stone-400'}`}>{item.tier}</span></td>
                                        <td className="py-3 px-4 text-right font-mono text-emerald-400">{formatCurrency(item.revenue)}</td>
                                        <td className="py-3 px-4 text-right">{item.units}</td>
                                        <td className="py-3 px-4 text-right">{item.percentOfTotal?.toFixed(1)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : <p className="text-center text-stone-500 py-20">No data</p>}
        </div>
    )
}
