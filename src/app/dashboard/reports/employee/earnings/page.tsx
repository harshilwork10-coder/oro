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
    Scissors,
    CreditCard,
    Banknote,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    FileText,
    FileDown
} from 'lucide-react'

interface EarningsStatement {
    employee: {
        id: string
        name: string
        email: string
    }
    dateRange: {
        start: string
        end: string
    }
    compensationType: string
    summary: {
        totalTransactions: number
        serviceRevenue: number
        productRevenue: number
        totalRevenue: number
        commission: number
        tips: {
            total: number
            cash: number
            card: number
        }
        refundReversals: number
        netEarnings: number
    }
    servicesPerformed: Array<{
        name: string
        quantity: number
        price: number
        total: number
        commission: number
    }>
    transactions: Array<{
        id: string
        date: string
        total: number
        tip: number
        paymentMethod: string
        status: string
        itemCount: number
    }>
}

export default function EarningsStatementPage() {
    const [statements, setStatements] = useState<EarningsStatement[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState({
        start: getDefaultStartDate(),
        end: new Date().toISOString().split('T')[0]
    })
    const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
    const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)

    function getDefaultStartDate() {
        const now = new Date()
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        return startOfWeek.toISOString().split('T')[0]
    }

    useEffect(() => {
        fetchEarningsStatements()
    }, [dateRange])

    const fetchEarningsStatements = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                startDate: dateRange.start,
                endDate: dateRange.end
            })
            if (selectedEmployee !== 'all') {
                params.append('employeeId', selectedEmployee)
            }

            const res = await fetch(`/api/franchise/reports/earnings-statement?${params}`)
            if (res.ok) {
                const result = await res.json()
                setStatements(result.data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch earnings statements:', error)
        } finally {
            setLoading(false)
        }
    }

    const exportToCSV = () => {
        const headers = ['Employee', 'Services Revenue', 'Commission', 'Tips (Cash)', 'Tips (Card)', 'Total Tips', 'Refunds', 'Net Earnings']
        const rows = statements.map(s => [
            s.employee.name,
            s.summary.serviceRevenue.toFixed(2),
            s.summary.commission.toFixed(2),
            s.summary.tips.cash.toFixed(2),
            s.summary.tips.card.toFixed(2),
            s.summary.tips.total.toFixed(2),
            s.summary.refundReversals.toFixed(2),
            s.summary.netEarnings.toFixed(2)
        ])

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `earnings_statement_${dateRange.start}_${dateRange.end}.csv`
        a.click()
    }

    const exportToPDF = () => {
        const doc = new jsPDF()
        let yPos = 20

        // Title
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('Barber Earnings Statement', 20, yPos)
        yPos += 10

        // Date Range
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 20, yPos)
        yPos += 15

        // For each employee
        statements.forEach((statement, index) => {
            if (yPos > 250) {
                doc.addPage()
                yPos = 20
            }

            // Employee Name
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text(statement.employee.name, 20, yPos)
            yPos += 8

            // Summary
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Compensation Type: ${statement.compensationType}`, 20, yPos)
            yPos += 6
            doc.text(`Service Revenue: $${statement.summary.serviceRevenue.toFixed(2)}`, 20, yPos)
            yPos += 6
            doc.text(`Commission: $${statement.summary.commission.toFixed(2)}`, 20, yPos)
            yPos += 6
            doc.text(`Tips (Cash): $${statement.summary.tips.cash.toFixed(2)}  |  Tips (Card): $${statement.summary.tips.card.toFixed(2)}`, 20, yPos)
            yPos += 6
            doc.text(`Total Tips: $${statement.summary.tips.total.toFixed(2)}`, 20, yPos)
            yPos += 6
            doc.text(`Refund Reversals: -$${statement.summary.refundReversals.toFixed(2)}`, 20, yPos)
            yPos += 8

            // Net Earnings
            doc.setFont('helvetica', 'bold')
            doc.text(`NET EARNINGS: $${statement.summary.netEarnings.toFixed(2)}`, 20, yPos)
            yPos += 15

            // Services Table
            if (statement.servicesPerformed.length > 0) {
                doc.setFont('helvetica', 'bold')
                doc.text('Services Performed:', 20, yPos)
                yPos += 6

                doc.setFont('helvetica', 'normal')
                doc.setFontSize(9)
                statement.servicesPerformed.forEach(service => {
                    if (yPos > 270) {
                        doc.addPage()
                        yPos = 20
                    }
                    doc.text(`  ${service.name}: ${service.quantity}x @ $${service.price.toFixed(2)} = $${service.total.toFixed(2)} (Commission: $${service.commission.toFixed(2)})`, 20, yPos)
                    yPos += 5
                })
                yPos += 10
            }
        })

        // Footer
        doc.setFontSize(8)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285)

        doc.save(`earnings_statement_${dateRange.start}_${dateRange.end}.pdf`)
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
                            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            Barber Earnings Statement
                        </h1>
                        <p className="text-gray-400 mt-1">Detailed breakdown of earnings per barber/stylist</p>
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
                <button
                    onClick={fetchEarningsStatements}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
            ) : statements.length === 0 ? (
                <div className="glass-panel p-12 rounded-xl text-center">
                    <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No earnings data</h3>
                    <p className="text-gray-400">No transactions found for the selected date range.</p>
                </div>
            ) : (
                /* Earnings Statements */
                <div className="space-y-4">
                    {statements.map((statement) => (
                        <div
                            key={statement.employee.id}
                            className="glass-panel rounded-xl overflow-hidden"
                        >
                            {/* Employee Header */}
                            <button
                                onClick={() => setExpandedEmployee(
                                    expandedEmployee === statement.employee.id ? null : statement.employee.id
                                )}
                                className="w-full flex items-center justify-between p-6 hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        {statement.employee.name?.charAt(0) || 'S'}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-semibold text-white text-lg">{statement.employee.name}</h3>
                                        <p className="text-gray-400 text-sm">{statement.compensationType} compensation</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-gray-400 text-sm">Services</p>
                                        <p className="text-white font-semibold">{formatCurrency(statement.summary.serviceRevenue)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-400 text-sm">Commission</p>
                                        <p className="text-emerald-400 font-semibold">{formatCurrency(statement.summary.commission)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-400 text-sm">Tips</p>
                                        <p className="text-blue-400 font-semibold">{formatCurrency(statement.summary.tips.total)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-400 text-sm">Net Earnings</p>
                                        <p className="text-green-400 font-bold text-lg">{formatCurrency(statement.summary.netEarnings)}</p>
                                    </div>
                                    {expandedEmployee === statement.employee.id ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded Details */}
                            {expandedEmployee === statement.employee.id && (
                                <div className="border-t border-gray-700 p-6 space-y-6">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gray-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                                <Scissors className="w-4 h-4" />
                                                <span className="text-sm">Total Transactions</span>
                                            </div>
                                            <p className="text-2xl font-bold text-white">{statement.summary.totalTransactions}</p>
                                        </div>
                                        <div className="bg-gray-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                                <Banknote className="w-4 h-4" />
                                                <span className="text-sm">Cash Tips</span>
                                            </div>
                                            <p className="text-2xl font-bold text-green-400">{formatCurrency(statement.summary.tips.cash)}</p>
                                        </div>
                                        <div className="bg-gray-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                                <CreditCard className="w-4 h-4" />
                                                <span className="text-sm">Card Tips</span>
                                            </div>
                                            <p className="text-2xl font-bold text-blue-400">{formatCurrency(statement.summary.tips.card)}</p>
                                        </div>
                                        <div className="bg-gray-800/50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-red-400 mb-2">
                                                <RefreshCw className="w-4 h-4" />
                                                <span className="text-sm">Refund Reversals</span>
                                            </div>
                                            <p className="text-2xl font-bold text-red-400">-{formatCurrency(statement.summary.refundReversals)}</p>
                                        </div>
                                    </div>

                                    {/* Services Breakdown */}
                                    <div>
                                        <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-purple-400" />
                                            Services Performed
                                        </h4>
                                        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-900/50">
                                                    <tr className="text-gray-400">
                                                        <th className="text-left px-4 py-3">Service</th>
                                                        <th className="text-center px-4 py-3">Qty</th>
                                                        <th className="text-right px-4 py-3">Price</th>
                                                        <th className="text-right px-4 py-3">Total</th>
                                                        <th className="text-right px-4 py-3">Commission</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700">
                                                    {statement.servicesPerformed.map((service, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-4 py-3 text-white">{service.name}</td>
                                                            <td className="px-4 py-3 text-center text-gray-300">{service.quantity}</td>
                                                            <td className="px-4 py-3 text-right text-gray-300">{formatCurrency(service.price)}</td>
                                                            <td className="px-4 py-3 text-right text-white">{formatCurrency(service.total)}</td>
                                                            <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(service.commission)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Recent Transactions */}
                                    <div>
                                        <h4 className="text-white font-semibold mb-3">Recent Transactions</h4>
                                        <div className="bg-gray-800/50 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-900/50 sticky top-0">
                                                    <tr className="text-gray-400">
                                                        <th className="text-left px-4 py-3">Date</th>
                                                        <th className="text-left px-4 py-3">Transaction ID</th>
                                                        <th className="text-center px-4 py-3">Items</th>
                                                        <th className="text-center px-4 py-3">Payment</th>
                                                        <th className="text-right px-4 py-3">Total</th>
                                                        <th className="text-right px-4 py-3">Tip</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700">
                                                    {statement.transactions.slice(0, 10).map((tx) => (
                                                        <tr key={tx.id} className="hover:bg-gray-700/30">
                                                            <td className="px-4 py-3 text-gray-300">{formatDate(tx.date)}</td>
                                                            <td className="px-4 py-3 text-white font-mono text-xs">#{tx.id.slice(-8).toUpperCase()}</td>
                                                            <td className="px-4 py-3 text-center text-gray-300">{tx.itemCount}</td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`px-2 py-1 rounded text-xs ${tx.paymentMethod === 'CASH' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                                                    }`}>
                                                                    {tx.paymentMethod}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-white">{formatCurrency(tx.total)}</td>
                                                            <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(tx.tip)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Net Earnings Summary */}
                                    <div className="bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-500/30 rounded-xl p-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h4 className="text-emerald-400 font-semibold mb-1">Net Earnings Summary</h4>
                                                <p className="text-gray-400 text-sm">
                                                    Commission ({formatCurrency(statement.summary.commission)}) +
                                                    Tips ({formatCurrency(statement.summary.tips.total)}) -
                                                    Refunds ({formatCurrency(statement.summary.refundReversals)})
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-emerald-400">
                                                    {formatCurrency(statement.summary.netEarnings)}
                                                </p>
                                                <p className="text-gray-400 text-sm">Total Payout</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
