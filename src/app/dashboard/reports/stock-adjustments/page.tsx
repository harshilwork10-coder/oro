'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function StockAdjustmentsPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/stock-adjustments?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    const reasonColor = (r: string): 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' => {
        if (r === 'RESTOCK') return 'green'; if (r === 'THEFT') return 'red'; if (r === 'DAMAGE') return 'yellow'; if (r === 'SALE') return 'blue'; return 'gray'
    }

    return (
        <ReportShell title="Stock Adjustments" subtitle="Inventory changes — restocks, damages, theft, and corrections" icon={<ClipboardList className="h-8 w-8 text-teal-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.adjustments || [], 'stock_adjustments')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Total Adjustments" value={data.summary?.totalAdjustments || 0} color="text-teal-400" bgGlow="from-teal-500 to-transparent" />
                        {data.summary?.byReason && Object.entries(data.summary.byReason).slice(0, 3).map(([reason, info]: any) => (
                            <KpiCard key={reason} label={reason} value={`${info.count} (${fmtCurrency(info.totalDollars)})`} color="text-stone-300" />
                        ))}
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Adjustment Log" icon={<ClipboardList className="h-5 w-5 text-teal-400" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-700 text-xs text-stone-400">
                                    <th className="py-2 px-3 text-left">Date</th>
                                    <th className="py-2 px-3 text-left">Product</th>
                                    <th className="py-2 px-3 text-left">Reason</th>
                                    <th className="py-2 px-3 text-right">Qty</th>
                                    <th className="py-2 px-3 text-right">$ Impact</th>
                                    <th className="py-2 px-3 text-left">Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.adjustments?.map((adj: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors">
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{new Date(adj.date).toLocaleDateString()}</td>
                                        <td className="py-2.5 px-3 font-medium">{adj.product}</td>
                                        <td className="py-2.5 px-3"><Badge text={adj.reason} color={reasonColor(adj.reason)} /></td>
                                        <td className="py-2.5 px-3 text-right font-mono">
                                            <span className={adj.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                                {adj.quantity > 0 ? '+' : ''}{adj.quantity}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-amber-400">{fmtCurrency(adj.dollarImpact)}</td>
                                        <td className="py-2.5 px-3 text-sm text-stone-400">{adj.location}</td>
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
