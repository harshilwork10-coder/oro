'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    DollarSign,
    TrendingUp,
    Users,
    Scissors,
    Calendar,
    ArrowUp,
    ArrowDown,
    Clock
} from 'lucide-react'

interface ReportData {
    tipsToday: number
    tipsWeek: number
    tipsMonth: number
    commissionToday: number
    commissionWeek: number
    commissionMonth: number
    servicesCompleted: number
    clientsServed: number
    avgTicket: number
    returnRate: number
    hoursWorked: number
}

export default function MyReportsPage() {
    const { data: session } = useSession()
    const [data, setData] = useState<ReportData | null>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')

    useEffect(() => {
        fetchReports()
    }, [])

    const fetchReports = async () => {
        try {
            const res = await fetch('/api/employee/my-reports')
            if (res.ok) {
                const reportData = await res.json()
                setData(reportData)
            }
        } catch (error) {
            console.error('Failed to fetch reports:', error)
        } finally {
            setLoading(false)
        }
    }

    // Demo data for now
    const demoData: ReportData = {
        tipsToday: 78.50,
        tipsWeek: 342.00,
        tipsMonth: 1450.00,
        commissionToday: 156.00,
        commissionWeek: 890.00,
        commissionMonth: 3680.00,
        servicesCompleted: 8,
        clientsServed: 6,
        avgTicket: 85.00,
        returnRate: 72,
        hoursWorked: 6.5
    }

    const reportData = data || demoData

    const tips = period === 'today' ? reportData.tipsToday :
        period === 'week' ? reportData.tipsWeek : reportData.tipsMonth
    const commission = period === 'today' ? reportData.commissionToday :
        period === 'week' ? reportData.commissionWeek : reportData.commissionMonth

    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">My Reports</h1>
                    <p className="text-gray-400">
                        Welcome back, {session?.user?.name || 'Team Member'}
                    </p>
                </div>

                {/* Period Toggle */}
                <div className="flex gap-2 mb-6">
                    {(['today', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${period === p
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Earnings Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Tips */}
                    <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex items-center gap-1 text-green-200">
                                <ArrowUp className="w-4 h-4" />
                                <span className="text-sm">+12%</span>
                            </div>
                        </div>
                        <p className="text-green-100 text-sm mb-1">Tips Earned</p>
                        <p className="text-4xl font-bold text-white">${tips.toFixed(2)}</p>
                    </div>

                    {/* Commission */}
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex items-center gap-1 text-purple-200">
                                <ArrowUp className="w-4 h-4" />
                                <span className="text-sm">+8%</span>
                            </div>
                        </div>
                        <p className="text-purple-100 text-sm mb-1">Commission</p>
                        <p className="text-4xl font-bold text-white">${commission.toFixed(2)}</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Scissors className="w-5 h-5 text-orange-400" />
                            <span className="text-gray-400 text-sm">Services</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{reportData.servicesCompleted}</p>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            <span className="text-gray-400 text-sm">Clients</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{reportData.clientsServed}</p>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-green-400" />
                            <span className="text-gray-400 text-sm">Avg Ticket</span>
                        </div>
                        <p className="text-2xl font-bold text-white">${reportData.avgTicket}</p>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-yellow-400" />
                            <span className="text-gray-400 text-sm">Hours</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{reportData.hoursWorked}h</p>
                    </div>
                </div>

                {/* Client Retention */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Client Retention</h3>
                        <span className="text-green-400 text-sm">+5% vs last month</span>
                    </div>
                    <div className="flex items-end gap-4">
                        <p className="text-5xl font-bold text-white">{reportData.returnRate}%</p>
                        <p className="text-gray-400 mb-2">of your clients return</p>
                    </div>
                    <div className="mt-4 bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${reportData.returnRate}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
