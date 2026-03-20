'use client'

import { useState, useEffect } from 'react'
import { Warehouse, DollarSign } from 'lucide-react'
import { ReportShell, KpiCard, SectionCard, MiniBar, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function InventoryValuationPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const load = () => { setLoading(true); fetchReport('/api/reports/inventory-valuation').then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [])

    const maxCatValue = data?.categoryBreakdown?.[0]?.costValue || 1

    return (
        <ReportShell title="Inventory Valuation" subtitle="Total value of stock at cost and retail" icon={<Warehouse className="h-8 w-8 text-indigo-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.categoryBreakdown || [], 'inventory_valuation')}>
            {data && (<>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <KpiCard label="At Cost" value={fmtCurrency(data.totalCostValue || 0)} color="text-indigo-400" bgGlow="from-indigo-500 to-transparent" />
                    <KpiCard label="At Retail" value={fmtCurrency(data.totalRetailValue || 0)} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                    <KpiCard label="Potential Profit" value={fmtCurrency(data.potentialProfit || 0)} color="text-amber-400" bgGlow="from-amber-500 to-transparent" />
                    <KpiCard label="Total SKUs" value={data.totalProducts || 0} color="text-blue-400" bgGlow="from-blue-500 to-transparent" />
                </div>

                <SectionCard title="By Category" icon={<DollarSign className="h-5 w-5 text-indigo-400" />}>
                    {data.categoryBreakdown?.map((cat: any, i: number) => {
                        const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500']
                        return (
                            <div key={i} className="py-3 border-b border-stone-800/50 last:border-0">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium">{cat.category}</span>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-stone-400">{cat.itemCount} SKUs</span>
                                        <span className="text-indigo-400 font-mono">{fmtCurrency(cat.costValue)} cost</span>
                                        <span className="text-emerald-400 font-mono">{fmtCurrency(cat.retailValue)} retail</span>
                                    </div>
                                </div>
                                <MiniBar value={cat.costValue} max={maxCatValue} color={colors[i % colors.length]} />
                            </div>
                        )
                    })}
                </SectionCard>
            </>)}
        </ReportShell>
    )
}
