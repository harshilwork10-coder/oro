'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, TrendingUp, DollarSign, ShoppingBag, RefreshCw, Trophy, ArrowUpDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import useApiCache from '@/hooks/useApiCache'
import DashboardChart from '@/components/charts/DashboardChart'

export default function MultiStoreComparisonPage() {
    const [days, setDays] = useState(7)
    const { data, loading, refresh } = useApiCache(`/api/reports/multi-store-comparison?days=${days}`, { ttl: 300000 })
    const [sort, setSort] = useState<'revenue' | 'transactions' | 'avgTicket'>('revenue')

    const comparison = (data?.comparison || []).sort((a: any, b: any) => b[sort] - a[sort])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/owner/reports-hub" className="p-2 hover:bg-stone-800 rounded-lg"><ArrowLeft className="h-6 w-6" /></Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold flex items-center gap-2"><Building2 className="h-8 w-8 text-blue-400" /> Multi-Store Comparison</h1>
                    <p className="text-stone-400">{data?.locationCount || 0} locations • {data?.period || ''}</p>
                </div>
                <select value={days} onChange={e => setDays(Number(e.target.value))} className="bg-stone-800 border border-stone-600 rounded-xl px-4 py-2">
                    {[7, 14, 30, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}
                </select>
            </div>

            {loading ? <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div> : (
                <>
                    {/* Total KPI */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6 mb-6">
                        <p className="text-sm text-stone-400">Total Revenue — All Locations</p>
                        <p className="text-4xl font-bold text-blue-400">{formatCurrency(data?.totalRevenue || 0)}</p>
                    </div>

                    {/* Chart */}
                    {comparison.length > 1 && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-6">
                            <h3 className="text-lg font-semibold mb-4">Revenue by Location</h3>
                            <DashboardChart type="bar" width={600} height={200}
                                data={comparison.map((l: any) => ({ label: l.name || 'Store', value: l.revenue }))} />
                        </div>
                    )}

                    {/* Sort Buttons */}
                    <div className="flex gap-2 mb-4">
                        {[
                            { key: 'revenue', label: 'Revenue', icon: DollarSign },
                            { key: 'transactions', label: 'Transactions', icon: ShoppingBag },
                            { key: 'avgTicket', label: 'Avg Ticket', icon: TrendingUp },
                        ].map(s => (
                            <button key={s.key} onClick={() => setSort(s.key as any)}
                                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm ${sort === s.key ? 'bg-blue-600' : 'bg-stone-800 hover:bg-stone-700'}`}>
                                <s.icon className="h-4 w-4" /> {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Rankings Table */}
                    <div className="space-y-3">
                        {comparison.map((loc: any, i: number) => (
                            <div key={loc.locationId} className={`bg-stone-900/80 border rounded-2xl p-5 ${i === 0 ? 'border-amber-500/50 bg-amber-500/5' : i === 1 ? 'border-stone-400/30' : i === 2 ? 'border-orange-800/30' : 'border-stone-700'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className={`text-2xl font-bold w-8 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-stone-300' : i === 2 ? 'text-orange-700' : 'text-stone-500'}`}>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                        </span>
                                        <div>
                                            <p className="text-lg font-semibold">{loc.name}</p>
                                            <p className="text-xs text-stone-500">{loc.address}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-8 text-right">
                                        <div>
                                            <p className="text-lg font-bold text-emerald-400">{formatCurrency(loc.revenue)}</p>
                                            <p className="text-[10px] text-stone-500">Revenue</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold">{loc.transactions}</p>
                                            <p className="text-[10px] text-stone-500">Transactions</p>
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-blue-400">{formatCurrency(loc.avgTicket)}</p>
                                            <p className="text-[10px] text-stone-500">Avg Ticket</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
