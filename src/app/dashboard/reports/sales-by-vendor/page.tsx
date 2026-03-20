'use client'

import { useState, useEffect } from 'react'
import { Truck } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, ReportTable, MiniBar, Badge, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function SalesByVendorPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/sales-by-vendor?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    const maxRev = data?.vendors?.[0]?.revenue || 1

    return (
        <ReportShell title="Sales by Vendor" subtitle="Revenue and margin analysis by supplier" icon={<Truck className="h-8 w-8 text-orange-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.vendors || [], 'sales_by_vendor')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Vendors" value={data.vendors?.length || 0} color="text-orange-400" bgGlow="from-orange-500 to-transparent" />
                        <KpiCard label="Top Vendor Revenue" value={fmtCurrency(data.vendors?.[0]?.revenue || 0)} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Vendor Performance" icon={<Truck className="h-5 w-5 text-orange-400" />}>
                    {data.vendors?.map((v: any, i: number) => (
                        <div key={i} className="py-3 border-b border-stone-800/50 last:border-0">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">{v.vendor}</span>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-emerald-400 font-mono">{fmtCurrency(v.revenue)}</span>
                                    <Badge text={`${v.marginPct}% margin`} color={v.marginPct >= 30 ? 'green' : v.marginPct >= 15 ? 'yellow' : 'red'} />
                                    <span className="text-stone-400">{v.unitsSold} units</span>
                                </div>
                            </div>
                            <MiniBar value={v.revenue} max={maxRev} color={i % 3 === 0 ? 'bg-orange-500' : i % 3 === 1 ? 'bg-amber-500' : 'bg-yellow-600'} />
                        </div>
                    ))}
                </SectionCard>
            </>)}
        </ReportShell>
    )
}
