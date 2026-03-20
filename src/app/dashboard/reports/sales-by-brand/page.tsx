'use client'

import { useState, useEffect } from 'react'
import { Tag } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, MiniBar, Badge, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function SalesByBrandPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/sales-by-brand?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    const maxRev = data?.brands?.[0]?.revenue || 1
    const brandColors = ['bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500']

    return (
        <ReportShell title="Sales by Brand" subtitle="Performance analysis of each brand you carry" icon={<Tag className="h-8 w-8 text-violet-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.brands || [], 'sales_by_brand')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Brands" value={data.brands?.length || 0} color="text-violet-400" bgGlow="from-violet-500 to-transparent" />
                        <KpiCard label="Top Brand" value={data.brands?.[0]?.brand || '-'} color="text-fuchsia-400" bgGlow="from-fuchsia-500 to-transparent" />
                        <KpiCard label="Top Revenue" value={fmtCurrency(data.brands?.[0]?.revenue || 0)} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Brand Rankings" icon={<Tag className="h-5 w-5 text-violet-400" />}>
                    {data.brands?.map((b: any, i: number) => (
                        <div key={i} className="py-3 border-b border-stone-800/50 last:border-0">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-300">{i + 1}</span>
                                    <span className="font-medium">{b.brand}</span>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-emerald-400 font-mono">{fmtCurrency(b.revenue)}</span>
                                    <Badge text={`${b.marginPct}%`} color={b.marginPct >= 30 ? 'green' : b.marginPct >= 15 ? 'yellow' : 'red'} />
                                    <span className="text-stone-400">{b.unitsSold} units</span>
                                </div>
                            </div>
                            <MiniBar value={b.revenue} max={maxRev} color={brandColors[i % brandColors.length]} />
                        </div>
                    ))}
                </SectionCard>
            </>)}
        </ReportShell>
    )
}
