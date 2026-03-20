'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Apple } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function EbtSnapPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/ebt-snap?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    return (
        <ReportShell title="EBT / SNAP Report" subtitle="Government benefit payment tracking and eligible items" icon={<CreditCard className="h-8 w-8 text-green-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.dailyBreakdown || [], 'ebt_snap_report')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <KpiCard label="EBT Transactions" value={data.ebt?.transactions || 0} color="text-green-400" bgGlow="from-green-500 to-transparent" />
                        <KpiCard label="EBT Revenue" value={fmtCurrency(data.ebt?.revenue || 0)} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                        <KpiCard label="% of Total Sales" value={`${data.ebt?.pctOfTotal || 0}%`} color="text-blue-400" bgGlow="from-blue-500 to-transparent" />
                        <KpiCard label="EBT Eligible Items" value={data.catalog?.ebtEligibleItems || 0} color="text-lime-400" bgGlow="from-lime-500 to-transparent" />
                        <KpiCard label="WIC Eligible Items" value={data.catalog?.wicEligibleItems || 0} color="text-amber-400" bgGlow="from-amber-500 to-transparent" />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Daily EBT Activity" icon={<CreditCard className="h-5 w-5 text-green-400" />}>
                    {data.dailyBreakdown?.length > 0 ? (
                        <div className="space-y-2">
                            {data.dailyBreakdown.map((d: any, i: number) => {
                                const maxRev = Math.max(...data.dailyBreakdown.map((x: any) => x.revenue))
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs text-stone-400 w-24 font-mono">{d.date}</span>
                                        <div className="flex-1 h-5 bg-stone-800 rounded overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded transition-all duration-500"
                                                style={{ width: `${maxRev > 0 ? (d.revenue / maxRev) * 100 : 0}%` }} />
                                        </div>
                                        <span className="text-xs font-mono text-emerald-400 w-24 text-right">{fmtCurrency(d.revenue)}</span>
                                        <span className="text-xs text-stone-500 w-16 text-right">{d.count} txns</span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : <p className="text-stone-500 text-center py-6">No EBT transactions this period</p>}
                </SectionCard>
            </>)}
        </ReportShell>
    )
}
