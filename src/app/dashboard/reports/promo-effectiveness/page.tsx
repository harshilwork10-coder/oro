'use client'

import { useState, useEffect } from 'react'
import { Megaphone, TrendingUp } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function PromoEffectivenessPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/promo-effectiveness?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    const statusColor = (s: string): 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' => {
        if (s === 'ACTIVE') return 'green'; if (s === 'EXPIRED') return 'gray'; if (s === 'SCHEDULED') return 'blue'; return 'yellow'
    }

    return (
        <ReportShell title="Promotion Effectiveness" subtitle="How your deals and promos are performing" icon={<Megaphone className="h-8 w-8 text-pink-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.promotions?.map((p: any) => ({ name: p.name, status: p.status, revenue: p.performance?.revenue, units: p.performance?.unitsSold })) || [], 'promo_effectiveness')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Total Promos" value={data.summary?.total || 0} color="text-pink-400" bgGlow="from-pink-500 to-transparent" />
                        <KpiCard label="Active Now" value={data.summary?.active || 0} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                        <KpiCard label="Promo Revenue" value={fmtCurrency(data.summary?.totalPromoRevenue || 0)} color="text-amber-400" bgGlow="from-amber-500 to-transparent" />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Promotions" icon={<Megaphone className="h-5 w-5 text-pink-400" />}>
                    {data.promotions?.map((promo: any, i: number) => (
                        <div key={i} className="py-4 border-b border-stone-800/50 last:border-0">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-lg">{promo.name}</h3>
                                    {promo.description && <p className="text-sm text-stone-400 mt-0.5">{promo.description}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge text={promo.status} color={statusColor(promo.status)} />
                                    <Badge text={promo.type || 'DEAL'} color="purple" />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4 mt-3">
                                <div className="bg-stone-800/50 rounded-xl p-3">
                                    <p className="text-xs text-stone-400">Revenue</p>
                                    <p className="text-lg font-bold text-emerald-400">{fmtCurrency(promo.performance?.revenue || 0)}</p>
                                </div>
                                <div className="bg-stone-800/50 rounded-xl p-3">
                                    <p className="text-xs text-stone-400">Units Sold</p>
                                    <p className="text-lg font-bold text-blue-400">{promo.performance?.unitsSold || 0}</p>
                                </div>
                                <div className="bg-stone-800/50 rounded-xl p-3">
                                    <p className="text-xs text-stone-400">Products</p>
                                    <p className="text-lg font-bold text-pink-400">{promo.productCount}</p>
                                </div>
                                <div className="bg-stone-800/50 rounded-xl p-3">
                                    <p className="text-xs text-stone-400">Period</p>
                                    <p className="text-xs text-stone-300 mt-1">
                                        {promo.startDate ? new Date(promo.startDate).toLocaleDateString() : '-'} — {promo.endDate ? new Date(promo.endDate).toLocaleDateString() : 'Ongoing'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </SectionCard>
            </>)}
        </ReportShell>
    )
}
