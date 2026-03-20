'use client'

import Link from 'next/link'
import { ArrowLeft, Activity, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useSmartRefresh } from '@/hooks/useSmartRefresh'

const fetchLiveSales = async () => {
    const res = await fetch('/api/reports/realtime-sales')
    const json = await res.json()
    return json.data?.live
}

export default function RealtimeSalesPage() {
    // 2-min refresh ONLY when tab is visible. Pauses when tab hidden.
    const { data, loading, refresh, lastUpdated } = useSmartRefresh(fetchLiveSales, 2 * 60 * 1000)

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2"><Activity className="h-8 w-8 text-emerald-500" /> Live Sales</h1>
                        <p className="text-stone-400 text-sm">
                            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'} • Refreshes when you&apos;re viewing
                        </p>
                    </div>
                </div>
                <button onClick={refresh} className="flex items-center gap-2 px-4 py-2 bg-stone-700 rounded-xl hover:bg-stone-600 transition-colors">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-sm">Refresh</span>
                </button>
            </div>
            {loading && !data ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : data ? (
                <>
                    <div className="text-center mb-8">
                        <p className="text-stone-400 text-lg">Today&apos;s Revenue</p>
                        <p className="text-6xl font-bold text-emerald-400 mt-2">{formatCurrency(data.todayRevenue || 0)}</p>
                        <div className="flex items-center justify-center gap-2 mt-3">
                            {(data.vsYesterday ?? 0) >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
                            <span className={`text-lg font-semibold ${(data.vsYesterday ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {data.vsYesterday > 0 ? '+' : ''}{isFinite(data.vsYesterday) ? data.vsYesterday?.toFixed(1) : '0.0'}% vs yesterday
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Transactions', val: data.todayTransactions },
                            { label: 'Avg Ticket', val: formatCurrency(data.avgTicket || 0) },
                            { label: 'Last Hour', val: formatCurrency(data.lastHourRevenue || 0) },
                            { label: 'Projected', val: data.projectedRevenue ? formatCurrency(data.projectedRevenue) : '—' },
                        ].map(s => (
                            <div key={s.label} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5 text-center">
                                <p className="text-sm text-stone-400">{s.label}</p>
                                <p className="text-2xl font-bold mt-1">{s.val}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-stone-400">Day Progress</span>
                            <span className="text-sm font-mono">{data.dayProgress}%</span>
                        </div>
                        <div className="w-full bg-stone-700 rounded-full h-3">
                            <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: `${data.dayProgress || 0}%` }} />
                        </div>
                    </div>

                    {data.lastTransaction && (
                        <div className="mt-4 text-center text-sm text-stone-500">
                            Last transaction: {formatCurrency(data.lastTransaction.total)} at {new Date(data.lastTransaction.time).toLocaleTimeString()}
                        </div>
                    )}
                </>
            ) : null}
        </div>
    )
}
