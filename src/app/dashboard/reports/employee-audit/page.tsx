'use client'

import { useState, useEffect } from 'react'
import { ShieldAlert, Eye, AlertTriangle, UserX, Clock, Ban, DollarSign, Lock } from 'lucide-react'
import { ReportShell, KpiCard, PeriodSelector, SectionCard, Badge, MiniBar, fetchReport, fmtCurrency, exportToCSV } from '@/components/reports/ReportComponents'

export default function EmployeeAuditPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(7)

    const load = () => { setLoading(true); fetchReport(`/api/reports/employee-audit?days=${days}`).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false)) }
    useEffect(load, [days])

    const severityColor = (s: string): 'red' | 'yellow' | 'green' | 'gray' => {
        if (s === 'HIGH') return 'red'; if (s === 'MEDIUM') return 'yellow'; return 'green'
    }

    const eventTypeLabel: Record<string, string> = {
        VOID: '🚫 Void', REFUND: '💸 Refund', PRICE_OVERRIDE: '💲 Price Override',
        MANUAL_DISCOUNT: '🏷️ Manual Discount', NO_SALE: '🔓 No-Sale Open', LINE_DELETE: '🗑️ Line Delete',
        ID_OVERRIDE: '🪪 ID Override', PRICE_CHANGE: '📊 Price Change', RETURN_NO_RECEIPT: '📄 Return w/o Receipt',
        DRAWER_OPEN: '🔐 Drawer Open', COST_CHANGE: '📉 Cost Change'
    }

    const eventColor = (t: string): 'red' | 'yellow' | 'blue' | 'purple' | 'green' | 'gray' => {
        if (['VOID', 'RETURN_NO_RECEIPT'].includes(t)) return 'red'
        if (['PRICE_OVERRIDE', 'MANUAL_DISCOUNT', 'PRICE_CHANGE'].includes(t)) return 'yellow'
        if (['NO_SALE', 'DRAWER_OPEN'].includes(t)) return 'purple'
        if (['REFUND'].includes(t)) return 'blue'
        return 'gray'
    }

    const riskLevel = (score: number) => {
        if (score >= 80) return { text: 'CRITICAL', color: 'red' as const }
        if (score >= 40) return { text: 'HIGH', color: 'yellow' as const }
        if (score >= 15) return { text: 'MODERATE', color: 'blue' as const }
        return { text: 'LOW', color: 'green' as const }
    }

    return (
        <ReportShell
            title="Employee Activity Audit"
            subtitle="Track price overrides, discounts, voids, incomplete invoices, and risk scores"
            icon={<ShieldAlert className="h-8 w-8 text-red-400" />}
            loading={loading} onRefresh={load}
            onExportCSV={() => exportToCSV(data?.eventLog || [], 'employee_audit')}
        >
            {data && (<>
                {/* KPI Row */}
                <div className="flex justify-between items-center mb-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <KpiCard label="Total Events" value={data.summary?.totalAuditEvents || 0} color="text-amber-400" bgGlow="from-amber-500 to-transparent" icon={<Eye className="h-4 w-4 text-amber-400" />} />
                        <KpiCard label="🚨 Unreviewed HIGH" value={data.summary?.unreviewedHighSeverity || 0}
                            color={data.summary?.unreviewedHighSeverity > 0 ? 'text-red-500' : 'text-emerald-400'}
                            bgGlow={data.summary?.unreviewedHighSeverity > 0 ? 'from-red-500 to-transparent' : 'from-emerald-500 to-transparent'}
                        />
                        <KpiCard label="Voided Txns" value={data.summary?.voidedTransactions || 0} color="text-orange-400" bgGlow="from-orange-500 to-transparent" icon={<Ban className="h-4 w-4 text-orange-400" />} />
                        <KpiCard label="No-Sale Opens" value={data.summary?.noSaleOpens || 0} color="text-purple-400" bgGlow="from-purple-500 to-transparent" icon={<Lock className="h-4 w-4 text-purple-400" />} />
                        <KpiCard label="Suspended Invoices" value={data.suspended?.total || 0} color="text-sky-400" bgGlow="from-sky-500 to-transparent" icon={<Clock className="h-4 w-4 text-sky-400" />} />
                    </div>
                    <PeriodSelector value={days} onChange={setDays} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Employee Risk Ranking */}
                    <SectionCard title="Employee Risk Ranking" icon={<UserX className="h-5 w-5 text-red-400" />} className="lg:col-span-2">
                        {data.employeeRiskRanking?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-stone-700 text-xs text-stone-400">
                                            <th className="py-2 px-3 text-left">Employee</th>
                                            <th className="py-2 px-3 text-center">Risk</th>
                                            <th className="py-2 px-3 text-right">Score</th>
                                            <th className="py-2 px-3 text-right">Events</th>
                                            <th className="py-2 px-3 text-right">Voids</th>
                                            <th className="py-2 px-3 text-right">Disc.</th>
                                            <th className="py-2 px-3 text-right">Price Chg</th>
                                            <th className="py-2 px-3 text-right">No-Sale</th>
                                            <th className="py-2 px-3 text-right">$ Impact</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.employeeRiskRanking.slice(0, 15).map((emp: any, i: number) => {
                                            const risk = riskLevel(emp.riskScore)
                                            return (
                                                <tr key={i} className={`border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors ${risk.text === 'CRITICAL' ? 'bg-red-900/10' : ''}`}>
                                                    <td className="py-2.5 px-3 font-medium">{emp.name}</td>
                                                    <td className="py-2.5 px-3 text-center"><Badge text={risk.text} color={risk.color} /></td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <div className="flex items-center gap-2 justify-end">
                                                            <MiniBar value={emp.riskScore} max={data.employeeRiskRanking[0]?.riskScore || 100}
                                                                color={risk.text === 'CRITICAL' ? 'bg-red-500' : risk.text === 'HIGH' ? 'bg-amber-500' : 'bg-blue-500'} />
                                                            <span className="font-mono text-sm w-8">{emp.riskScore}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right font-mono">{emp.totalEvents}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-red-400">{emp.voids || '-'}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-amber-400">{emp.manualDiscounts || '-'}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-yellow-400">{emp.priceOverrides || '-'}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-purple-400">{emp.noSales || '-'}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono text-stone-300">{fmtCurrency(emp.totalAmount)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-stone-500 text-center py-6">No audit events recorded</p>}
                    </SectionCard>

                    {/* Event Type Breakdown */}
                    <SectionCard title="By Event Type" icon={<AlertTriangle className="h-5 w-5 text-amber-400" />}>
                        {data.byEventType?.map((ev: any, i: number) => (
                            <div key={i} className="py-3 border-b border-stone-800/50 last:border-0">
                                <div className="flex justify-between items-center mb-1">
                                    <Badge text={eventTypeLabel[ev.type] || ev.type} color={eventColor(ev.type)} />
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm">{ev.count}×</span>
                                        {ev.totalAmount > 0 && <span className="text-xs text-red-400 font-mono">{fmtCurrency(ev.totalAmount)}</span>}
                                    </div>
                                </div>
                                <MiniBar value={ev.count} max={data.byEventType[0]?.count || 1}
                                    color={eventColor(ev.type) === 'red' ? 'bg-red-500' : eventColor(ev.type) === 'yellow' ? 'bg-amber-500' : 'bg-blue-500'} />
                            </div>
                        ))}
                        {(!data.byEventType || data.byEventType.length === 0) && <p className="text-stone-500 text-center py-4">Clean record ✨</p>}
                    </SectionCard>
                </div>

                {/* Suspended Invoices */}
                {data.suspended?.total > 0 && (
                    <SectionCard title={`Suspended / Incomplete Invoices (${data.suspended.total})`} icon={<Clock className="h-5 w-5 text-sky-400" />} className="mb-6">
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-sky-400">{data.suspended.active}</p>
                                <p className="text-xs text-stone-400">Active</p>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-red-400">{data.suspended.voided}</p>
                                <p className="text-xs text-stone-400">Voided</p>
                            </div>
                            <div className="bg-stone-500/10 border border-stone-500/20 rounded-xl p-3 text-center">
                                <p className="text-2xl font-bold text-stone-400">{data.suspended.expired}</p>
                                <p className="text-xs text-stone-400">Expired</p>
                            </div>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-700 text-xs text-stone-400">
                                    <th className="py-2 px-3 text-left">Employee</th>
                                    <th className="py-2 px-3 text-left">Label</th>
                                    <th className="py-2 px-3 text-left">Status</th>
                                    <th className="py-2 px-3 text-left">Created</th>
                                    <th className="py-2 px-3 text-left">Expires</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.suspended.recent?.map((s: any, i: number) => (
                                    <tr key={i} className="border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors">
                                        <td className="py-2.5 px-3 font-medium">{s.employee}</td>
                                        <td className="py-2.5 px-3 text-stone-400">{s.label || '-'}</td>
                                        <td className="py-2.5 px-3"><Badge text={s.status} color={s.status === 'ACTIVE' ? 'blue' : s.status === 'VOIDED' ? 'red' : 'gray'} /></td>
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{new Date(s.createdAt).toLocaleString()}</td>
                                        <td className="py-2.5 px-3 text-xs text-stone-400">{new Date(s.expiresAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </SectionCard>
                )}

                {/* Event Timeline */}
                <SectionCard title="Event Timeline" icon={<Eye className="h-5 w-5 text-amber-400" />}>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-700 text-xs text-stone-400">
                                    <th className="py-2 px-3 text-left">Time</th>
                                    <th className="py-2 px-3 text-left">Employee</th>
                                    <th className="py-2 px-3 text-left">Event</th>
                                    <th className="py-2 px-3 text-left">Severity</th>
                                    <th className="py-2 px-3 text-right">Amount</th>
                                    <th className="py-2 px-3 text-center">Reviewed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.eventLog?.map((ev: any, i: number) => (
                                    <tr key={i} className={`border-b border-stone-800/30 hover:bg-stone-800/30 transition-colors ${ev.severity === 'HIGH' ? 'bg-red-900/10' : ''}`}>
                                        <td className="py-2.5 px-3 text-xs text-stone-400 whitespace-nowrap">{new Date(ev.date).toLocaleString()}</td>
                                        <td className="py-2.5 px-3 font-medium">{ev.employee}</td>
                                        <td className="py-2.5 px-3"><Badge text={eventTypeLabel[ev.eventType] || ev.eventType} color={eventColor(ev.eventType)} /></td>
                                        <td className="py-2.5 px-3"><Badge text={ev.severity} color={severityColor(ev.severity)} /></td>
                                        <td className="py-2.5 px-3 text-right font-mono text-amber-400">{ev.amount ? fmtCurrency(ev.amount) : '-'}</td>
                                        <td className="py-2.5 px-3 text-center">
                                            {ev.reviewed
                                                ? <span className="text-emerald-400 text-sm">✓ {ev.reviewedBy}</span>
                                                : ev.severity === 'HIGH'
                                                    ? <span className="text-red-400 text-xs font-bold animate-pulse">NEEDS REVIEW</span>
                                                    : <span className="text-stone-600 text-xs">—</span>
                                            }
                                        </td>
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
