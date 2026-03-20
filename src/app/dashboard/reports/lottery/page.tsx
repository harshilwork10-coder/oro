'use client'

import { useState, useEffect } from 'react'
import { Ticket, DollarSign, Package } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, MiniBar, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function LotteryPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(7)

    const load = () => { setLoading(true); fetchReport(`/api/reports/lottery?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    return (
        <ReportShell title="Lottery Report" subtitle="Ticket sales, payouts, and pack tracking" icon={<Ticket className="h-8 w-8 text-yellow-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.dailyBreakdown || [], 'lottery_report')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiCard label="Total Sales" value={fmtCurrency(data.summary?.totalSales || 0)} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                        <KpiCard label="Total Payouts" value={fmtCurrency(data.summary?.totalPayouts || 0)} color="text-red-400" bgGlow="from-red-500 to-transparent" />
                        <KpiCard label="Net Revenue" value={fmtCurrency(data.summary?.netRevenue || 0)} color="text-yellow-400" bgGlow="from-yellow-500 to-transparent" />
                        <KpiCard label="Sale Count" value={data.summary?.saleCount || 0} color="text-blue-400" bgGlow="from-blue-500 to-transparent" />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionCard title="Active Packs" icon={<Package className="h-5 w-5 text-yellow-400" />}>
                        {data.activePacks?.length > 0 ? data.activePacks.map((pack: any, i: number) => (
                            <div key={i} className="py-3 border-b border-stone-800/50 last:border-0">
                                <div className="flex justify-between items-center mb-1">
                                    <div>
                                        <span className="font-medium text-yellow-400">{pack.game}</span>
                                        <span className="text-xs text-stone-500 ml-2">#{pack.packNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-stone-400">{pack.sold}/{pack.totalTickets}</span>
                                        <Badge text={`${pack.pctSold}% sold`} color={pack.pctSold >= 75 ? 'green' : pack.pctSold >= 40 ? 'yellow' : 'blue'} />
                                    </div>
                                </div>
                                <MiniBar value={pack.sold} max={pack.totalTickets} color="bg-yellow-500" />
                            </div>
                        )) : <p className="text-stone-500 text-center py-4">No active packs</p>}
                    </SectionCard>

                    <SectionCard title="Daily Net Revenue" icon={<DollarSign className="h-5 w-5 text-emerald-400" />}>
                        {data.dailyBreakdown?.map((d: any, i: number) => {
                            const maxNet = Math.max(...(data.dailyBreakdown?.map((x: any) => Math.abs(x.net)) || [1]))
                            return (
                                <div key={i} className="flex items-center gap-3 py-1.5">
                                    <span className="text-xs text-stone-400 w-24 font-mono">{d.date}</span>
                                    <div className="flex-1 h-4 bg-stone-800 rounded overflow-hidden">
                                        <div className={`h-full rounded transition-all duration-500 ${d.net >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                            style={{ width: `${maxNet > 0 ? (Math.abs(d.net) / maxNet) * 100 : 0}%` }} />
                                    </div>
                                    <span className={`text-xs font-mono w-20 text-right ${d.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtCurrency(d.net)}</span>
                                </div>
                            )
                        })}
                    </SectionCard>
                </div>
            </>)}
        </ReportShell>
    )
}
