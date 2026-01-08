'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
    Download, CalendarRange, DollarSign, Users, TrendingUp,
    Clock, Scissors, ChevronDown, Loader2, FileSpreadsheet
} from 'lucide-react'

interface EmployeeReport {
    employeeId: string
    employeeName: string
    paymentType: string
    serviceRevenue: number
    productRevenue: number
    totalRevenue: number
    serviceCommission: number
    productCommission: number
    totalCommission: number
    baseSalary: number
    hourlyWages: number
    tips: number
    bonuses: number
    rentalFee: number
    grossPay: number
    hoursWorked: number
    servicesPerformed: number
    currentTier?: string
}

interface ReportTotals {
    totalRevenue: number
    totalCommission: number
    totalTips: number
    totalGrossPay: number
    totalServices: number
    totalHours: number
}

export default function PayoutReportsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        }
    })

    const user = session?.user as any
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState<EmployeeReport[]>([])
    const [totals, setTotals] = useState<ReportTotals | null>(null)
    const [periodStart, setPeriodStart] = useState('')
    const [periodEnd, setPeriodEnd] = useState('')

    // Date range state
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/payroll/reports?startDate=${startDate}&endDate=${endDate}`)
            if (res.ok) {
                const data = await res.json()
                setEmployees(data.employees)
                setTotals(data.totals)
                setPeriodStart(data.periodStart)
                setPeriodEnd(data.periodEnd)
            }
        } catch (err) {
            console.error('Failed to fetch report:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user?.id) {
            fetchReport()
        }
    }, [user?.id])

    const downloadCSV = () => {
        window.open(`/api/payroll/reports?startDate=${startDate}&endDate=${endDate}&format=csv`, '_blank')
    }

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

    // Check authorization
    if (status === 'loading') {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
            </DashboardLayout>
        )
    }

    if (!['OWNER', 'MANAGER', 'PROVIDER'].includes(user?.role)) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center">
                    <h1 className="text-xl font-bold text-red-400">Access Denied</h1>
                    <p className="text-stone-400 mt-2">Only owners and managers can view payout reports.</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <FileSpreadsheet className="h-7 w-7 text-violet-400" />
                            Payout Reports
                        </h1>
                        <p className="text-stone-400 mt-1">Staff earnings and commission breakdown</p>
                    </div>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>

                {/* Date Range Filter */}
                <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <CalendarRange className="h-5 w-5 text-violet-400" />
                            <span className="text-stone-300 font-medium">Period:</span>
                        </div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white focus:border-violet-500 outline-none"
                        />
                        <span className="text-stone-500">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white focus:border-violet-500 outline-none"
                        />
                        <button
                            onClick={fetchReport}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
                        >
                            Generate Report
                        </button>
                    </div>
                </div>

                {/* Totals Summary */}
                {totals && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-stone-400 mb-2">
                                <TrendingUp className="h-4 w-4" />
                                <span className="text-xs">Total Revenue</span>
                            </div>
                            <p className="text-xl font-bold text-white">{formatCurrency(totals.totalRevenue)}</p>
                        </div>
                        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-stone-400 mb-2">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-xs">Total Commission</span>
                            </div>
                            <p className="text-xl font-bold text-emerald-400">{formatCurrency(totals.totalCommission)}</p>
                        </div>
                        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-stone-400 mb-2">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-xs">Total Tips</span>
                            </div>
                            <p className="text-xl font-bold text-amber-400">{formatCurrency(totals.totalTips)}</p>
                        </div>
                        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-stone-400 mb-2">
                                <DollarSign className="h-4 w-4" />
                                <span className="text-xs">Total Gross Pay</span>
                            </div>
                            <p className="text-xl font-bold text-violet-400">{formatCurrency(totals.totalGrossPay)}</p>
                        </div>
                        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-stone-400 mb-2">
                                <Scissors className="h-4 w-4" />
                                <span className="text-xs">Total Services</span>
                            </div>
                            <p className="text-xl font-bold text-white">{totals.totalServices}</p>
                        </div>
                        <div className="bg-stone-900/50 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-stone-400 mb-2">
                                <Clock className="h-4 w-4" />
                                <span className="text-xs">Total Hours</span>
                            </div>
                            <p className="text-xl font-bold text-white">{totals.totalHours.toFixed(1)}</p>
                        </div>
                    </div>
                )}

                {/* Employee Table */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                    </div>
                ) : employees.length === 0 ? (
                    <div className="text-center py-16 text-stone-400">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No employee data for this period</p>
                    </div>
                ) : (
                    <div className="bg-stone-900/50 border border-stone-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-stone-800/50 border-b border-stone-700">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-stone-300">Employee</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-stone-300">Type</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-stone-300">Revenue</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-stone-300">Commission</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-stone-300">Tips</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-stone-300">Gross Pay</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-stone-300">Services</th>
                                        <th className="text-right px-4 py-3 text-sm font-medium text-stone-300">Hours</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-800">
                                    {employees.map((emp) => (
                                        <tr key={emp.employeeId} className="hover:bg-stone-800/30">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-medium">
                                                        {emp.employeeName.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-white">{emp.employeeName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-stone-700/50 rounded text-xs text-stone-300">
                                                    {emp.paymentType}
                                                </span>
                                                {emp.currentTier && (
                                                    <span className="ml-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                                                        {emp.currentTier}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-white font-medium">
                                                {formatCurrency(emp.totalRevenue)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                                                {formatCurrency(emp.totalCommission)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-amber-400">
                                                {formatCurrency(emp.tips)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-violet-400 font-bold">
                                                {formatCurrency(emp.grossPay)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-stone-300">
                                                {emp.servicesPerformed}
                                            </td>
                                            <td className="px-4 py-3 text-right text-stone-300">
                                                {emp.hoursWorked.toFixed(1)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
