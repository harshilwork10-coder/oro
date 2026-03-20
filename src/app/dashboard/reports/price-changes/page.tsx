'use client'

import { useState, useEffect } from 'react'
import { ArrowUpDown, DollarSign } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function PriceChangesPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/price-changes?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    return (
        <ReportShell title="Price Changes Audit" subtitle="Track all price modifications with before/after values" icon={<ArrowUpDown className="h-8 w-8 text-amber-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.changes || [], 'price_changes_audit')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Total Changes" value={data.summary?.totalChanges || 0} color="text-amber-400" bgGlow="from-amber-500 to-transparent" />
                        <KpiCard label="Increases" value={data.summary?.priceIncreases || 0} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" subtitle={`avg ${data.summary?.avgIncrease || 0}%`} />
                        <KpiCard label="Decreases" value={data.summary?.priceDecreases || 0} color="text-red-400" bgGlow="from-red-500 to-transparent" subtitle={`avg ${data.summary?.avgDecrease || 0}%`} />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Price Change Log" icon={<DollarSign className="h-5 w-5 text-amber-400" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-700 text-xs text-stone-400">
                                    <th className="py-2 px-3 text-left">Date</th>
                                    <th className="py-2 px-3 text-left">Item</th>
                                    <th className="py-2 px-3 text-right">Old Price</th>
                                    <th className="py-2 px-3 text-center">→</th>
                                    <th className="py-2 px-3 text-right">New Price</th>
                                    <th className="py-2 px-3 text-right">Change</th>
                                    <th className="py-2 px-3 text-left">Source</th>
                                    <th className="py-2 px-3 text-left">By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.changes?.map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors">
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="py-2.5 px-3 font-medium">{item.itemName}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-stone-400">{fmtCurrency(item.oldPrice)}</td>
                                        <td className="py-2.5 px-3 text-center text-stone-600">→</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-white">{fmtCurrency(item.newPrice)}</td>
                                        <td className="py-2.5 px-3 text-right">
                                            <Badge
                                                text={`${item.changePct >= 0 ? '+' : ''}${item.changePct}% (${item.changeAmount >= 0 ? '+' : ''}${fmtCurrency(item.changeAmount)})`}
                                                color={item.changeAmount >= 0 ? 'green' : 'red'}
                                            />
                                        </td>
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{item.source || '-'}</td>
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{item.changedBy || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </>)}
        </ReportShell>
    )
}
