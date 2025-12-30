'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Calendar, Users, TrendingUp, Filter, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TipSummary {
    totalTips: number
    transactionCount: number
    averageTip: number
}

interface EmployeeTips {
    employeeId: string
    employeeName: string
    totalTips: number
    transactionCount: number
    averageTip: number
}

interface TipTransaction {
    id: string
    tip: number
    total: number
    createdAt: string
    employee?: { name: string }
    client?: { firstName: string; lastName: string }
}

export default function TipsReportPage() {
    const [summary, setSummary] = useState<TipSummary | null>(null)
    const [byEmployee, setByEmployee] = useState<EmployeeTips[]>([])
    const [transactions, setTransactions] = useState<TipTransaction[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('week')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        fetchTipsReport()
    }, [dateRange, startDate, endDate])

    const getDateParams = () => {
        const now = new Date()
        let start: Date
        let end = new Date()

        switch (dateRange) {
            case 'today':
                start = new Date(now.setHours(0, 0, 0, 0))
                break
            case 'week':
                start = new Date(now)
                start.setDate(start.getDate() - 7)
                break
            case 'month':
                start = new Date(now)
                start.setMonth(start.getMonth() - 1)
                break
            case 'custom':
                return {
                    startDate: startDate || undefined,
                    endDate: endDate || undefined
                }
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        }
    }

    const fetchTipsReport = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            const dates = getDateParams()
            if (dates.startDate) params.append('startDate', dates.startDate)
            if (dates.endDate) params.append('endDate', dates.endDate)

            const res = await fetch(`/api/reports/tips?${params}`)
            if (res.ok) {
                const data = await res.json()
                setSummary(data.summary)
                setByEmployee(data.byEmployee)
                setTransactions(data.transactions)
            }
        } catch (error) {
            console.error('Failed to fetch tips report:', error)
        } finally {
            setLoading(false)
        }
    }

    const exportCSV = () => {
        if (!byEmployee.length) return

        const headers = ['Employee', 'Total Tips', 'Transactions', 'Average Tip']
        const rows = byEmployee.map(emp => [
            emp.employeeName,
            emp.totalTips.toFixed(2),
            emp.transactionCount.toString(),
            emp.averageTip.toFixed(2)
        ])

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tips-report-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <DollarSign className="w-8 h-8 text-green-600" />
                        Tips Report
                    </h1>
                    <p className="text-gray-500 mt-1">Track and manage employee tips</p>
                </div>
                <button
                    onClick={exportCSV}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                    <Download className="w-5 h-5" />
                    Export CSV
                </button>
            </div>

            {/* Date Filters */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <Filter className="w-5 h-5 text-gray-400" />
                    <div className="flex gap-2">
                        {(['today', 'week', 'month', 'custom'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${dateRange === range
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                    {dateRange === 'custom' && (
                        <div className="flex gap-2 items-center">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-green-800 font-medium">Total Tips</span>
                        <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-700">
                        {formatCurrency(summary?.totalTips || 0)}
                    </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-800 font-medium">Transactions w/ Tips</span>
                        <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-700">
                        {summary?.transactionCount || 0}
                    </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-800 font-medium">Average Tip</span>
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-purple-700">
                        {formatCurrency(summary?.averageTip || 0)}
                    </p>
                </div>
            </div>

            {/* By Employee */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Tips by Employee
                    </h2>
                </div>
                {byEmployee.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No tips in this period
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 text-sm text-gray-600">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Employee</th>
                                <th className="px-4 py-3 text-right font-medium">Transactions</th>
                                <th className="px-4 py-3 text-right font-medium">Total Tips</th>
                                <th className="px-4 py-3 text-right font-medium">Avg Tip</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {byEmployee.map((emp) => (
                                <tr key={emp.employeeId} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{emp.employeeName}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">{emp.transactionCount}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                                        {formatCurrency(emp.totalTips)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">
                                        {formatCurrency(emp.averageTip)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-semibold text-gray-900">Recent Transactions with Tips</h2>
                </div>
                {transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No transactions with tips
                    </div>
                ) : (
                    <div className="divide-y max-h-96 overflow-auto">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {tx.employee?.name || 'Unknown'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {tx.client ? `${tx.client.firstName} ${tx.client.lastName}` : 'Walk-in'} •{' '}
                                        {new Date(tx.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-green-600">{formatCurrency(Number(tx.tip))}</p>
                                    <p className="text-sm text-gray-500">of {formatCurrency(Number(tx.total))}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

