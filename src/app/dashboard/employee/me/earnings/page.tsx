'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    DollarSign,
    TrendingUp,
    Clock,
    Zap,
    Target,
    Award,
    RefreshCw,
    ArrowLeft
} from 'lucide-react'


interface EarningsData {
    employeeName: string
    shiftStart: Date
    currentTime: Date
    shiftDuration: number
    isActiveShift: boolean

    serviceRevenue: number
    productRevenue: number
    totalRevenue: number

    serviceCommission: number
    productCommission: number
    totalCommission: number
    tips: number
    baseSalary: number
    hourlyWages: number
    grossPay: number

    servicesPerformed: number
    hoursWorked: number
    paymentType: string
    commissionRate: number

    tierProgress: {
        currentTier: { name: string; percentage: number }
        nextTier: { name: string; percentage: number; minRevenue: number }
        progress: number
        remaining: number
    } | null

    averagePerService: number
    averagePerHour: number
}

export default function RealTimeEarningsPreview() {
    const [earnings, setEarnings] = useState<EarningsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

    const fetchEarnings = async () => {
        try {
            const response = await fetch('/api/employees/me/earnings')
            if (response.ok) {
                const data = await response.json()
                setEarnings(data)
                setLastUpdated(new Date())
            }
        } catch (error) {
            console.error('Error fetching earnings:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEarnings()

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchEarnings, 30000)

        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!earnings) {
        return (
            <div className="p-8 text-center text-stone-400">
                No earnings data available
            </div>
        )
    }

    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
    const formatTime = (date: Date) => new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    })

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/employee" className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5 text-stone-400" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-stone-100">
                            💰 Your Earnings Today
                        </h1>
                        <p className="text-stone-400 mt-1">
                            {earnings.isActiveShift ? 'Active Shift' : 'Today'} •
                            Started at {formatTime(earnings.shiftStart)} •
                            {earnings.shiftDuration} hours
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchEarnings}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            {/* Main Earnings Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 to-amber-600 rounded-2xl p-8 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="h-6 w-6" />
                        <span className="text-lg opacity-90">Total Earnings</span>
                    </div>
                    <div className="text-6xl font-bold mb-6">
                        {formatCurrency(earnings.grossPay)}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm opacity-70">Commission</p>
                            <p className="text-2xl font-semibold">
                                {formatCurrency(earnings.totalCommission)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm opacity-70">Tips</p>
                            <p className="text-2xl font-semibold">
                                {formatCurrency(earnings.tips)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm opacity-70">Services</p>
                            <p className="text-2xl font-semibold">
                                {earnings.servicesPerformed}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tier Progress */}
            {earnings.tierProgress && (
                <div className="bg-stone-900 border-2 border-stone-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-stone-100 flex items-center gap-2">
                                <Target className="h-5 w-5 text-orange-400" />
                                Commission Tier Progress
                            </h3>
                            <p className="text-stone-400 text-sm mt-1">
                                Current: {earnings.tierProgress.currentTier.name}
                                ({earnings.tierProgress.currentTier.percentage}%)
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-stone-400">Next Tier</p>
                            <p className="text-lg font-semibold text-orange-400">
                                {earnings.tierProgress.nextTier.name}
                                ({earnings.tierProgress.nextTier.percentage}%)
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-4 bg-stone-800 rounded-full overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${earnings.tierProgress.progress}%` }}
                        />
                    </div>

                    <p className="text-center text-stone-300 mt-3">
                        <span className="font-semibold text-orange-400">
                            {formatCurrency(earnings.tierProgress.remaining)}
                        </span> more to unlock {earnings.tierProgress.nextTier.name} tier!
                    </p>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={DollarSign}
                    label="Revenue Generated"
                    value={formatCurrency(earnings.totalRevenue)}
                    subtext={`${formatCurrency(earnings.serviceRevenue)} services + ${formatCurrency(earnings.productRevenue)} products`}
                    color="emerald"
                />

                <StatCard
                    icon={TrendingUp}
                    label="Avg Per Service"
                    value={formatCurrency(earnings.averagePerService)}
                    subtext={`${earnings.servicesPerformed} services completed`}
                    color="blue"
                />

                <StatCard
                    icon={Clock}
                    label="Avg Per Hour"
                    value={formatCurrency(earnings.averagePerHour)}
                    subtext={`${earnings.shiftDuration} hours worked`}
                    color="purple"
                />

                <StatCard
                    icon={Zap}
                    label="Commission Rate"
                    value={`${(earnings.commissionRate * 100).toFixed(0)}%`}
                    subtext={earnings.paymentType}
                    color="orange"
                />
            </div>

            {/* Breakdown */}
            <div className="bg-stone-900 border-2 border-stone-800 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-stone-100 mb-4">
                    Earnings Breakdown
                </h3>

                <div className="space-y-3">
                    <BreakdownRow
                        label="Service Commission"
                        amount={earnings.serviceCommission}
                        detail={`${(earnings.commissionRate * 100).toFixed(0)}% of ${formatCurrency(earnings.serviceRevenue)}`}
                    />
                    <BreakdownRow
                        label="Product Commission"
                        amount={earnings.productCommission}
                        detail={`From retail sales`}
                    />
                    <BreakdownRow
                        label="Tips"
                        amount={earnings.tips}
                        detail="Customer gratuities"
                    />
                    {earnings.baseSalary > 0 && (
                        <BreakdownRow
                            label="Base Salary"
                            amount={earnings.baseSalary}
                            detail="Guaranteed minimum"
                        />
                    )}
                    {earnings.hourlyWages > 0 && (
                        <BreakdownRow
                            label="Hourly Wages"
                            amount={earnings.hourlyWages}
                            detail={`${earnings.hoursWorked.toFixed(1)} hours`}
                        />
                    )}

                    <div className="border-t border-stone-700 pt-3 mt-3">
                        <BreakdownRow
                            label="Total Earnings"
                            amount={earnings.grossPay}
                            detail="Before deductions"
                            highlight
                        />
                    </div>
                </div>
            </div>

            {/* Auto-refresh notice */}
            <p className="text-center text-sm text-stone-500">
                Auto-updates every 30 seconds • Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
        </div>
    )
}

function StatCard({ icon: Icon, label, value, subtext, color }: any) {
    const colors = {
        emerald: 'from-emerald-600 to-teal-600',
        blue: 'from-blue-600 to-cyan-600',
        purple: 'from-purple-600 to-pink-600',
        orange: 'from-orange-600 to-amber-600'
    }

    return (
        <div className="bg-stone-900 border-2 border-stone-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[color as keyof typeof colors]}`}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-sm text-stone-400">{label}</p>
            </div>
            <p className="text-2xl font-bold text-stone-100 mb-1">{value}</p>
            <p className="text-xs text-stone-500">{subtext}</p>
        </div>
    )
}

function BreakdownRow({ label, amount, detail, highlight }: any) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className={`${highlight ? 'text-lg font-semibold text-orange-400' : 'text-stone-300'}`}>
                    {label}
                </p>
                <p className="text-xs text-stone-500">{detail}</p>
            </div>
            <p className={`${highlight ? 'text-xl font-bold text-orange-400' : 'text-lg font-semibold text-stone-200'}`}>
                ${amount.toFixed(2)}
            </p>
        </div>
    )
}
