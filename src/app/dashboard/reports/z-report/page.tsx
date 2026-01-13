'use client'

import { useState, useEffect } from 'react'
import {
    Calendar,
    DollarSign,
    TrendingUp,
    CreditCard,
    Printer,
    Loader2,
    FileText,
    ArrowLeft,
    FileDown
} from 'lucide-react'
import Link from 'next/link'
import { WithReportPermission } from '@/components/reports/WithReportPermission'

function ZReportPageContent() {
    const [reportData, setReportData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/z-report?date=${selectedDate}`)
            if (res.ok) {
                const data = await res.json()
                setReportData(data)
            }
        } catch (error) {
            console.error('Error fetching Z Report:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchReport()
    }, [selectedDate])

    const handlePrint = () => {
        window.print()
    }

    const exportCSV = () => {
        if (!reportData) return

        const csvContent = [
            'SUMMARY',
            `Total Sales,${reportData.summary.totalSales.toFixed(2)}`,
            `Cash Sales,${reportData.summary.cashSales.toFixed(2)}`,
            `Card Sales,${reportData.summary.cardSales.toFixed(2)}`,
            `Transactions,${reportData.summary.totalTransactions}`,
            '',
            'CASH RECONCILIATION',
            `Opening Cash,${reportData.cashReconciliation.opening.toFixed(2)}`,
            `Cash Sales,${reportData.cashReconciliation.sales.toFixed(2)}`,
            `Expected Closing,${reportData.cashReconciliation.expected.toFixed(2)}`,
            `Actual Closing,${reportData.cashReconciliation.actual !== null ? reportData.cashReconciliation.actual.toFixed(2) : ''}`,
            `Variance,${reportData.cashReconciliation.variance.toFixed(2)}`,
            '',
            'TAX SUMMARY',
            `Subtotal,${reportData.taxSummary.subtotal.toFixed(2)}`,
            `Tax Collected,${reportData.taxSummary.tax.toFixed(2)}`,
            `Total with Tax,${reportData.taxSummary.total.toFixed(2)}`,
            '',
            'TOP SELLING ITEMS',
            'Item,Qty,Sales',
            ...reportData.topItems.map((item: any) => `"${item.name}",${item.quantity},${item.sales.toFixed(2)}`)
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `z_report_${selectedDate}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
            </div>
        )
    }

    if (!reportData) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center">
                    <FileText className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                    <p className="text-stone-400">No data available for selected date</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 p-8 print:p-0 print:bg-white">
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto; 
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>

            {/* Screen View */}
            <div className="max-w-5xl mx-auto space-y-8 print:hidden">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/reports/employee" className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-stone-400" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Z Report (End of Shift)</h1>
                            <p className="text-stone-400 mt-1">Shift closing summary and cash reconciliation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-500 h-5 w-5" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-lg text-white focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm font-medium"
                            title="Export Excel"
                        >
                            <FileDown className="h-4 w-4" />
                            Excel
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors shadow-sm font-medium"
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SummaryCard
                        title="Total Sales"
                        value={`$${reportData.summary.totalSales.toFixed(2)}`}
                        icon={DollarSign}
                        color="emerald"
                    />
                    <SummaryCard
                        title="Cash Sales"
                        value={`$${reportData.summary.cashSales.toFixed(2)}`}
                        subtext={`${reportData.summary.cashCount} transactions`}
                        icon={DollarSign}
                        color="green"
                    />
                    <SummaryCard
                        title="Card Sales"
                        value={`$${reportData.summary.cardSales.toFixed(2)}`}
                        subtext={`${reportData.summary.cardCount} transactions`}
                        icon={CreditCard}
                        color="blue"
                    />
                    <SummaryCard
                        title="Total Transactions"
                        value={reportData.summary.totalTransactions}
                        icon={TrendingUp}
                        color="orange"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Cash Reconciliation */}
                    <div className="glass-panel rounded-xl p-6 border border-stone-800 bg-stone-900/50">
                        <h3 className="font-bold text-white mb-6">Cash Reconciliation</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between p-3 bg-stone-900/50 rounded-lg">
                                <span className="text-stone-400">Opening Cash</span>
                                <span className="font-bold text-white">${reportData.cashReconciliation.opening.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-stone-900/50 rounded-lg">
                                <span className="text-stone-400">Cash Sales</span>
                                <span className="font-bold text-emerald-400">+${reportData.cashReconciliation.sales.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-stone-900/50 rounded-lg">
                                <span className="text-stone-400">Expected Closing</span>
                                <span className="font-bold text-white">${reportData.cashReconciliation.expected.toFixed(2)}</span>
                            </div>
                            {reportData.cashReconciliation.actual !== null && (
                                <>
                                    <div className="flex justify-between p-3 bg-stone-900/50 rounded-lg">
                                        <span className="text-stone-400">Actual Closing</span>
                                        <span className="font-bold text-white">${reportData.cashReconciliation.actual.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                                        <span className="text-orange-400 font-medium">Variance</span>
                                        <span className={`font-bold ${Math.abs(reportData.cashReconciliation.variance) < 0.01 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                            ${reportData.cashReconciliation.variance.toFixed(2)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Top Items */}
                    <div className="glass-panel rounded-xl p-6 border border-stone-800 bg-stone-900/50">
                        <h3 className="font-bold text-white mb-4">Top Selling Items</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-stone-400 border-b border-stone-800">
                                    <tr>
                                        <th className="pb-3 font-medium">Item</th>
                                        <th className="pb-3 font-medium text-right">Qty</th>
                                        <th className="pb-3 font-medium text-right">Sales</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-800">
                                    {reportData.topItems.map((item: any, i: number) => (
                                        <tr key={i}>
                                            <td className="py-3 font-medium text-white">{item.name}</td>
                                            <td className="py-3 text-stone-400 text-right">{item.quantity}</td>
                                            <td className="py-3 text-white text-right font-medium">${item.sales.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Tax Summary */}
                <div className="glass-panel rounded-xl p-6 border border-stone-800 bg-stone-900/50">
                    <h3 className="font-bold text-white mb-4">Tax Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-stone-900/50 rounded-lg">
                            <p className="text-stone-400 text-sm mb-1">Subtotal</p>
                            <p className="text-xl font-bold text-white">${reportData.taxSummary.subtotal.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-stone-900/50 rounded-lg">
                            <p className="text-stone-400 text-sm mb-1">Tax Collected</p>
                            <p className="text-xl font-bold text-white">${reportData.taxSummary.tax.toFixed(2)}</p>
                        </div>
                        <div className="p-4 bg-stone-900/50 rounded-lg">
                            <p className="text-stone-400 text-sm mb-1">Total with Tax</p>
                            <p className="text-xl font-bold text-white">${reportData.taxSummary.total.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipt Printer View (Visible only on print) */}
            <div className="hidden print:block w-[80mm] mx-auto p-2">
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold text-black">Z REPORT</h1>
                    <p className="text-xs text-gray-600 mt-1">End of Shift Summary</p>
                    <p className="text-sm text-gray-600 mt-1">
                        {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="space-y-4 text-sm">
                    {/* Summary */}
                    <div className="border-b-2 border-black pb-4">
                        <div className="flex justify-between font-bold text-lg mb-2">
                            <span>TOTAL SALES</span>
                            <span>${reportData.summary.totalSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Cash Sales</span>
                            <span>${reportData.summary.cashSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Card Sales</span>
                            <span>${reportData.summary.cardSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mt-2">
                            <span>Transactions</span>
                            <span>{reportData.summary.totalTransactions}</span>
                        </div>
                    </div>

                    {/* Cash Reconciliation */}
                    <div className="border-b border-dashed border-gray-400 pb-4">
                        <h3 className="font-bold mb-2 uppercase">Cash Reconciliation</h3>
                        <div className="flex justify-between">
                            <span>Opening Cash</span>
                            <span>${reportData.cashReconciliation.opening.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Cash Sales</span>
                            <span>${reportData.cashReconciliation.sales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>Expected</span>
                            <span>${reportData.cashReconciliation.expected.toFixed(2)}</span>
                        </div>
                        {reportData.cashReconciliation.actual !== null && (
                            <>
                                <div className="flex justify-between">
                                    <span>Actual</span>
                                    <span>${reportData.cashReconciliation.actual.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Variance</span>
                                    <span>${reportData.cashReconciliation.variance.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Tax Summary */}
                    <div className="border-b border-dashed border-gray-400 pb-4">
                        <h3 className="font-bold mb-2 uppercase">Tax Summary</h3>
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>${reportData.taxSummary.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax</span>
                            <span>${reportData.taxSummary.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span>${reportData.taxSummary.total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Top Items */}
                    <div className="pb-4">
                        <h3 className="font-bold mb-2 uppercase">Top Items</h3>
                        {reportData.topItems.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between mb-1">
                                <span className="truncate flex-1 pr-2">{item.name}</span>
                                <span className="text-gray-600 mr-2">x{item.quantity}</span>
                                <span>${item.sales.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-black">
                        <p>Printed: {new Date().toLocaleString()}</p>
                        <p>Oro POS System</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ title, value, subtext, icon: Icon, color }: any) {
    const colors: any = {
        emerald: 'bg-emerald-500/10 text-emerald-400',
        green: 'bg-green-500/10 text-green-400',
        blue: 'bg-blue-500/10 text-blue-400',
        orange: 'bg-orange-500/10 text-orange-400',
    }

    return (
        <div className="glass-panel rounded-xl p-6 print:shadow-none print:border-gray-300 border border-stone-800 bg-stone-900/50">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <p className="text-sm font-medium text-stone-400">{title}</p>
                    <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${colors[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {subtext && (
                <p className="text-xs text-stone-500 mt-2 pt-2 border-t border-stone-800">{subtext}</p>
            )}
        </div>
    )
}

export default function ZReportPage() {
    return (
        <WithReportPermission reportType="z-report">
            <ZReportPageContent />
        </WithReportPermission>
    )
}
