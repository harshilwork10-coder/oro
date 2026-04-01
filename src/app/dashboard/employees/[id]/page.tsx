'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, Loader2, DollarSign, TrendingUp, Calendar,
    Scissors, Users, Clock, Settings, Star, CreditCard,
    Globe, Smartphone, PhoneCall, Footprints, BarChart3
} from 'lucide-react'

interface EmployeeStats {
    name: string
    email: string
    phone: string
    role: string
    isActive: boolean
    compensation: {
        type: string
        commissionRate: number
        hourlyRate: number
    } | null
    stats: {
        totalRevenue: number
        totalTips: number
        totalTransactions: number
        avgTicket: number
        totalServices: number
        totalProducts: number
        estCommissions: number
    }
    recentTransactions: {
        id: string
        date: string
        total: number
        tip: number
        items: number
        source?: string
    }[]
    topServices: {
        name: string
        count: number
        revenue: number
    }[]
}

function SourceBadge({ source }: { source?: string }) {
    if (!source) return null
    const config: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
        'ONLINE': { icon: <Globe className="h-3 w-3" />, label: 'Online', cls: 'bg-blue-500/15 text-blue-300' },
        'POS': { icon: <Smartphone className="h-3 w-3" />, label: 'POS', cls: 'bg-emerald-500/15 text-emerald-300' },
        'PHONE': { icon: <PhoneCall className="h-3 w-3" />, label: 'Phone', cls: 'bg-purple-500/15 text-purple-300' },
        'WALK_IN': { icon: <Footprints className="h-3 w-3" />, label: 'Walk-in', cls: 'bg-amber-500/15 text-amber-300' },
    }
    const s = config[source]
    if (!s) return null
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded ${s.cls}`}>
            {s.icon} {s.label}
        </span>
    )
}

export default function EmployeeDetailPage() {
    const params = useParams()
    const employeeId = params.id as string
    const [data, setData] = useState<EmployeeStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month')

    useEffect(() => {
        fetchData()
    }, [employeeId, period])

    async function fetchData() {
        setLoading(true)
        try {
            const res = await fetch(`/api/employees/${employeeId}/summary?period=${period}`)
            if (res.ok) {
                setData(await res.json())
            }
        } catch (e) {
            console.error('Failed to fetch employee data:', e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="p-8 text-center text-stone-500">
                Employee not found
            </div>
        )
    }

    const { stats, compensation, recentTransactions, topServices } = data
    const compLabel = compensation?.type === 'BOOTH_RENTAL' ? 'Booth Renter' :
        compensation?.type === 'HOURLY_PLUS_COMMISSION' ? 'Hourly + Commission' :
            compensation?.type === 'SALARY_PLUS_COMMISSION' ? 'Salary + Commission' : 'Commission Only'

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/employees"
                        className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            {data.name?.[0] || '?'}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{data.name}</h1>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-stone-400 text-sm">{data.email}</span>
                                {data.phone && <span className="text-stone-500 text-sm">· {data.phone}</span>}
                                <span className={`px-2 py-0.5 text-xs rounded font-medium ${data.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                                    {data.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/dashboard/employees/${employeeId}/commission`}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <Settings className="h-4 w-4" />
                        Commission Config
                    </Link>
                </div>
            </div>

            {/* Period Tabs */}
            <div className="flex gap-2">
                {(['today', 'week', 'month'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/25'
                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            }`}
                    >
                        {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
                    </button>
                ))}
            </div>

            {/* Compensation Banner */}
            {compensation && (
                <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-orange-400" />
                        <div>
                            <span className="text-orange-200 font-medium">{compLabel}</span>
                            {compensation.commissionRate > 0 && (
                                <span className="text-stone-400 text-sm ml-2">· {compensation.commissionRate}% default rate</span>
                            )}
                            {compensation.hourlyRate > 0 && (
                                <span className="text-stone-400 text-sm ml-2">· ${compensation.hourlyRate}/hr</span>
                            )}
                        </div>
                    </div>
                    <span className="text-2xl font-bold text-orange-400">${stats.estCommissions.toFixed(2)}</span>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-stone-400">Revenue</span>
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-stone-500 mt-1">{stats.totalTransactions} transactions</p>
                </div>
                <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-stone-400">Tips</span>
                        <Star className="h-4 w-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">${stats.totalTips.toFixed(2)}</p>
                </div>
                <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-stone-400">Avg Ticket</span>
                        <TrendingUp className="h-4 w-4 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">${stats.avgTicket.toFixed(2)}</p>
                </div>
                <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-stone-400">Services Done</span>
                        <Scissors className="h-4 w-4 text-violet-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.totalServices}</p>
                    <p className="text-xs text-stone-500 mt-1">{stats.totalProducts} retail items</p>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Transactions - 2 cols */}
                <div className="lg:col-span-2 bg-stone-900/60 border border-stone-800 rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-stone-800">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <Clock className="h-5 w-5 text-stone-400" />
                            Recent Transactions
                        </h2>
                    </div>
                    {recentTransactions.length === 0 ? (
                        <div className="text-center py-8 text-stone-500">No transactions in this period</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-stone-800/30">
                                <tr className="text-stone-400">
                                    <th className="text-left px-5 py-3">Date</th>
                                    <th className="text-center px-5 py-3">Items</th>
                                    <th className="text-center px-5 py-3">Source</th>
                                    <th className="text-right px-5 py-3">Tip</th>
                                    <th className="text-right px-5 py-3">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800">
                                {recentTransactions.slice(0, 15).map(tx => (
                                    <tr key={tx.id} className="hover:bg-stone-800/30">
                                        <td className="px-5 py-3 text-stone-300">
                                            {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-3 text-center text-stone-400">{tx.items}</td>
                                        <td className="px-5 py-3 text-center"><SourceBadge source={tx.source} /></td>
                                        <td className="px-5 py-3 text-right text-amber-400">${tx.tip.toFixed(2)}</td>
                                        <td className="px-5 py-3 text-right text-white font-medium">${tx.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Top Services */}
                <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                    <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
                        <BarChart3 className="h-5 w-5 text-violet-400" />
                        Top Services
                    </h2>
                    {topServices.length === 0 ? (
                        <p className="text-stone-500 text-sm text-center py-4">No services yet</p>
                    ) : (
                        <div className="space-y-3">
                            {topServices.slice(0, 8).map((svc, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-sm font-medium">{svc.name}</p>
                                        <p className="text-stone-500 text-xs">{svc.count} performed</p>
                                    </div>
                                    <span className="text-emerald-400 font-medium text-sm">${svc.revenue.toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
