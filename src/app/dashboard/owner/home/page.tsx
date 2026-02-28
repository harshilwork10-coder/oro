'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    DollarSign, TrendingUp, ShoppingBag, Users, BarChart3,
    Calendar, RefreshCw, CreditCard, Banknote, ArrowRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import useApiCache from '@/hooks/useApiCache'
import DashboardChart from '@/components/charts/DashboardChart'

export default function OwnerDashboardHome() {
    const { data, loading, refresh } = useApiCache('/api/reports/eod-summary', {
        ttl: 120000, // 2 min cache — reduces API calls by ~30x
    })

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-stone-400">{today}</p>
                </div>
                <button onClick={refresh} className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {loading && !data ? (
                <div className="text-center py-20"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>
            ) : data ? (
                <>
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { icon: DollarSign, label: 'Revenue', value: formatCurrency(data.revenue?.total || 0), sub: `${data.revenue?.transactions || 0} transactions`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                            { icon: ShoppingBag, label: 'Avg Ticket', value: formatCurrency(data.revenue?.avgTicket || 0), sub: `Net: ${formatCurrency(data.revenue?.net || 0)}`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                            { icon: TrendingUp, label: 'Refunds', value: `${data.refunds?.count || 0}`, sub: formatCurrency(data.refunds?.total || 0), color: data.refunds?.count > 0 ? 'text-amber-400' : 'text-emerald-400', bg: 'bg-amber-500/10' },
                            { icon: Users, label: 'Staff', value: `${data.labor?.employees || 0}`, sub: `${data.labor?.totalHours || 0}h worked`, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                        ].map(kpi => (
                            <div key={kpi.label} className={`${kpi.bg} border border-stone-700 rounded-2xl p-5`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                                    <span className="text-sm text-stone-400">{kpi.label}</span>
                                </div>
                                <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                                <p className="text-xs text-stone-500 mt-1">{kpi.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid lg:grid-cols-2 gap-4 mb-6">
                        {/* Hourly Revenue Chart */}
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-400" /> Hourly Revenue
                            </h3>
                            {data.hourlyRevenue && (
                                <DashboardChart
                                    type="bar"
                                    width={500}
                                    height={180}
                                    data={(data.hourlyRevenue as number[])
                                        .map((v: number, i: number) => ({
                                            label: i > 12 ? `${i - 12}p` : i === 12 ? '12p' : i === 0 ? '12a' : `${i}a`,
                                            value: v,
                                        }))
                                        .filter(d => d.value > 0)
                                    }
                                    colors={['#3b82f6']}
                                />
                            )}
                        </div>

                        {/* Payment Breakdown Donut */}
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-purple-400" /> Payment Mix
                            </h3>
                            {data.paymentBreakdown && (
                                <DashboardChart
                                    type="donut"
                                    width={400}
                                    height={180}
                                    data={Object.entries(data.paymentBreakdown).map(([method, amount]) => ({
                                        label: method,
                                        value: amount as number,
                                    }))}
                                />
                            )}
                        </div>
                    </div>

                    {/* Top Items + Quick Links */}
                    <div className="grid lg:grid-cols-2 gap-4">
                        {/* Top Sellers */}
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold mb-4">🔥 Top 10 Items</h3>
                            {(data.topItems || []).map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-stone-800 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-stone-500 w-4">{i + 1}</span>
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono text-emerald-400">{formatCurrency(item.revenue)}</span>
                                        <span className="text-xs text-stone-500 ml-2">×{item.quantity}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Links */}
                        <div className="space-y-3">
                            {[
                                { href: '/dashboard/owner/reports-hub', label: 'Reports Hub', desc: 'All analytics', icon: BarChart3, color: 'text-blue-400' },
                                { href: '/dashboard/reports/realtime-sales', label: 'Live Sales', desc: 'Real-time ticker', icon: TrendingUp, color: 'text-emerald-400' },
                                { href: '/dashboard/reports/loss-prevention', label: 'Loss Prevention', desc: 'Security dashboard', icon: Users, color: 'text-red-400' },
                                { href: '/dashboard/reports/flash-report', label: 'Flash Report', desc: 'Quick summary', icon: DollarSign, color: 'text-amber-400' },
                                { href: '/dashboard/owner/safe-management', label: 'Safe Management', desc: 'Cash drops & counts', icon: Banknote, color: 'text-purple-400' },
                                { href: '/dashboard/settings/payment-processors', label: 'Payment Processors', desc: 'PAX + webhooks', icon: CreditCard, color: 'text-cyan-400' },
                            ].map(link => (
                                <Link key={link.href} href={link.href} className="flex items-center justify-between bg-stone-900/80 border border-stone-700 rounded-xl p-4 hover:bg-stone-800/80 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <link.icon className={`h-5 w-5 ${link.color}`} />
                                        <div><p className="font-medium">{link.label}</p><p className="text-xs text-stone-500">{link.desc}</p></div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-stone-500" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </>
            ) : <p className="text-center py-20 text-stone-500">No data</p>}
        </div>
    )
}
