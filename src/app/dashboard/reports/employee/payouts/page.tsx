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
    User,
    CheckCircle,
    Clock,
    Banknote,
    CreditCard,
    FileDown
} from 'lucide-react'

interface PayoutRecord {
    id: string
    employee: {
        id: string
        name: string
        email: string
    }
    period: {
        start: string
        end: string
    }
    compensationType: string
    breakdown: {
        serviceRevenue: number
        commission: number
        tips: {
            total: number
            cash: number
            card: number
        }
        chairRent: number
        adjustments: number
    }
    totalPayout: number
    status: string
    transactionCount: number
    lastUpdated: string
}

export default function PayoutHistoryPage() {
    const [payouts, setPayouts] = useState<PayoutRecord[]>([])
    const [summary, setSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: getDefaultStartDate(),
        end: new Date().toISOString().split('T')[0]
    })

    function getDefaultStartDate() {
        const now = new Date()
        now.setDate(now.getDate() - 30)
        return now.toISOString().split('T')[0]
    }

    useEffect(() => {
        fetchPayouts()
    }, [dateRange])

    const fetchPayouts = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                startDate: dateRange.start,
                endDate: dateRange.end
            })

            const res = await fetch(`/api/franchise/reports/payout-history?${params}`)
            if (res.ok) {
                const result = await res.json()
                setPayouts(result.data.data || [])
                setSummary(result.data.summary || null)
            }
        } catch (error) {
            console.error('Failed to fetch payouts:', error)
        } finally {
            setLoading(false)
        }
    }

    const exportToCSV = () => {
        const headers = ['Employee', 'Period', 'Type', 'Service Revenue', 'Commission', 'Tips', 'Chair Rent', 'Total Payout', 'Status', 'Transactions']
        const rows = payouts.map(p => [
            p.employee.name,
            `${new Date(p.period.start).toLocaleDateString()} - ${new Date(p.period.end).toLocaleDateString()}`,
            p.compensationType,
            p.breakdown.serviceRevenue.toFixed(2),
            p.breakdown.commission.toFixed(2),
            p.breakdown.tips.total.toFixed(2),
            p.breakdown.chairRent.toFixed(2),
            p.totalPayout.toFixed(2),
            p.status,
            p.transactionCount
        ])

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payout_history_${dateRange.start}_${dateRange.end}.csv`
        a.click()
    }

    const exportToPDF = () => {
        const doc = new jsPDF()
        let yPos = 20

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Payout History Report', 20, yPos)
        yPos += 10

        // Date Range
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 20, yPos)
        yPos += 10

        // Summary
        if (summary) {
            doc.setFont('helvetica', 'bold')
            doc.text('Summary:', 20, yPos)
            yPos += 6
            doc.setFont('helvetica', 'normal')
            doc.text(`Total Employees: ${summary.totalEmployees}`, 25, yPos)
            yPos += 5
            doc.text(`Total Commissions: $${summary.totalCommissions.toFixed(2)}`, 25, yPos)
            yPos += 5
            doc.text(`Total Tips: $${summary.totalTips.toFixed(2)}`, 25, yPos)
            yPos += 5
            doc.text(`Total Chair Rent: $${summary.totalChairRent.toFixed(2)}`, 25, yPos)
            yPos += 5
            doc.text(`Total Payouts: $${summary.totalPayouts.toFixed(2)}`, 25, yPos)
            yPos += 15
        }

        // Table Header
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text('Employee', 20, yPos)
        doc.text('Type', 70, yPos)
        doc.text('Commission', 100, yPos)
        doc.text('Tips', 130, yPos)
        doc.text('Payout', 160, yPos)
        doc.text('Status', 185, yPos)
        yPos += 6

        // Table Rows
        doc.setFont('helvetica', 'normal')
        payouts.forEach(payout => {
            if (yPos > 270) {
                doc.addPage()
                yPos = 20
            }
            doc.text(payout.employee.name.substring(0, 20), 20, yPos)
            doc.text(payout.compensationType, 70, yPos)
            doc.text(`$${payout.breakdown.commission.toFixed(2)}`, 100, yPos)
            doc.text(`$${payout.breakdown.tips.total.toFixed(2)}`, 130, yPos)
            doc.text(`$${payout.totalPayout.toFixed(2)}`, 160, yPos)
            doc.text(payout.status.toUpperCase(), 185, yPos)
            yPos += 6
        })

        // Footer
        doc.setFontSize(8)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285)

        doc.save(`payout_history_${dateRange.start}_${dateRange.end}.pdf`)
    }

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString()

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/reports/employee"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            Payout History
                        </h1>
                        <p className="text-gray-400 mt-1">Track all payouts to barbers/stylists</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={exportToPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                    >
                        <FileDown className="w-4 h-4" />
                        PDF
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="glass-panel p-4 rounded-xl">
                        <p className="text-gray-400 text-sm mb-1">Total Employees</p>
                        <p className="text-2xl font-bold text-white">{summary.totalEmployees}</p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <p className="text-gray-400 text-sm mb-1">Total Commissions</p>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.totalCommissions)}</p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <p className="text-gray-400 text-sm mb-1">Total Tips</p>
                        <p className="text-2xl font-bold text-blue-400">{formatCurrency(summary.totalTips)}</p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl">
                        <p className="text-gray-400 text-sm mb-1">Chair Rent Collected</p>
                        <p className="text-2xl font-bold text-orange-400">{formatCurrency(summary.totalChairRent)}</p>
                    </div>
                    <div className="glass-panel p-4 rounded-xl bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30">
                        <p className="text-green-300 text-sm mb-1">Total Payouts</p>
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.totalPayouts)}</p>
                    </div>
                </div>
            )}

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

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            ) : payouts.length === 0 ? (
                <div className="glass-panel p-12 rounded-xl text-center">
                    <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No payout data</h3>
                    <p className="text-gray-400">No transactions found for the selected date range.</p>
                </div>
            ) : (
                /* Payout Table */
                <div className="glass-panel rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-900/50">
                            <tr className="text-gray-400">
                                <th className="text-left px-6 py-4">Employee</th>
                                <th className="text-left px-6 py-4">Period</th>
                                <th className="text-center px-6 py-4">Type</th>
                                <th className="text-right px-6 py-4">Commission</th>
                                <th className="text-right px-6 py-4">Tips</th>
                                <th className="text-right px-6 py-4">Chair Rent</th>
                                <th className="text-right px-6 py-4">Total Payout</th>
                                <th className="text-center px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {payouts.map((payout) => (
                                <tr key={payout.id} className="hover:bg-gray-800/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                                {payout.employee.name?.charAt(0) || 'S'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{payout.employee.name}</p>
                                                <p className="text-gray-400 text-xs">{payout.transactionCount} transactions</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">
                                        {formatDate(payout.period.start)} - {formatDate(payout.period.end)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs ${payout.compensationType === 'COMMISSION' ? 'bg-purple-500/20 text-purple-400' :
                                            payout.compensationType === 'CHAIR_RENTAL' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {payout.compensationType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-emerald-400 font-medium">
                                        {formatCurrency(payout.breakdown.commission)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div>
                                            <p className="text-blue-400 font-medium">{formatCurrency(payout.breakdown.tips.total)}</p>
                                            <p className="text-gray-500 text-xs">
                                                <Banknote className="w-3 h-3 inline mr-1" />
                                                {formatCurrency(payout.breakdown.tips.cash)}
                                                <CreditCard className="w-3 h-3 inline mx-1" />
                                                {formatCurrency(payout.breakdown.tips.card)}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-orange-400">
                                        {payout.breakdown.chairRent > 0 ? `-${formatCurrency(payout.breakdown.chairRent)}` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-green-400 text-lg">
                                        {formatCurrency(payout.totalPayout)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {payout.status === 'paid' ? (
                                            <span className="flex items-center justify-center gap-1 text-green-400">
                                                <CheckCircle className="w-4 h-4" />
                                                Paid
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-1 text-yellow-400">
                                                <Clock className="w-4 h-4" />
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
