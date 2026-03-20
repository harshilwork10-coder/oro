'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, AlertTriangle, PackageX } from 'lucide-react'
import { ReportShell, KpiCard, SectionCard, Badge, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function ReorderPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const load = () => { setLoading(true); fetchReport('/api/reports/reorder').then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [])

    const urgencyColor = (u: string) => u === 'OUT_OF_STOCK' ? 'red' : u === 'CRITICAL' ? 'yellow' : 'blue'

    return (
        <ReportShell title="Reorder Report" subtitle="Items below reorder point — act now" icon={<ShoppingCart className="h-8 w-8 text-red-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.items || [], 'reorder_report')}>
            {data && (<>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <KpiCard label="Items to Reorder" value={data.summary?.totalItems || 0} color="text-red-400" bgGlow="from-red-500 to-transparent" icon={<AlertTriangle className="h-4 w-4 text-red-400" />} />
                    <KpiCard label="Out of Stock" value={data.summary?.outOfStock || 0} color="text-red-500" bgGlow="from-red-600 to-transparent" icon={<PackageX className="h-4 w-4 text-red-500" />} />
                    <KpiCard label="Critical Low" value={data.summary?.critical || 0} color="text-amber-400" bgGlow="from-amber-500 to-transparent" />
                    <KpiCard label="Est. Order Cost" value={fmtCurrency(data.summary?.estimatedOrderCost || 0)} color="text-blue-400" bgGlow="from-blue-500 to-transparent" />
                </div>

                <SectionCard title="Items Needing Reorder" icon={<ShoppingCart className="h-5 w-5 text-red-400" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-700 text-xs text-stone-400">
                                    <th className="py-2 px-3 text-left">Urgency</th>
                                    <th className="py-2 px-3 text-left">Product</th>
                                    <th className="py-2 px-3 text-left">Barcode</th>
                                    <th className="py-2 px-3 text-right">Current Stock</th>
                                    <th className="py-2 px-3 text-right">Reorder Point</th>
                                    <th className="py-2 px-3 text-right">Suggested Qty</th>
                                    <th className="py-2 px-3 text-right">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items?.map((item: any, i: number) => (
                                    <tr key={i} className={`border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors ${item.urgency === 'OUT_OF_STOCK' ? 'bg-red-900/10' : ''}`}>
                                        <td className="py-2.5 px-3"><Badge text={item.urgency?.replace('_', ' ')} color={urgencyColor(item.urgency)} /></td>
                                        <td className="py-2.5 px-3 font-medium">{item.name}</td>
                                        <td className="py-2.5 px-3 font-mono text-xs text-stone-400">{item.barcode || '-'}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-red-400">{item.currentStock}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-stone-400">{item.reorderPoint}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">{item.suggestedQty}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-stone-300">{fmtCurrency(item.estimatedCost)}</td>
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
