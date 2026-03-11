'use client'

import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, ReportTable, MiniBar, Badge, fetchReport, fmtCurrency, fmtPct, exportToCSV } from '@/components/reports/ReportComponents'

export default function SalesByCategoryPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/sales-by-category?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    const maxRev = data?.categories?.[0]?.revenue || 1

    return (
        <ReportShell title="Sales by Category" subtitle="Revenue breakdown by product category and department" icon={<BarChart3 className="h-8 w-8 text-blue-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.categories || [], 'sales_by_category')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Total Revenue" value={fmtCurrency(data.totals?.revenue)} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                        <KpiCard label="Gross Profit" value={fmtCurrency(data.totals?.grossProfit)} color="text-blue-400" bgGlow="from-blue-500 to-transparent" />
                        <KpiCard label="Categories" value={data.totals?.totalCategories || 0} color="text-purple-400" bgGlow="from-purple-500 to-transparent" />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Category Performance" icon={<BarChart3 className="h-5 w-5 text-blue-400" />}>
                    {data.categories?.map((cat: any, i: number) => (
                        <div key={i} className="py-3 border-b border-stone-800/50 last:border-0">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <span className="font-medium">{cat.category}</span>
                                    {cat.department && <span className="text-xs text-stone-500 ml-2">({cat.department})</span>}
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-emerald-400 font-mono">{fmtCurrency(cat.revenue)}</span>
                                    <Badge text={`${cat.marginPct}% margin`} color={cat.marginPct >= 30 ? 'green' : cat.marginPct >= 15 ? 'yellow' : 'red'} />
                                    <span className="text-stone-400">{cat.unitsSold} units</span>
                                </div>
                            </div>
                            <MiniBar value={cat.revenue} max={maxRev} color={i < 3 ? 'bg-emerald-500' : i < 6 ? 'bg-blue-500' : 'bg-stone-600'} />
                        </div>
                    ))}
                </SectionCard>
            </>)}
        </ReportShell>
    )
}
