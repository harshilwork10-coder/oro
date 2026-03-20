'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function SalesByHourPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/sales-by-hour?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    const maxHourRev = data?.hourly ? Math.max(...data.hourly.map((h: any) => h.revenue)) : 1

    // Color intensity for heatmap
    const getBarColor = (rev: number) => {
        const pct = maxHourRev > 0 ? rev / maxHourRev : 0
        if (pct > 0.8) return 'bg-emerald-500'
        if (pct > 0.6) return 'bg-emerald-600'
        if (pct > 0.4) return 'bg-blue-500'
        if (pct > 0.2) return 'bg-blue-600'
        if (pct > 0) return 'bg-stone-600'
        return 'bg-stone-800'
    }

    return (
        <ReportShell title="Sales by Hour & Day" subtitle="Identify peak hours for staffing and promotions" icon={<Clock className="h-8 w-8 text-amber-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.hourly || [], 'sales_by_hour')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Peak Hour" value={data.insights?.peakHour?.label || '-'} color="text-amber-400" bgGlow="from-amber-500 to-transparent" />
                        <KpiCard label="Peak Day" value={data.insights?.peakDay?.label || '-'} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                        <KpiCard label="Total Revenue" value={fmtCurrency(data.totalRevenue || 0)} color="text-blue-400" bgGlow="from-blue-500 to-transparent" />
                        <KpiCard label="Transactions" value={data.totalTransactions || 0} color="text-purple-400" bgGlow="from-purple-500 to-transparent" />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard title="Hourly Revenue" icon={<Clock className="h-5 w-5 text-amber-400" />}>
                        <div className="space-y-1">
                            {data.hourly?.map((h: any) => (
                                <div key={h.hour} className="flex items-center gap-2">
                                    <span className="text-xs text-stone-400 w-10 text-right font-mono">{h.label}</span>
                                    <div className="flex-1 h-5 bg-stone-800 rounded overflow-hidden">
                                        <div className={`h-full rounded transition-all duration-500 ${getBarColor(h.revenue)}`}
                                            style={{ width: `${maxHourRev > 0 ? (h.revenue / maxHourRev) * 100 : 0}%` }} />
                                    </div>
                                    <span className="text-xs font-mono text-stone-400 w-20 text-right">{fmtCurrency(h.revenue)}</span>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard title="Day of Week" icon={<Clock className="h-5 w-5 text-emerald-400" />}>
                        {data.byDayOfWeek?.map((d: any) => {
                            const maxDayRev = Math.max(...(data.byDayOfWeek?.map((x: any) => x.revenue) || [1]))
                            return (
                                <div key={d.day} className="flex items-center gap-3 py-2 border-b border-stone-800/50 last:border-0">
                                    <span className="text-sm font-medium w-24">{d.label}</span>
                                    <div className="flex-1 h-4 bg-stone-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                                            style={{ width: `${maxDayRev > 0 ? (d.revenue / maxDayRev) * 100 : 0}%` }} />
                                    </div>
                                    <div className="text-right w-28">
                                        <span className="text-sm font-mono text-emerald-400">{fmtCurrency(d.revenue)}</span>
                                        <br /><span className="text-xs text-stone-500">{d.avgTxCount || d.txCount} txns</span>
                                    </div>
                                </div>
                            )
                        })}
                    </SectionCard>
                </div>
            </>)}
        </ReportShell>
    )
}
