'use client'

import { useState, useEffect } from 'react'
import { Trash2, AlertOctagon } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, MiniBar, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function WasteDamagePage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/waste-damage?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    const reasonColor = (r: string): 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' => {
        if (r === 'THEFT') return 'red'; if (r === 'DAMAGE' || r === 'BREAKAGE') return 'yellow'; if (r === 'EXPIRED' || r === 'SPOILAGE') return 'purple'; return 'gray'
    }

    return (
        <ReportShell title="Waste / Damage Report" subtitle="Inventory losses from waste, damage, theft, and expiry" icon={<Trash2 className="h-8 w-8 text-rose-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.items || [], 'waste_damage_report')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <KpiCard label="Total Incidents" value={data.summary?.totalIncidents || 0} color="text-rose-400" bgGlow="from-rose-500 to-transparent" icon={<AlertOctagon className="h-4 w-4 text-rose-400" />} />
                        <KpiCard label="Units Lost" value={data.summary?.totalUnitsLost || 0} color="text-amber-400" bgGlow="from-amber-500 to-transparent" />
                        <KpiCard label="Cost Loss" value={fmtCurrency(data.summary?.totalCostLoss || 0)} color="text-red-400" bgGlow="from-red-500 to-transparent" />
                        <KpiCard label="Retail Loss" value={fmtCurrency(data.summary?.totalRetailLoss || 0)} color="text-orange-400" bgGlow="from-orange-500 to-transparent" />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {data.summary?.byReason && Object.entries(data.summary.byReason).map(([reason, info]: any) => (
                        <div key={reason} className="bg-stone-900/80 backdrop-blur border border-stone-700/50 rounded-2xl p-4">
                            <Badge text={reason} color={reasonColor(reason)} />
                            <p className="text-2xl font-bold mt-2 text-white">{info.count} <span className="text-sm text-stone-400 font-normal">incidents</span></p>
                            <p className="text-sm text-stone-400">{info.units} units • {fmtCurrency(info.costLoss)} loss</p>
                        </div>
                    ))}
                </div>

                <SectionCard title="Top Loss Products" icon={<Trash2 className="h-5 w-5 text-rose-400" />}>
                    {data.topLosses?.map((item: any, i: number) => (
                        <div key={i} className="py-3 border-b border-stone-800/50 last:border-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium">{item.name}</span>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-stone-400">{item.units} units</span>
                                    <span className="text-red-400 font-mono">{fmtCurrency(item.totalLoss)}</span>
                                </div>
                            </div>
                            <MiniBar value={item.totalLoss} max={data.topLosses?.[0]?.totalLoss || 1} color="bg-rose-500" />
                        </div>
                    ))}
                </SectionCard>
            </>)}
        </ReportShell>
    )
}
