'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react'

export default function AnomalyDetectionPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(7)

    useEffect(() => { setLoading(true); fetch(`/api/reports/anomaly-detection?days=${days}`).then(r => r.json()).then(d => { setData(d.data?.anomalies || []); setLoading(false) }).catch(() => setLoading(false)) }, [days])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div><h1 className="text-3xl font-bold flex items-center gap-2"><AlertTriangle className="h-8 w-8 text-rose-500" /> Anomaly Detection</h1><p className="text-stone-400">Unusual cashier patterns</p></div>
                </div>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2">
                    <option value={1}>Today</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option>
                </select>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data.length === 0 ? (
                <div className="text-center py-20 text-stone-500"><AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-30" /><p className="text-lg">No anomalies detected ✓</p><p className="text-sm mt-2">All cashier activity looks normal</p></div>
            ) : (
                <div className="space-y-4">
                    {data.map((emp: any, i: number) => (
                        <div key={i} className={`border rounded-2xl p-6 ${emp.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/40' : 'bg-amber-500/10 border-amber-500/40'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded font-bold text-xs ${emp.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-400' : 'bg-amber-500/30 text-amber-400'}`}>{emp.severity}</span>
                                    <span className="font-semibold text-lg">{emp.name}</span>
                                </div>
                                <span className="text-sm text-stone-400">{emp.totalTransactions} transactions</span>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div><p className="text-xs text-stone-400">Void Rate</p><p className={`text-lg font-mono ${emp.voidRate > 10 ? 'text-red-400' : emp.voidRate > 5 ? 'text-amber-400' : 'text-stone-300'}`}>{emp.voidRate?.toFixed(1)}%</p></div>
                                <div><p className="text-xs text-stone-400">Refund Rate</p><p className={`text-lg font-mono ${emp.refundRate > 8 ? 'text-red-400' : emp.refundRate > 5 ? 'text-amber-400' : 'text-stone-300'}`}>{emp.refundRate?.toFixed(1)}%</p></div>
                                <div><p className="text-xs text-stone-400">No-Sales</p><p className="text-lg font-mono">{emp.noSales || 0}</p></div>
                                <div><p className="text-xs text-stone-400">Flags</p><div className="flex flex-wrap gap-1 mt-1">{(emp.flags || []).map((f: string, j: number) => <span key={j} className="px-2 py-0.5 bg-stone-700 rounded text-xs">{f}</span>)}</div></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
