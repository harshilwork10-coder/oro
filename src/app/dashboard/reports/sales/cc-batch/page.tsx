'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    CreditCard,
    ArrowLeft,
    Download,
    Calendar,
    Search,
    RefreshCw,
    FileText,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react'
import Link from 'next/link'

interface CCTransaction {
    id: string
    date: string
    time: string
    authCode: string
    last4: string
    cardType: string
    amount: number
    tipAmount: number
    totalAmount: number
    status: string
    invoiceNumber: string
    employeeName: string
}

export default function CCBatchReportPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [transactions, setTransactions] = useState<CCTransaction[]>([])
    const [startDate, setStartDate] = useState(() => {
        const today = new Date()
        return today.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => {
        const today = new Date()
        return today.toISOString().split('T')[0]
    })
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchTransactions()
    }, [startDate, endDate])

    const fetchTransactions = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/cc-batch?startDate=${startDate}&endDate=${endDate}`)
            if (res.ok) {
                const data = await res.json()
                setTransactions(data.transactions || [])
            }
        } catch (error) {
            console.error('Failed to fetch CC batch:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredTransactions = transactions.filter(tx =>
        tx.authCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.last4?.includes(searchTerm) ||
        tx.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totals = filteredTransactions.reduce((acc, tx) => ({
        count: acc.count + 1,
        amount: acc.amount + tx.amount,
        tips: acc.tips + tx.tipAmount,
        total: acc.total + tx.totalAmount
    }), { count: 0, amount: 0, tips: 0, total: 0 })

    const exportToCSV = () => {
        const headers = ['Date', 'Time', 'Invoice #', 'Card Type', 'Last 4', 'Auth Code', 'Amount', 'Tip', 'Total', 'Status', 'Employee']
        const rows = filteredTransactions.map(tx => [
            tx.date,
            tx.time,
            tx.invoiceNumber,
            tx.cardType,
            tx.last4,
            tx.authCode,
            tx.amount.toFixed(2),
            tx.tipAmount.toFixed(2),
            tx.totalAmount.toFixed(2),
            tx.status,
            tx.employeeName
        ])

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cc-batch-${startDate}-to-${endDate}.csv`
        a.click()
    }

    const getCardIcon = (cardType: string) => {
        const type = cardType?.toLowerCase() || ''
        if (type.includes('visa')) return '💳 Visa'
        if (type.includes('master')) return '💳 MC'
        if (type.includes('amex') || type.includes('american')) return '💳 Amex'
        if (type.includes('discover')) return '💳 Disc'
        if (type.includes('debit')) return '💳 Debit'
        return '💳 Card'
    }

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
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                                <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            Credit Card Batch Report
                        </h1>
                        <p className="text-gray-400 mt-1">For processor disputes and reconciliation</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchTransactions}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400 text-sm">From:</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">To:</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm"
                    />
                </div>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by Auth Code, Last 4, or Invoice #..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Transactions</p>
                    <p className="text-2xl font-bold text-white">{totals.count}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Subtotal</p>
                    <p className="text-2xl font-bold text-white">${totals.amount.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Tips</p>
                    <p className="text-2xl font-bold text-green-400">${totals.tips.toFixed(2)}</p>
                </div>
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4">
                    <p className="text-blue-300 text-sm">Batch Total</p>
                    <p className="text-2xl font-bold text-blue-400">${totals.total.toFixed(2)}</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Date/Time</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Invoice #</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Card Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Last 4</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Auth Code</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Amount</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Tip</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Total</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading transactions...
                                </td>
                            </tr>
                        ) : filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No credit card transactions found for this period
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="text-white text-sm">{tx.date}</div>
                                        <div className="text-gray-500 text-xs">{tx.time}</div>
                                    </td>
                                    <td className="px-4 py-3 text-white font-mono text-sm">{tx.invoiceNumber}</td>
                                    <td className="px-4 py-3 text-white text-sm">{getCardIcon(tx.cardType)}</td>
                                    <td className="px-4 py-3 text-white font-mono text-sm">****{tx.last4}</td>
                                    <td className="px-4 py-3 text-blue-400 font-mono text-sm font-medium">{tx.authCode}</td>
                                    <td className="px-4 py-3 text-white text-sm text-right">${tx.amount.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-green-400 text-sm text-right">${tx.tipAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-white text-sm text-right font-medium">${tx.totalAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {tx.status === 'COMPLETED' || tx.status === 'APPROVED' ? (
                                            <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                                                <CheckCircle className="w-3 h-3" />
                                                Approved
                                            </span>
                                        ) : tx.status === 'DECLINED' ? (
                                            <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                                                <XCircle className="w-3 h-3" />
                                                Declined
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-yellow-400 text-xs">
                                                <Clock className="w-3 h-3" />
                                                {tx.status}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Print Notice */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-300 text-sm">
                    💡 <strong>Tip:</strong> Use this report when disputing transactions with your processor.
                    The Auth Code and Last 4 digits are the key identifiers for transaction lookup.
                </p>
            </div>
        </div>
    )
}
