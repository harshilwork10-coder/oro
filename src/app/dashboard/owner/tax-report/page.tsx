'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, FileText, RefreshCw, Download, Calendar,
    DollarSign, Store, TrendingUp, Printer, Receipt
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LocationTax {
    locationId: string
    locationName: string
    grossSales: number
    taxableSales: number
    nonTaxableSales: number
    taxCollected: number
    transactionCount: number
}

interface DailyTax {
    date: string
    sales: number
    tax: number
}

export default function TaxReportPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
    const [year, setYear] = useState(new Date().getFullYear())
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
    const [reportData, setReportData] = useState<any>(null)

    const fetchReport = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('period', period)
            params.set('year', year.toString())
            if (period === 'monthly') params.set('month', month.toString())
            if (period === 'quarterly') params.set('quarter', quarter.toString())

            const res = await fetch(`/api/owner/tax-report?${params}`)
            const data = await res.json()
            setReportData(data)
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReport()
    }, [period, year, month, quarter])

    const printReport = () => {
        window.print()
    }

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6 print:bg-white print:text-black">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Receipt className="h-8 w-8 text-amber-500" />
                            Sales Tax Report
                        </h1>
                        <p className="text-stone-400">For your accountant - Monthly/Quarterly breakdown</p>
                    </div>
                </div>
                <button
                    onClick={printReport}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-semibold"
                >
                    <Printer className="h-5 w-5" />
                    Print / Save PDF
                </button>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold">Sales Tax Report</h1>
                <p className="text-lg">{reportData?.report?.periodLabel}</p>
                <p className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</p>
            </div>

            {/* Period Selector */}
            <div className="flex flex-wrap gap-4 mb-6 print:hidden">
                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                </select>

                <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                >
                    {[2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                {period === 'monthly' && (
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>
                )}

                {period === 'quarterly' && (
                    <select
                        value={quarter}
                        onChange={(e) => setQuarter(parseInt(e.target.value))}
                        className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                    >
                        <option value={1}>Q1 (Jan-Mar)</option>
                        <option value={2}>Q2 (Apr-Jun)</option>
                        <option value={3}>Q3 (Jul-Sep)</option>
                        <option value={4}>Q4 (Oct-Dec)</option>
                    </select>
                )}

                <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="px-4 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl"
                >
                    {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Generate'}
                </button>
            </div>

            {/* Summary Cards */}
            {reportData?.totals && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print:grid-cols-4 print:gap-2">
                    <div className="bg-stone-800 rounded-2xl p-5 print:bg-gray-100 print:p-3">
                        <p className="text-stone-400 text-sm print:text-gray-600">Gross Sales</p>
                        <p className="text-2xl font-bold text-white print:text-black">
                            {formatCurrency(reportData.totals.grossSales)}
                        </p>
                    </div>
                    <div className="bg-stone-800 rounded-2xl p-5 print:bg-gray-100 print:p-3">
                        <p className="text-stone-400 text-sm print:text-gray-600">Taxable Sales</p>
                        <p className="text-2xl font-bold text-emerald-400 print:text-green-600">
                            {formatCurrency(reportData.totals.taxableSales)}
                        </p>
                    </div>
                    <div className="bg-stone-800 rounded-2xl p-5 print:bg-gray-100 print:p-3">
                        <p className="text-stone-400 text-sm print:text-gray-600">Non-Taxable Sales</p>
                        <p className="text-2xl font-bold text-blue-400 print:text-blue-600">
                            {formatCurrency(reportData.totals.nonTaxableSales)}
                        </p>
                    </div>
                    <div className="bg-amber-600/20 border border-amber-500/50 rounded-2xl p-5 print:bg-yellow-100 print:p-3 print:border-yellow-400">
                        <p className="text-amber-300 text-sm print:text-yellow-700">TAX COLLECTED</p>
                        <p className="text-2xl font-bold text-amber-400 print:text-yellow-700">
                            {formatCurrency(reportData.totals.taxCollected)}
                        </p>
                        <p className="text-xs text-amber-300/70 print:text-yellow-600">
                            Avg Rate: {reportData.avgTaxRate}%
                        </p>
                    </div>
                </div>
            )}

            {/* By Location Table */}
            {reportData?.locationBreakdown && reportData.locationBreakdown.length > 0 && (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-8 print:bg-white print:border-gray-300">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Store className="h-5 w-5 text-amber-400" />
                        Tax Collected by Location
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-stone-700 print:border-gray-300">
                                    <th className="text-left py-3 px-4 font-semibold">Location</th>
                                    <th className="text-right py-3 px-4 font-semibold">Transactions</th>
                                    <th className="text-right py-3 px-4 font-semibold">Gross Sales</th>
                                    <th className="text-right py-3 px-4 font-semibold">Taxable</th>
                                    <th className="text-right py-3 px-4 font-semibold">Non-Taxable</th>
                                    <th className="text-right py-3 px-4 font-semibold text-amber-400 print:text-yellow-700">Tax Collected</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.locationBreakdown.map((loc: LocationTax) => (
                                    <tr key={loc.locationId} className="border-b border-stone-800 print:border-gray-200">
                                        <td className="py-3 px-4 font-medium">{loc.locationName}</td>
                                        <td className="py-3 px-4 text-right">{loc.transactionCount.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-right">{formatCurrency(loc.grossSales)}</td>
                                        <td className="py-3 px-4 text-right text-emerald-400 print:text-green-600">{formatCurrency(loc.taxableSales)}</td>
                                        <td className="py-3 px-4 text-right text-blue-400 print:text-blue-600">{formatCurrency(loc.nonTaxableSales)}</td>
                                        <td className="py-3 px-4 text-right font-bold text-amber-400 print:text-yellow-700">{formatCurrency(loc.taxCollected)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-stone-800 print:bg-gray-200 font-bold">
                                    <td className="py-3 px-4">TOTAL</td>
                                    <td className="py-3 px-4 text-right">{reportData.totals.transactionCount.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right">{formatCurrency(reportData.totals.grossSales)}</td>
                                    <td className="py-3 px-4 text-right text-emerald-400 print:text-green-600">{formatCurrency(reportData.totals.taxableSales)}</td>
                                    <td className="py-3 px-4 text-right text-blue-400 print:text-blue-600">{formatCurrency(reportData.totals.nonTaxableSales)}</td>
                                    <td className="py-3 px-4 text-right text-amber-400 print:text-yellow-700">{formatCurrency(reportData.totals.taxCollected)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Daily Breakdown (collapsible on print) */}
            {reportData?.dailyBreakdown && reportData.dailyBreakdown.length > 0 && (
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 print:bg-white print:border-gray-300">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-cyan-400" />
                        Daily Breakdown
                    </h2>
                    <div className="max-h-[400px] overflow-y-auto print:max-h-none">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-stone-900 print:bg-white">
                                <tr className="border-b border-stone-700 print:border-gray-300">
                                    <th className="text-left py-2 px-4 font-semibold">Date</th>
                                    <th className="text-right py-2 px-4 font-semibold">Sales</th>
                                    <th className="text-right py-2 px-4 font-semibold text-amber-400 print:text-yellow-700">Tax</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.dailyBreakdown.map((day: DailyTax) => (
                                    <tr key={day.date} className="border-b border-stone-800/50 print:border-gray-100">
                                        <td className="py-2 px-4">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                                        <td className="py-2 px-4 text-right">{formatCurrency(day.sales)}</td>
                                        <td className="py-2 px-4 text-right text-amber-400 print:text-yellow-700">{formatCurrency(day.tax)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Print Footer */}
            <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-500">
                <p>This report is for accounting purposes. Please verify with official tax records.</p>
                <p>Report Period: {reportData?.report?.dateRange?.start?.split('T')[0]} to {reportData?.report?.dateRange?.end?.split('T')[0]}</p>
            </div>
        </div>
    )
}

