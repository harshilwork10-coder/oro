'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, AlertTriangle } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, fetchReport, exportToCSV } from '@/components/reports/ReportComponents'

export default function AgeRestrictedLogPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const load = () => { setLoading(true); fetchReport(`/api/reports/age-restricted-log?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    return (
        <ReportShell title="Age-Restricted Sales Log" subtitle="ID verification compliance tracking" icon={<ShieldCheck className="h-8 w-8 text-red-400" />} loading={loading} onRefresh={load} onExportCSV={() => exportToCSV(data?.logs || [], 'age_restricted_log')}>
            {data && (<>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-3">
                        <KpiCard label="Total Verifications" value={data.summary?.total || 0} color="text-blue-400" bgGlow="from-blue-500 to-transparent" icon={<ShieldCheck className="h-4 w-4 text-blue-400" />} />
                        <KpiCard label="ID Scanned" value={data.summary?.scanned || 0} color="text-emerald-400" bgGlow="from-emerald-500 to-transparent" />
                        <KpiCard label="Overrides" value={data.summary?.overrides || 0} color="text-red-400" bgGlow="from-red-500 to-transparent" icon={<AlertTriangle className="h-4 w-4 text-red-400" />} />
                        <KpiCard label="Override Rate" value={`${data.summary?.overrideRate || 0}%`} color={data.summary?.overrideRate > 10 ? 'text-red-400' : 'text-emerald-400'} bgGlow={data.summary?.overrideRate > 10 ? 'from-red-500 to-transparent' : 'from-emerald-500 to-transparent'} />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <SectionCard title="Verification Log" icon={<ShieldCheck className="h-5 w-5 text-blue-400" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-700 text-xs text-stone-400">
                                    <th className="py-2 px-3 text-left">Date</th>
                                    <th className="py-2 px-3 text-left">Type</th>
                                    <th className="py-2 px-3 text-left">Employee</th>
                                    <th className="py-2 px-3 text-left">Items</th>
                                    <th className="py-2 px-3 text-left">DOB</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.logs?.map((log: any, i: number) => (
                                    <tr key={i} className={`border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors ${log.type === 'OVERRIDE' ? 'bg-red-900/10' : ''}`}>
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{new Date(log.date).toLocaleString()}</td>
                                        <td className="py-2.5 px-3"><Badge text={log.type} color={log.type === 'SCANNED' ? 'green' : 'red'} /></td>
                                        <td className="py-2.5 px-3 font-medium">{log.employeeName}</td>
                                        <td className="py-2.5 px-3 text-sm text-stone-300">{Array.isArray(log.items) ? log.items.join(', ') : '-'}</td>
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{log.customerDOB ? new Date(log.customerDOB).toLocaleDateString() : '-'}</td>
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
