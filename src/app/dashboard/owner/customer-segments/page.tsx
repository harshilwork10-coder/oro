'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Crown, Star, Clock, UserX, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function CustomerSegmentsPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(90)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/customers/segmentation?days=${days}`).then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
    }, [days])

    const segments = [
        { key: 'VIP', icon: Crown, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-500/30', desc: '$500+ & 10+ visits' },
        { key: 'REGULAR', icon: Star, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-500/30', desc: '$200+ or 5+ visits' },
        { key: 'OCCASIONAL', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-500/30', desc: '1+ visit' },
        { key: 'INACTIVE', icon: UserX, color: 'text-stone-400', bg: 'bg-stone-400/10 border-stone-500/30', desc: 'No purchases' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2"><Users className="h-8 w-8 text-indigo-500" /> Customer Segments</h1>
                        <p className="text-stone-400">Understand your customers by spend & frequency</p>
                    </div>
                </div>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2">
                    <option value={30}>Last 30 days</option><option value={60}>Last 60 days</option><option value={90}>Last 90 days</option><option value={180}>Last 6 months</option>
                </select>
            </div>

            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" /></div> : (
                <>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        {segments.map(s => (
                            <div key={s.key} className={`border rounded-2xl p-5 ${s.bg}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <s.icon className={`h-5 w-5 ${s.color}`} />
                                    <span className="font-semibold">{s.key}</span>
                                </div>
                                <p className="text-2xl font-bold">{data?.summary?.[s.key]?.count || 0}</p>
                                <p className="text-sm text-stone-400 mt-1">{formatCurrency(data?.summary?.[s.key]?.revenue || 0)} revenue</p>
                                <p className="text-xs text-stone-500">{s.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-stone-700">
                                <th className="text-left py-3 px-4 text-stone-400">Customer</th>
                                <th className="text-left py-3 px-4 text-stone-400">Segment</th>
                                <th className="text-right py-3 px-4 text-stone-400">Total Spent</th>
                                <th className="text-right py-3 px-4 text-stone-400">Visits</th>
                                <th className="text-right py-3 px-4 text-stone-400">Avg Ticket</th>
                            </tr></thead>
                            <tbody>
                                {(data?.customers || []).slice(0, 50).map((c: any) => (
                                    <tr key={c.id} className="border-b border-stone-800 hover:bg-stone-800/50">
                                        <td className="py-3 px-4 font-medium">{c.name || 'Anonymous'}</td>
                                        <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${c.segment === 'VIP' ? 'bg-amber-500/20 text-amber-400' : c.segment === 'REGULAR' ? 'bg-emerald-500/20 text-emerald-400' : c.segment === 'OCCASIONAL' ? 'bg-blue-500/20 text-blue-400' : 'bg-stone-500/20 text-stone-400'}`}>{c.segment}</span></td>
                                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(c.totalSpent)}</td>
                                        <td className="py-3 px-4 text-right">{c.visits}</td>
                                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(c.avgTicket)}</td>
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
