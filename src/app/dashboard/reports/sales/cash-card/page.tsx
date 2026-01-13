'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import {
    ArrowLeft,
    DollarSign,
    Calendar,
    Download,
    Loader2,
    Banknote,
    CreditCard,
    TrendingUp,
    AlertTriangle,
    FileDown
} from 'lucide-react'

export default function CashCardBreakdownPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: getDefaultStartDate(),
        end: new Date().toISOString().split('T')[0]
    })

    function getDefaultStartDate() {
        const now = new Date()
        now.setDate(now.getDate() - 7)
        return now.toISOString().split('T')[0]
    }

    useEffect(() => {
        fetchData()
    }, [dateRange])

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                startDate: dateRange.start,
                endDate: dateRange.end
            })

            const res = await fetch(`/api/franchise/reports/cash-card?${params}`)
            if (res.ok) {
                const result = await res.json()
                setData(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
    const formatPercent = (percent: number) => `${percent.toFixed(1)}%`

    const exportToPDF = () => {
        if (!data) return

        const doc = new jsPDF()
        let yPos = 20

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Cash vs Card Breakdown Report', 20, yPos)
        yPos += 10

        // Date Range
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 20, yPos)
        yPos += 15

        // Summary
        doc.setFont('helvetica', 'bold')
        doc.text('Summary:', 20, yPos)
        yPos += 7
        doc.setFont('helvetica', 'normal')
        doc.text(`Total Revenue: ${formatCurrency(data.summary.totalRevenue)}`, 25, yPos)
        yPos += 5
        doc.text(`Cash Revenue: ${formatCurrency(data.summary.cash.revenue)} (${formatPercent(data.summary.cash.revenuePercent)})`, 25, yPos)
        yPos += 5
        doc.text(`Card Revenue: ${formatCurrency(data.summary.card.revenue)} (${formatPercent(data.summary.card.revenuePercent)})`, 25, yPos)
        yPos += 5
        doc.text(`Cash Tips: ${formatCurrency(data.summary.cash.tips)}`, 25, yPos)
        yPos += 5
        doc.text(`Card Tips: ${formatCurrency(data.summary.card.tips)}`, 25, yPos)
        yPos += 15

        // By Barber Table
        doc.setFont('helvetica', 'bold')
        doc.text('Breakdown by Barber:', 20, yPos)
        yPos += 8

        doc.setFontSize(9)
        doc.text('Barber', 20, yPos)
        doc.text('Cash Rev', 70, yPos)
        doc.text('Card Rev', 100, yPos)
        doc.text('Cash Tips', 130, yPos)
        doc.text('Card Tips', 160, yPos)
        doc.text('Cash %', 185, yPos)
        yPos += 6

        doc.setFont('helvetica', 'normal')
        data.byBarber.forEach((barber: any) => {
            if (yPos > 270) {
                doc.addPage()
                yPos = 20
            }
            const totalRev = barber.cashRevenue + barber.cardRevenue
            const cashPct = totalRev > 0 ? (barber.cashRevenue / totalRev) * 100 : 0
            doc.text(barber.name?.substring(0, 18) || 'Unknown', 20, yPos)
            doc.text(formatCurrency(barber.cashRevenue), 70, yPos)
            doc.text(formatCurrency(barber.cardRevenue), 100, yPos)
            doc.text(formatCurrency(barber.cashTips), 130, yPos)
            doc.text(formatCurrency(barber.cardTips), 160, yPos)
            doc.text(formatPercent(cashPct), 185, yPos)
            yPos += 5
        })

        // Footer
        doc.setFontSize(8)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285)

        doc.save(`cash_card_breakdown_${dateRange.start}_${dateRange.end}.pdf`)
    }

    // Detect potential cash leakage (if cash % is unusually high or low)
    const cashPercent = data?.summary?.cash?.revenuePercent || 0
    const hasLeakageWarning = cashPercent > 60 // High cash usually means potential leakage

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/reports/sales"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-blue-600">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            Cash vs Card Breakdown
                        </h1>
                        <p className="text-gray-400 mt-1">Detect cash leakage and payment trends</p>
                    </div>
                </div>

                <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                </button>
            </div>

            {/* Date Range Selector */}
            <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400">Date Range:</span>
                </div>
                <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
                <span className="text-gray-400">to</span>
                <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            ) : data ? (
                <>
                    {/* Warning Banner */}
                    {hasLeakageWarning && (
                        <div className="bg-orange-500/20 border border-orange-500/50 rounded-xl p-4 flex items-center gap-3">
                            <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0" />
                            <div>
                                <p className="text-orange-400 font-semibold">High Cash Transaction Rate Detected</p>
                                <p className="text-orange-300 text-sm">
                                    {formatPercent(cashPercent)} of revenue is from cash. Industry average is 30-40%.
                                    Consider reviewing individual barber cash rates below.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total Revenue */}
                        <div className="glass-panel p-6 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <TrendingUp className="w-5 h-5" />
                                <span>Total Revenue</span>
                            </div>
                            <p className="text-3xl font-bold text-white mb-4">
                                {formatCurrency(data.summary.totalRevenue)}
                            </p>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-green-500/20 rounded-lg p-3 text-center">
                                    <Banknote className="w-5 h-5 text-green-400 mx-auto mb-1" />
                                    <p className="text-green-400 font-bold">{formatCurrency(data.summary.cash.revenue)}</p>
                                    <p className="text-green-300 text-xs">{formatPercent(data.summary.cash.revenuePercent)}</p>
                                </div>
                                <div className="flex-1 bg-blue-500/20 rounded-lg p-3 text-center">
                                    <CreditCard className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                                    <p className="text-blue-400 font-bold">{formatCurrency(data.summary.card.revenue)}</p>
                                    <p className="text-blue-300 text-xs">{formatPercent(data.summary.card.revenuePercent)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tips Breakdown */}
                        <div className="glass-panel p-6 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <DollarSign className="w-5 h-5" />
                                <span>Tips Collected</span>
                            </div>
                            <p className="text-3xl font-bold text-white mb-4">
                                {formatCurrency(data.summary.totalTips)}
                            </p>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-green-500/20 rounded-lg p-3 text-center">
                                    <p className="text-green-400 font-bold">{formatCurrency(data.summary.cash.tips)}</p>
                                    <p className="text-green-300 text-xs">Cash Tips</p>
                                </div>
                                <div className="flex-1 bg-blue-500/20 rounded-lg p-3 text-center">
                                    <p className="text-blue-400 font-bold">{formatCurrency(data.summary.card.tips)}</p>
                                    <p className="text-blue-300 text-xs">Card Tips</p>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Count */}
                        <div className="glass-panel p-6 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <span>Transaction Count</span>
                            </div>
                            <p className="text-3xl font-bold text-white mb-4">
                                {data.summary.cash.transactionCount + data.summary.card.transactionCount}
                            </p>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-green-500/20 rounded-lg p-3 text-center">
                                    <p className="text-green-400 font-bold">{data.summary.cash.transactionCount}</p>
                                    <p className="text-green-300 text-xs">Cash</p>
                                </div>
                                <div className="flex-1 bg-blue-500/20 rounded-lg p-3 text-center">
                                    <p className="text-blue-400 font-bold">{data.summary.card.transactionCount}</p>
                                    <p className="text-blue-300 text-xs">Card</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* By Barber Table */}
                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">Breakdown by Barber</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900/50">
                                <tr className="text-gray-400">
                                    <th className="text-left px-6 py-4">Barber</th>
                                    <th className="text-right px-6 py-4">Cash Revenue</th>
                                    <th className="text-right px-6 py-4">Card Revenue</th>
                                    <th className="text-right px-6 py-4">Cash Tips</th>
                                    <th className="text-right px-6 py-4">Card Tips</th>
                                    <th className="text-center px-6 py-4">Cash %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {data.byBarber.map((barber: any) => {
                                    const totalRev = barber.cashRevenue + barber.cardRevenue
                                    const barberCashPercent = totalRev > 0 ? (barber.cashRevenue / totalRev) * 100 : 0
                                    const isHighCash = barberCashPercent > 70

                                    return (
                                        <tr key={barber.id} className={`hover:bg-gray-800/50 ${isHighCash ? 'bg-orange-500/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                        {barber.name?.charAt(0) || 'S'}
                                                    </div>
                                                    <span className="text-white font-medium">{barber.name}</span>
                                                    {isHighCash && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-green-400 font-medium">
                                                {formatCurrency(barber.cashRevenue)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-blue-400 font-medium">
                                                {formatCurrency(barber.cardRevenue)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-green-300">
                                                {formatCurrency(barber.cashTips)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-blue-300">
                                                {formatCurrency(barber.cardTips)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${isHighCash ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-700 text-gray-300'
                                                    }`}>
                                                    {formatPercent(barberCashPercent)}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : null}
        </div>
    )
}
