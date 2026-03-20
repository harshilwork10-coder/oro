'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, RefreshCw, AlertTriangle, AlertCircle, Info } from 'lucide-react'

export default function LossPreventionPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(7)

    useEffect(() => { setLoading(true); fetch(`/api/reports/loss-prevention?days=${days}`).then(r => r.json()).then(d => { setData(d.data?.dashboard); setLoading(false) }).catch(() => setLoading(false)) }, [days])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div><h1 className="text-3xl font-bold flex items-center gap-2"><ShieldAlert className="h-8 w-8 text-red-500" /> Loss Prevention</h1><p className="text-stone-400">Security risk dashboard</p></div>
                </div>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2">
                    <option value={1}>Today</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
                </select>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <>
                    <div className={`text-center p-8 rounded-2xl mb-6 border ${data.riskLevel === 'HIGH' ? 'bg-red-500/10 border-red-500/50' : data.riskLevel === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-emerald-500/10 border-emerald-500/50'}`}>
                        <p className="text-6xl font-bold">{data.riskScore}</p>
                        <p className={`text-xl font-semibold mt-2 ${data.riskLevel === 'HIGH' ? 'text-red-400' : data.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'}`}>{data.riskLevel} RISK</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Voids', val: data.voidCount, sub: `${data.voidRate}%`, color: data.voidRate > 5 ? 'text-red-400' : 'text-stone-300' },
                            { label: 'Refunds', val: data.refundCount, sub: `${data.refundRate}%`, color: data.refundRate > 5 ? 'text-red-400' : 'text-stone-300' },
                            { label: 'No-Sales', val: data.noSaleCount, sub: 'drawer opens', color: data.noSaleCount > 10 ? 'text-amber-400' : 'text-stone-300' },
                            { label: 'Cash Variance', val: `$${data.cashVariance?.toFixed(2)}`, sub: `${data.shortShifts} short`, color: data.shortShifts > 0 ? 'text-amber-400' : 'text-stone-300' },
                        ].map(s => (
                            <div key={s.label} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                                <p className="text-sm text-stone-400">{s.label}</p>
                                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.val}</p>
                                <p className="text-xs text-stone-500">{s.sub}</p>
                            </div>
                        ))}
                    </div>

                    {data.alerts?.length > 0 && (
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold mb-3">Alerts</h2>
                            {data.alerts.map((a: any, i: number) => (
                                <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${a.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30' : a.severity === 'WARNING' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                                    {a.severity === 'CRITICAL' ? <AlertTriangle className="h-5 w-5 text-red-400" /> : a.severity === 'WARNING' ? <AlertCircle className="h-5 w-5 text-amber-400" /> : <Info className="h-5 w-5 text-blue-400" />}
                                    <span>{a.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : <p className="text-center py-20 text-stone-500">No data</p>}
        </div>
    )
}
