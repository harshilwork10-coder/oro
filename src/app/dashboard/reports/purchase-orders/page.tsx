'use client'

import { useState, useEffect } from 'react'
import { FileText, Package } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function PurchaseOrdersPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(90)

    const load = () => { setLoading(true); fetchReport(`/api/reports/purchase-orders?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    const statusColor = (s: string): 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' => {
        if (s === 'RECEIVED') return 'green'; if (s === 'ORDERED') return 'blue'; if (s === 'PARTIALLY_RECEIVED') return 'yellow'; if (s === 'CANCELLED') return 'red'; return 'gray'
    }

    return (
        <ReportShell title="Purchase Orders" subtitle="Track orders by status, supplier, and spend" icon={<FileText className="h-8 w-8 text-sky-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.orders || [], 'purchase_orders')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Total Orders" value={data.summary?.totalOrders || 0} color="text-sky-400" bgGlow="from-sky-500 to-transparent" />
                        <KpiCard label="Total Spend" value={fmtCurrency(data.summary?.totalSpend || 0)} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                        {data.summary?.byStatus?.ORDERED && (
                            <KpiCard label="Pending" value={data.summary.byStatus.ORDERED.count} color="text-amber-400" bgGlow="from-amber-500 to-transparent" />
                        )}
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Orders" icon={<Package className="h-5 w-5 text-sky-400" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-700 text-xs text-stone-400">
                                    <th className="py-2 px-3 text-left">Order #</th>
                                    <th className="py-2 px-3 text-left">Supplier</th>
                                    <th className="py-2 px-3 text-left">Status</th>
                                    <th className="py-2 px-3 text-right">Items</th>
                                    <th className="py-2 px-3 text-right">Total Cost</th>
                                    <th className="py-2 px-3 text-left">Expected</th>
                                    <th className="py-2 px-3 text-left">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.orders?.map((po: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors">
                                        <td className="py-2.5 px-3 font-mono text-sky-400">{po.orderNumber || po.id?.slice(0, 8)}</td>
                                        <td className="py-2.5 px-3 font-medium">{po.supplier}</td>
                                        <td className="py-2.5 px-3"><Badge text={po.status?.replace('_', ' ')} color={statusColor(po.status)} /></td>
                                        <td className="py-2.5 px-3 text-right font-mono">{po.itemCount}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{fmtCurrency(po.totalCost)}</td>
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '-'}</td>
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{new Date(po.createdAt).toLocaleDateString()}</td>
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
