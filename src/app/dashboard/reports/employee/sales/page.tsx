'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    DollarSign,
    ArrowLeft,
    Calendar,
    RefreshCw,
    User,
    TrendingUp
} from 'lucide-react'
import Link from 'next/link'

interface EmployeeSales {
    id: string
    name: string
    transactionCount: number
    revenue: number
    averageTicket: number
}

export default function SalesByEmployeePage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState<EmployeeSales[]>([])
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        fetchData()
    }, [startDate, endDate])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/sales-by-employee?startDate=${startDate}&endDate=${endDate}`)
            if (res.ok) {
                const data = await res.json()
                setEmployees(data.employees || [])
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    const totalRevenue = employees.reduce((sum, e) => sum + e.revenue, 0)
    const totalTransactions = employees.reduce((sum, e) => sum + e.transactionCount, 0)

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports/employee" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            Sales by Employee
                        </h1>
                        <p className="text-gray-400 mt-1">Revenue and transactions per employee</p>
                    </div>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
                <span className="text-gray-400">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Employees</p>
                    <p className="text-2xl font-bold text-white">{employees.length}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Transactions</p>
                    <p className="text-2xl font-bold text-white">{totalTransactions}</p>
                </div>
                <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4">
                    <p className="text-green-300 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-400">${totalRevenue.toFixed(2)}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Employee</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Transactions</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Revenue</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Avg Ticket</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">% of Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : employees.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No sales data</td></tr>
                        ) : (
                            employees.map((emp, idx) => (
                                <tr key={emp.id} className={`hover:bg-gray-700/30 ${idx === 0 ? 'bg-green-900/10' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <User className="w-4 h-4 text-gray-500" />
                                            <span className="text-white font-medium">{emp.name}</span>
                                            {idx === 0 && <TrendingUp className="w-4 h-4 text-green-400" />}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-white">{emp.transactionCount}</td>
                                    <td className="px-4 py-3 text-right text-green-400 font-medium">${emp.revenue.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-white">${emp.averageTicket.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">{totalRevenue > 0 ? ((emp.revenue / totalRevenue) * 100).toFixed(1) : 0}%</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

