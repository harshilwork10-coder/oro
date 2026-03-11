'use client'

import { useState, useEffect } from 'react'
import { ScanBarcode, Search } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function SalesBySkuPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(7)
    const [search, setSearch] = useState('')

    const load = () => { setLoading(true); fetchReport(`/api/reports/sales-by-sku?days=${days}${search ? `&search=${search}` : ''}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    return (
        <ReportShell title="Sales by SKU / Barcode" subtitle="Look up any product by scanning or searching" icon={<ScanBarcode className="h-8 w-8 text-cyan-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.items || [], 'sales_by_sku')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <KpiCard label="Products Sold" value={data.pagination?.total || 0} color="text-cyan-400" bgGlow="from-cyan-500 to-transparent" />
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                            <input type="text" placeholder="Search barcode, SKU, name..." value={search}
                                onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()}
                                className="bg-stone-800 border border-stone-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white w-72 focus:ring-cyan-500 focus:border-cyan-500" />
                        </div>
                        <PeriodSelector value={days} onChange={setDays} />
                    </div>
                </div>

                <SectionCard title="Item Sales Detail" icon={<ScanBarcode className="h-5 w-5 text-cyan-400" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-700 text-xs text-stone-400">
                                    <th className="py-2 px-3 text-left">Product</th>
                                    <th className="py-2 px-3 text-left">Barcode</th>
                                    <th className="py-2 px-3 text-left">SKU</th>
                                    <th className="py-2 px-3 text-left">Category</th>
                                    <th className="py-2 px-3 text-right">Units</th>
                                    <th className="py-2 px-3 text-right">Revenue</th>
                                    <th className="py-2 px-3 text-right">Avg Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items?.map((item: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors">
                                        <td className="py-2.5 px-3 font-medium">{item.name}</td>
                                        <td className="py-2.5 px-3 font-mono text-xs text-cyan-400">{item.barcode || '-'}</td>
                                        <td className="py-2.5 px-3 font-mono text-xs text-stone-400">{item.sku || '-'}</td>
                                        <td className="py-2.5 px-3"><Badge text={item.category} color="blue" /></td>
                                        <td className="py-2.5 px-3 text-right font-mono">{item.unitsSold}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400">{fmtCurrency(item.revenue)}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-stone-300">{fmtCurrency(item.avgPrice)}</td>
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
