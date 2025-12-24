'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Calendar, RefreshCw, TrendingUp, TrendingDown,
    DollarSign, Store, CheckCircle, Lock, ChevronLeft, ChevronRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Summary {
    totalSales: number
    totalTransactions: number
    totalItems: number
    cashSales: number
    cardSales: number
    averageTicket: number
    voidCount: number
}

interface LocationData {
    id: string
    name: string
    sales: number
    transactions: number
    items: number
    cash: number
    card: number
    percentOfTotal: string
}

export default function MonthClosePage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [closing, setClosing] = useState(false)
    const [month, setMonth] = useState(new Date().getMonth())
    const [year, setYear] = useState(new Date().getFullYear())
    const [data, setData] = useState<any>(null)
    const [message, setMessage] = useState('')

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/owner/month-close?month=${month}&year=${year}`)
            const result = await res.json()
            setData(result)
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [month, year])

    const prevMonth = () => {
        if (month === 0) {
            setMonth(11)
            setYear(year - 1)
        } else {
            setMonth(month - 1)
        }
    }

    const nextMonth = () => {
        const now = new Date()
        const current = new Date(year, month)
        if (current < now) {
            if (month === 11) {
                setMonth(0)
                setYear(year + 1)
            } else {
                setMonth(month + 1)
            }
        }
    }

    const handleClose = async () => {
        if (!confirm(`Are you sure you want to close ${data?.monthName} ${year}? This action marks the month as closed for accounting.`)) return

        setClosing(true)
        try {
            const res = await fetch('/api/owner/month-close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, year })
            })
            const result = await res.json()
            if (res.ok) {
                setMessage('✓ ' + result.message)
            }
        } catch (error) {
            setMessage('Failed to close month')
        } finally {
            setClosing(false)
        }
    }

    const isCurrentMonth = month === new Date().getMonth() && year === new Date().getFullYear()

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
                            <Calendar className="h-8 w-8 text-pink-500" />
                            Month-End Close
                        </h1>
                        <p className="text-stone-400">Review and close monthly accounting period</p>
                    </div>
                </div>
                <button
                    onClick={handleClose}
                    disabled={closing || isCurrentMonth}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-xl disabled:opacity-50"
                >
                    {closing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Close {data?.monthName}
                </button>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-xl ${message.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* Month Navigation */}
            <div className="flex items-center justify-center gap-4 mb-8">
                <button onClick={prevMonth} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-full">
                    <ChevronLeft className="h-6 w-6" />
                </button>
                <div className="text-center">
                    <p className="text-3xl font-bold">{data?.monthName || '-'}</p>
                    <p className="text-stone-400">{year}</p>
                </div>
                <button
                    onClick={nextMonth}
                    disabled={isCurrentMonth}
                    className="p-2 bg-stone-800 hover:bg-stone-700 rounded-full disabled:opacity-50"
                >
                    <ChevronRight className="h-6 w-6" />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-stone-500" />
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-900/30 border border-emerald-500/30 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-5 w-5 text-emerald-400" />
                                <span className="text-sm text-stone-400">Total Sales</span>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(data?.summary?.totalSales || 0)}</p>
                            {data?.comparison && (
                                <div className={`flex items-center gap-1 mt-2 text-sm ${data.comparison.salesChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                    {data.comparison.salesChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                    {data.comparison.salesChange >= 0 ? '+' : ''}{data.comparison.salesChange.toFixed(1)}% vs prev month
                                </div>
                            )}
                        </div>

                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="h-5 w-5 text-blue-400" />
                                <span className="text-sm text-stone-400">Transactions</span>
                            </div>
                            <p className="text-3xl font-bold">{data?.summary?.totalTransactions?.toLocaleString() || 0}</p>
                            <p className="text-sm text-stone-500 mt-2">
                                Avg: {formatCurrency(data?.summary?.averageTicket || 0)}
                            </p>
                        </div>

                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-green-500 text-xl">💵</span>
                                <span className="text-sm text-stone-400">Cash</span>
                            </div>
                            <p className="text-3xl font-bold text-green-400">{formatCurrency(data?.summary?.cashSales || 0)}</p>
                        </div>

                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-blue-500 text-xl">💳</span>
                                <span className="text-sm text-stone-400">Card</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-400">{formatCurrency(data?.summary?.cardSales || 0)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* By Location */}
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Store className="h-5 w-5 text-orange-400" />
                                Sales by Location
                            </h3>

                            <div className="space-y-3">
                                {(data?.byLocation || []).map((loc: LocationData, i: number) => (
                                    <div key={loc.id} className="p-4 bg-stone-800 rounded-xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium">{loc.name}</span>
                                            <span className="text-emerald-400 font-bold">{formatCurrency(loc.sales)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-stone-500">
                                            <span>{loc.transactions.toLocaleString()} orders</span>
                                            <span>{loc.percentOfTotal}% of total</span>
                                        </div>
                                        <div className="mt-2 h-2 bg-stone-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${i === 0 ? 'bg-emerald-500' : i === 1 ? 'bg-blue-500' : 'bg-purple-500'
                                                    }`}
                                                style={{ width: `${loc.percentOfTotal}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Payment Breakdown */}
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-emerald-400" />
                                Payment Methods
                            </h3>

                            <div className="space-y-3">
                                {(data?.paymentBreakdown || []).map((pm: any) => (
                                    <div key={pm.method} className="p-4 bg-stone-800 rounded-xl">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium">{pm.method}</span>
                                            <span className="text-emerald-400 font-bold">{formatCurrency(pm.amount)}</span>
                                        </div>
                                        <div className="text-sm text-stone-500">{pm.percent}%</div>
                                        <div className="mt-2 h-2 bg-stone-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${pm.method === 'CASH' ? 'bg-green-500' :
                                                        pm.method === 'CARD' ? 'bg-blue-500' : 'bg-purple-500'
                                                    }`}
                                                style={{ width: `${pm.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Daily Trend */}
                        <div className="lg:col-span-2 bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-400" />
                                Daily Sales Trend
                            </h3>

                            <div className="flex gap-1 h-40 items-end overflow-x-auto pb-4">
                                {(data?.dailyData || []).map((day: any) => {
                                    const maxSales = Math.max(...(data?.dailyData || []).map((d: any) => d.sales))
                                    const height = maxSales > 0 ? (day.sales / maxSales * 100) : 0

                                    return (
                                        <div key={day.date} className="flex-1 min-w-2 flex flex-col items-center group">
                                            <div className="relative flex-1 flex items-end w-full">
                                                <div
                                                    className="w-full bg-blue-500 rounded-t group-hover:bg-blue-400 transition-colors"
                                                    style={{ height: `${height}%`, minHeight: day.sales > 0 ? '4px' : '0' }}
                                                />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-stone-800 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 z-10">
                                                    {formatCurrency(day.sales)}
                                                </div>
                                            </div>
                                            <span className="text-xs text-stone-600 mt-1 rotate-45 origin-left">
                                                {new Date(day.date + 'T00:00:00').getDate()}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
