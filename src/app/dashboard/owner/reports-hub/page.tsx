'use client'

/**
 * FIX 8 — OWNER REPORTS HUB
 * Replaces the 6-line silent redirect stub to /dashboard/reports.
 * Owner gets a real reports landing page with period selector,
 * top-level KPIs, and links to all report types.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
    ArrowLeft, BarChart2, DollarSign, FileText, Calculator,
    Calendar, Download, Lock, RefreshCw
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const PERIODS = [
    { id: 'today', label: 'Today', days: 0 },
    { id: 'week', label: 'This Week', days: 7 },
    { id: 'month', label: 'This Month', days: 30 },
    { id: 'quarter', label: 'Quarter', days: 90 },
]

interface ReportSummary {
    totalSales?: number
    totalTransactions?: number
    avgTicket?: number
    taxCollected?: number
    netRevenue?: number
}

export default function OwnerReportsHubPage() {
    const [period, setPeriod] = useState('today')
    const [summary, setSummary] = useState<ReportSummary | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/reports/owner-summary?period=${period}`)
            .then(r => r.json())
            .then(d => { setSummary(d.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [period])

    const kpis = [
        { label: 'Total Sales', value: summary?.totalSales != null ? formatCurrency(summary.totalSales) : '—', color: 'text-emerald-400' },
        { label: 'Transactions', value: summary?.totalTransactions?.toLocaleString() ?? '—', color: 'text-blue-400' },
        { label: 'Avg Ticket', value: summary?.avgTicket != null ? formatCurrency(summary.avgTicket) : '—', color: 'text-amber-400' },
        { label: 'Tax Collected', value: summary?.taxCollected != null ? formatCurrency(summary.taxCollected) : '—', color: 'text-purple-400' },
        { label: 'Net Revenue', value: summary?.netRevenue != null ? formatCurrency(summary.netRevenue) : '—', color: 'text-cyan-400' },
    ]

    const reportLinks = [
        { href: '/dashboard/owner/reports', icon: BarChart2, label: 'Daily / Weekly / Monthly Reports', desc: 'Detailed period reports with category breakdowns', color: 'from-blue-500 to-cyan-500' },
        { href: '/dashboard/owner/tax-report', icon: Calculator, label: 'Tax Report', desc: 'Tax collected by period and jurisdiction', color: 'from-amber-500 to-orange-500' },
        { href: '/dashboard/owner/cash', icon: DollarSign, label: 'Cash Accountability', desc: 'Drawer summary, deposits, and variance', color: 'from-emerald-500 to-teal-500' },
        { href: '/dashboard/owner/lp-audit', icon: FileText, label: 'Loss Prevention Audit', desc: 'Voids, refunds, no-sales by employee', color: 'from-red-500 to-rose-500' },
        { href: '/dashboard/owner/month-close', icon: Lock, label: 'Month-End Close', desc: 'Lock the period and generate final summaries', color: 'from-purple-500 to-violet-500' },
        { href: '/dashboard/owner/accounting-export', icon: Download, label: 'Accounting Export', desc: 'Export P&L, sales, and tax data for accounting', color: 'from-stone-500 to-stone-400' },
        { href: '/dashboard/settings/scheduled-reports', icon: Calendar, label: 'Scheduled Reports', desc: 'Auto-email daily, weekly, monthly reports', color: 'from-pink-500 to-rose-500' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Breadcrumb — FIX 8: owner stays in context */}
            <div className="flex items-center gap-3 mb-8">
                <Link
                    href="/dashboard/owner"
                    className="flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors text-sm"
                >
                    <ArrowLeft className="h-4 w-4" /> Owner Portal
                </Link>
                <span className="text-stone-600">/</span>
                <span className="text-stone-200 font-medium">Reports</span>
            </div>

            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Reports
                    </h1>
                    <p className="text-stone-400 mt-1">Financial summaries, tax, cash, and period close</p>
                </div>

                {/* Period selector */}
                <div className="flex gap-2 bg-stone-900/80 border border-stone-700 rounded-xl p-1">
                    {PERIODS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPeriod(p.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                period === p.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-stone-400 hover:text-stone-200'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                {kpis.map(kpi => (
                    <div key={kpi.label} className="bg-stone-900/80 border border-stone-700 rounded-2xl p-4">
                        <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">{kpi.label}</p>
                        {loading
                            ? <div className="h-7 w-20 bg-stone-800 rounded animate-pulse" />
                            : <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                        }
                    </div>
                ))}
            </div>

            {/* Report links */}
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3">All Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportLinks.map(r => {
                    const Icon = r.icon
                    return (
                        <Link
                            key={r.href}
                            href={r.href}
                            className="group bg-stone-900/80 border border-stone-700 hover:border-stone-500 rounded-2xl p-5 transition-all hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center mb-4`}>
                                <Icon className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="font-bold text-stone-100 group-hover:text-white transition-colors">{r.label}</h3>
                            <p className="text-sm text-stone-400 mt-0.5">{r.desc}</p>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
