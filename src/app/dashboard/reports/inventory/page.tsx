'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Package, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function InventoryReportPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/pulse/low-stock')
            .then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div><h1 className="text-3xl font-bold flex items-center gap-2"><Package className="h-8 w-8 text-blue-500" /> Inventory Report</h1>
                    <p className="text-stone-400">Stock levels and low-stock alerts</p></div>
            </div>
            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
                            <p className="text-sm text-red-400">Critical</p>
                            <p className="text-3xl font-bold text-red-400">{data.summary?.critical || 0}</p>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5">
                            <p className="text-sm text-orange-400">Warning</p>
                            <p className="text-3xl font-bold text-orange-400">{data.summary?.warning || 0}</p>
                        </div>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5">
                            <p className="text-sm text-yellow-400">Low</p>
                            <p className="text-3xl font-bold text-yellow-400">{data.summary?.low || 0}</p>
                        </div>
                    </div>
                    {(data.alerts || []).length > 0 && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-stone-700">
                                    <th className="text-left py-3 px-4 text-stone-400">Item</th>
                                    <th className="text-right py-3 px-4 text-stone-400">Current Stock</th>
                                    <th className="text-right py-3 px-4 text-stone-400">Min Level</th>
                                    <th className="text-right py-3 px-4 text-stone-400">Severity</th>
                                </tr></thead>
                                <tbody>{(data.alerts || []).slice(0, 30).map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800">
                                        <td className="py-3 px-4">{item.name}</td>
                                        <td className="py-3 px-4 text-right">{item.currentStock}</td>
                                        <td className="py-3 px-4 text-right text-stone-400">{item.minStock}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className={`px-2 py-1 rounded text-xs ${item.severity === 'critical' ? 'bg-red-500/20 text-red-400' : item.severity === 'warning' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{item.severity}</span>
                                        </td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : <p className="text-center text-stone-500 py-20">No inventory alerts.</p>}
        </div>
    )
}
