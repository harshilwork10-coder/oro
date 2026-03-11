'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function GrossMarginPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/gross-margin?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    return (
        <ReportShell title="Gross Margin Analysis" subtitle="Per-item profitability with margin alerts" icon={<TrendingUp className="h-8 w-8 text-emerald-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.items || [], 'gross_margin')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Overall Margin" value={`${data.overallMargin || 0}%`} color={data.overallMargin >= 30 ? 'text-emerald-400' : 'text-amber-400'} bgGlow="from-emerald-500 to-transparent" />
                        <KpiCard label="Total Revenue" value={fmtCurrency(data.totalRevenue || 0)} color="text-blue-400" bgGlow="from-blue-500 to-transparent" />
                        <KpiCard label="Gross Profit" value={fmtCurrency(data.totalProfit || 0)} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                        {data.negativeMarginCount > 0 && (
                            <KpiCard label="⚠️ Negative Margins" value={data.negativeMarginCount} color="text-red-400" bgGlow="from-red-500 to-transparent" />
                        )}
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Item Profitability" icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-700 text-xs text-stone-400">
                                    <th className="py-2 px-3 text-left">Product</th>
                                    <th className="py-2 px-3 text-right">Revenue</th>
                                    <th className="py-2 px-3 text-right">COGS</th>
                                    <th className="py-2 px-3 text-right">Profit</th>
                                    <th className="py-2 px-3 text-right">Margin</th>
                                    <th className="py-2 px-3 text-right">Markup</th>
                                    <th className="py-2 px-3 text-right">Units</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items?.map((item: any, i: number) => (
                                    <tr key={i} className={`border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors ${item.negativeMargin ? 'bg-red-900/10' : ''}`}>
                                        <td className="py-2.5 px-3">
                                            <span className="font-medium">{item.name}</span>
                                            {item.negativeMargin && <AlertTriangle className="h-3.5 w-3.5 text-red-400 inline ml-2" />}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono">{fmtCurrency(item.revenue)}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-stone-400">{fmtCurrency(item.cogs)}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{fmtCurrency(item.grossProfit)}</td>
                                        <td className="py-2.5 px-3 text-right">
                                            <Badge text={`${item.marginPct}%`} color={item.marginPct >= 30 ? 'green' : item.marginPct >= 15 ? 'yellow' : 'red'} />
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-stone-300">{item.markupPct}%</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-stone-400">{item.unitsSold}</td>
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
