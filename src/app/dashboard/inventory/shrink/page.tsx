'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingDown, DollarSign, MapPin, User, Package } from 'lucide-react'

export default function ShrinkDashboardPage() {
    const [report, setReport] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/inventory/shrink-report?days=${days}`)
            .then(r => r.json())
            .then(d => { setReport(d); setLoading(false) })
            .catch(() => setLoading(false))
    }, [days])

    const totalShrinkValue = report?.byReason?.reduce((s: number, r: any) => s + Number(r._sum?.quantity || 0), 0) || 0

    return (
        <div className="min-h-screen bg-stone-950 text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <AlertTriangle className="h-8 w-8 text-red-400" />
                            Shrink & Damage Dashboard
                        </h1>
                        <p className="text-stone-400 mt-1">Track inventory loss by reason, category, location, and employee</p>
                    </div>
                    <div className="flex gap-2">
                        {[7, 30, 90].map(d => (
                            <button key={d} onClick={() => setDays(d)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${days === d ? 'bg-red-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-stone-500">Loading shrink data...</div>
                ) : !report ? (
                    <div className="text-center py-20 bg-stone-900 rounded-2xl border border-stone-800">
                        <Package className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-500">No shrink data found for this period.</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <TrendingDown className="h-5 w-5 text-red-400" />
                                    <span className="text-stone-400 text-sm">Total Shrink Units</span>
                                </div>
                                <div className="text-3xl font-bold text-red-400">{Math.abs(totalShrinkValue)}</div>
                            </div>
                            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                                    <span className="text-stone-400 text-sm">Reason Categories</span>
                                </div>
                                <div className="text-3xl font-bold text-amber-400">{report.byReason?.length || 0}</div>
                            </div>
                            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <MapPin className="h-5 w-5 text-blue-400" />
                                    <span className="text-stone-400 text-sm">Locations Affected</span>
                                </div>
                                <div className="text-3xl font-bold text-blue-400">{report.byLocation?.length || 0}</div>
                            </div>
                        </div>

                        {/* By Reason */}
                        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 mb-6">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-400" /> By Reason</h2>
                            <div className="space-y-3">
                                {report.byReason?.map((r: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between bg-stone-800 rounded-lg p-3">
                                        <span className="font-medium text-stone-300">{r.reason || 'Unknown'}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-stone-400 text-sm">{r._count?.id || 0} events</span>
                                            <span className="text-red-400 font-bold">{Math.abs(Number(r._sum?.quantity || 0))} units</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Lost Items */}
                        {report.topItems?.length > 0 && (
                            <div className="bg-stone-900 border border-stone-800 rounded-xl p-6">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-amber-400" /> Top Lost Items</h2>
                                <div className="space-y-2">
                                    {report.topItems?.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between bg-stone-800 rounded-lg p-3">
                                            <span className="text-stone-300">{item.product?.name || item.productId}</span>
                                            <span className="text-red-400 font-bold">{Math.abs(Number(item._sum?.quantity || 0))} units</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
