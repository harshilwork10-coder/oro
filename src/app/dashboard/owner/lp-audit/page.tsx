'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Shield, RefreshCw, AlertTriangle, Eye,
    TrendingUp, DollarSign, User, Store, Clock, Filter,
    AlertCircle, ChevronRight, X, CheckCircle
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface SuspiciousCashier {
    id: string
    name: string
    location: string
    totalTransactions: number
    voids: number
    refunds: number
    overrides: number
    riskScore: number
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface Alert {
    id: string
    type: string
    amount: number
    employeeName: string
    locationName: string
    reason: string
    time: string
}

interface Summary {
    totalTransactions: number
    totalVoids: number
    totalRefunds: number
    voidAmount: number
    refundAmount: number
    voidRate: number
    refundRate: number
}

export default function LPAuditDashboard() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [suspiciousCashiers, setSuspiciousCashiers] = useState<SuspiciousCashier[]>([])
    const [recentAlerts, setRecentAlerts] = useState<Alert[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [dateRange, setDateRange] = useState<{ start: string, end: string, days: number } | null>(null)
    const [selectedDays, setSelectedDays] = useState(7)
    const [selectedLocation, setSelectedLocation] = useState('all')
    const [selectedCashier, setSelectedCashier] = useState<SuspiciousCashier | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('days', selectedDays.toString())
            if (selectedLocation !== 'all') params.set('locationId', selectedLocation)

            const res = await fetch(`/api/owner/lp-audit?${params}`)
            const data = await res.json()

            setSuspiciousCashiers(data.suspiciousCashiers || [])
            setRecentAlerts(data.recentAlerts || [])
            setSummary(data.summary || null)
            setDateRange(data.dateRange || null)
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [selectedDays, selectedLocation])

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'HIGH': return 'text-red-400 bg-red-500/20 border-red-500/30'
            case 'MEDIUM': return 'text-amber-400 bg-amber-500/20 border-amber-500/30'
            default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Shield className="h-8 w-8 text-red-500" />
                            Loss Prevention Audit
                        </h1>
                        <p className="text-stone-400">Track suspicious activity and cashier performance</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedDays}
                        onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2"
                    >
                        <option value={1}>Today</option>
                        <option value={7}>Last 7 Days</option>
                        <option value={14}>Last 14 Days</option>
                        <option value={30}>Last 30 Days</option>
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-400" />
                        <span className="text-sm text-stone-400">Transactions</span>
                    </div>
                    <p className="text-3xl font-bold">{summary?.totalTransactions?.toLocaleString() || 0}</p>
                </div>

                <div className={`rounded-2xl p-4 border ${(summary?.totalVoids || 0) > 10
                        ? 'bg-red-500/20 border-red-500/30'
                        : 'bg-stone-900/80 border-stone-700'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <X className="h-5 w-5 text-red-400" />
                        <span className="text-sm text-stone-400">Voids</span>
                    </div>
                    <p className="text-3xl font-bold text-red-400">{summary?.totalVoids || 0}</p>
                    <p className="text-sm text-stone-500 mt-1">
                        {formatCurrency(summary?.voidAmount || 0)} ({summary?.voidRate?.toFixed(1) || 0}%)
                    </p>
                </div>

                <div className={`rounded-2xl p-4 border ${(summary?.totalRefunds || 0) > 10
                        ? 'bg-amber-500/20 border-amber-500/30'
                        : 'bg-stone-900/80 border-stone-700'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-amber-400 rotate-180" />
                        <span className="text-sm text-stone-400">Refunds</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">{summary?.totalRefunds || 0}</p>
                    <p className="text-sm text-stone-500 mt-1">
                        {formatCurrency(summary?.refundAmount || 0)} ({summary?.refundRate?.toFixed(1) || 0}%)
                    </p>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-orange-400" />
                        <span className="text-sm text-stone-400">High Risk</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-400">
                        {suspiciousCashiers.filter(c => c.riskLevel === 'HIGH').length}
                    </p>
                    <p className="text-sm text-stone-500 mt-1">cashiers flagged</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Suspicious Cashier Leaderboard */}
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold flex items-center gap-2 mb-4">
                        <User className="h-5 w-5 text-red-400" />
                        Suspicious Cashier Leaderboard
                    </h3>

                    {suspiciousCashiers.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
                            <p className="text-stone-400">No suspicious activity detected</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {suspiciousCashiers.map((cashier, index) => (
                                <button
                                    key={cashier.id}
                                    onClick={() => setSelectedCashier(cashier)}
                                    className={`w-full text-left rounded-xl p-4 border transition-all ${getRiskColor(cashier.riskLevel)}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl font-bold opacity-50">#{index + 1}</span>
                                        <div className="flex-1">
                                            <p className="font-medium">{cashier.name}</p>
                                            <p className="text-sm opacity-70">{cashier.location}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(cashier.riskLevel)}`}>
                                                {cashier.riskLevel}
                                            </span>
                                            <p className="text-sm mt-1">
                                                {cashier.voids}V / {cashier.refunds}R
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 bg-black/30 rounded-full h-2 overflow-hidden">
                                        <div
                                            className={`h-full ${cashier.riskLevel === 'HIGH' ? 'bg-red-500' :
                                                    cashier.riskLevel === 'MEDIUM' ? 'bg-amber-500' : 'bg-blue-500'
                                                }`}
                                            style={{ width: `${Math.min(cashier.riskScore * 5, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs mt-1 opacity-70">
                                        Risk Score: {cashier.riskScore.toFixed(1)}% • {cashier.totalTransactions} transactions
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Alerts */}
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold flex items-center gap-2 mb-4">
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                        Recent Alerts
                    </h3>

                    {recentAlerts.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle className="h-12 w-12 mx-auto text-emerald-500 mb-2" />
                            <p className="text-stone-400">No recent alerts</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {recentAlerts.map(alert => (
                                <div
                                    key={alert.id}
                                    className={`rounded-xl p-4 border ${alert.type === 'VOID'
                                            ? 'bg-red-500/10 border-red-500/30'
                                            : 'bg-amber-500/10 border-amber-500/30'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className={`text-xs px-2 py-0.5 rounded ${alert.type === 'VOID' ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/30 text-amber-300'
                                                }`}>
                                                {alert.type}
                                            </span>
                                            <p className="font-bold text-lg mt-1">{formatCurrency(alert.amount)}</p>
                                        </div>
                                        <div className="text-right text-sm text-stone-400">
                                            <p>{new Date(alert.time).toLocaleTimeString()}</p>
                                            <p>{new Date(alert.time).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-stone-400">
                                        <span className="flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            {alert.employeeName}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Store className="h-4 w-4" />
                                            {alert.locationName}
                                        </span>
                                    </div>
                                    {alert.reason && (
                                        <p className="text-sm text-stone-500 mt-2 italic">"{alert.reason}"</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Cashier Detail Modal */}
            {selectedCashier && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-stone-700">
                            <div>
                                <h2 className="text-xl font-bold">{selectedCashier.name}</h2>
                                <p className="text-stone-400">{selectedCashier.location}</p>
                            </div>
                            <button onClick={() => setSelectedCashier(null)} className="p-2 hover:bg-stone-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className={`p-4 rounded-xl border ${getRiskColor(selectedCashier.riskLevel)}`}>
                                <p className="text-sm opacity-70">Risk Level</p>
                                <p className="text-2xl font-bold">{selectedCashier.riskLevel}</p>
                                <p className="text-sm opacity-70 mt-1">Score: {selectedCashier.riskScore.toFixed(2)}%</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-stone-800 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-bold text-red-400">{selectedCashier.voids}</p>
                                    <p className="text-sm text-stone-400">Voids</p>
                                </div>
                                <div className="bg-stone-800 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-bold text-amber-400">{selectedCashier.refunds}</p>
                                    <p className="text-sm text-stone-400">Refunds</p>
                                </div>
                            </div>

                            <div className="bg-stone-800 rounded-xl p-4">
                                <p className="text-stone-400 text-sm">Total Transactions</p>
                                <p className="text-2xl font-bold">{selectedCashier.totalTransactions}</p>
                            </div>
                        </div>
                        <div className="p-5 border-t border-stone-700">
                            <button
                                onClick={() => setSelectedCashier(null)}
                                className="w-full py-3 bg-stone-700 hover:bg-stone-600 rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

