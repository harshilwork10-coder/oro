'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, FileText, RefreshCw, Download, Calendar,
    DollarSign, Users, CreditCard, Package, Award, Store
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ReportOption {
    id: string
    name: string
    description: string
    icon: React.ReactNode
}

export default function ReportsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [selectedReport, setSelectedReport] = useState('daily-sales')
    const [reportData, setReportData] = useState<any>(null)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    const reports: ReportOption[] = [
        { id: 'daily-sales', name: 'Daily Sales', description: 'Transaction-level sales data', icon: <DollarSign className="h-5 w-5 text-emerald-400" /> },
        { id: 'sales-by-category', name: 'Sales by Category', description: 'Revenue by product category', icon: <Package className="h-5 w-5 text-blue-400" /> },
        { id: 'employee-sales', name: 'Employee Sales', description: 'Sales by employee', icon: <Users className="h-5 w-5 text-purple-400" /> },
        { id: 'payment-methods', name: 'Payment Methods', description: 'Cash vs Card breakdown', icon: <CreditCard className="h-5 w-5 text-pink-400" /> },
        { id: 'tax-summary', name: 'Tax Summary', description: 'Tax collected by location', icon: <Store className="h-5 w-5 text-amber-400" /> },
        { id: 'low-stock', name: 'Low Stock Alert', description: 'Items with stock < 10', icon: <Package className="h-5 w-5 text-red-400" /> },
        { id: 'loyalty-members', name: 'Loyalty Members', description: 'Customer loyalty data', icon: <Award className="h-5 w-5 text-yellow-400" /> }
    ]

    const fetchReport = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('type', selectedReport)
            params.set('startDate', startDate)
            params.set('endDate', endDate)

            const res = await fetch(`/api/owner/reports?${params}`)
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
    }, [selectedReport, startDate, endDate])

    const downloadCSV = async () => {
        const params = new URLSearchParams()
        params.set('type', selectedReport)
        params.set('startDate', startDate)
        params.set('endDate', endDate)
        params.set('format', 'csv')

        window.open(`/api/owner/reports?${params}`, '_blank')
    }

    const downloadPDF = () => {
        // For PDF, we'll print the current view
        window.print()
    }

    const currentReport = reports.find(r => r.id === selectedReport)

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
                            <FileText className="h-8 w-8 text-cyan-500" />
                            Reports & Exports
                        </h1>
                        <p className="text-stone-400">Download sales data and analytics</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                    >
                        <Download className="h-4 w-4" />
                        CSV
                    </button>
                    <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl"
                    >
                        <Download className="h-4 w-4" />
                        PDF
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-4">
                <h1 className="text-2xl font-bold">{currentReport?.name}</h1>
                <p className="text-sm text-gray-500">{startDate} to {endDate}</p>
            </div>

            {/* Report Selector & Date Range */}
            <div className="flex flex-wrap gap-4 mb-6 print:hidden">
                <select
                    value={selectedReport}
                    onChange={(e) => setSelectedReport(e.target.value)}
                    className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 min-w-[200px]"
                >
                    {reports.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-stone-400" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                    />
                    <span className="text-stone-500">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                    />
                </div>

                <button
                    onClick={fetchReport}
                    disabled={loading}
                    className="px-4 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl"
                >
                    {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Generate'}
                </button>
            </div>

            {/* Report Content */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 print:bg-white print:border-gray-300">
                <div className="flex items-center gap-3 mb-6 print:mb-4">
                    {currentReport?.icon}
                    <h2 className="text-xl font-bold">{currentReport?.name}</h2>
                </div>

                {/* Summary for sales reports */}
                {reportData?.summary && (
                    <div className="grid grid-cols-3 gap-4 mb-6 print:mb-4">
                        <div className="bg-stone-800 rounded-xl p-4 print:bg-gray-100">
                            <p className="text-sm text-stone-400 print:text-gray-600">Transactions</p>
                            <p className="text-2xl font-bold">{reportData.summary.totalTransactions?.toLocaleString()}</p>
                        </div>
                        <div className="bg-stone-800 rounded-xl p-4 print:bg-gray-100">
                            <p className="text-sm text-stone-400 print:text-gray-600">Total Sales</p>
                            <p className="text-2xl font-bold text-emerald-400 print:text-green-600">
                                {formatCurrency(reportData.summary.totalSales || 0)}
                            </p>
                        </div>
                        <div className="bg-stone-800 rounded-xl p-4 print:bg-gray-100">
                            <p className="text-sm text-stone-400 print:text-gray-600">Tax Collected</p>
                            <p className="text-2xl font-bold">{formatCurrency(reportData.summary.totalTax || 0)}</p>
                        </div>
                    </div>
                )}

                {/* Data Table */}
                {reportData?.data && reportData.data.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-stone-700 print:border-gray-300">
                                    {Object.keys(reportData.data[0]).map(key => (
                                        <th key={key} className="text-left py-3 px-4 font-semibold uppercase text-xs text-stone-400 print:text-gray-600">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.data.slice(0, 100).map((row: any, idx: number) => (
                                    <tr key={idx} className="border-b border-stone-800 print:border-gray-200">
                                        {Object.values(row).map((val: any, i) => (
                                            <td key={i} className="py-3 px-4">
                                                {typeof val === 'number' && val > 100
                                                    ? formatCurrency(val)
                                                    : String(val)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {reportData.data.length > 100 && (
                            <p className="text-center text-stone-500 py-4 print:hidden">
                                Showing 100 of {reportData.data.length} rows. Download CSV for full data.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-stone-500">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No data for this date range</p>
                    </div>
                )}

                {/* Tax Summary Totals */}
                {reportData?.totals && (
                    <div className="mt-6 pt-6 border-t border-stone-700 print:border-gray-300">
                        <div className="flex justify-end gap-8">
                            <div>
                                <p className="text-sm text-stone-400">Total Subtotal</p>
                                <p className="text-xl font-bold">{formatCurrency(reportData.totals.subtotal)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-stone-400">Total Tax</p>
                                <p className="text-xl font-bold text-amber-400">{formatCurrency(reportData.totals.tax)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-stone-400">Grand Total</p>
                                <p className="text-xl font-bold text-emerald-400">{formatCurrency(reportData.totals.total)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Full Inventory Export Notice */}
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl print:hidden">
                <p className="text-sm text-amber-400">
                    <strong>Note:</strong> Full product catalog export (with UPC, cost, pricing) is not available for self-service download.
                    Please contact support if you need this data.
                </p>
            </div>
        </div>
    )
}
