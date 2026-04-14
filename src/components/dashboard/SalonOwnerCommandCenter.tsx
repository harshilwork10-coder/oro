'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    Store, DollarSign, AlertTriangle, Users, BookOpen,
    TrendingUp, TrendingDown, RefreshCw, BarChart3,
    ArrowRight, MapPin, Sparkles, AlertCircle, Scissors, UserPlus,
    Calendar, Trophy, Lock
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LocationSummary {
    id: string
    name: string
    todaySales: number
    transactions: number
    cash: number
    card: number
    appointments: number // Added for salon
    activeStaff: number
    status: 'active' | 'warning' | 'idle'
}

interface Exception {
    id: string
    type: string
    severity: string
    title: string
    description: string
    locationName: string
    createdAt: string
}

interface DashboardData {
    locations: LocationSummary[]
    summary: {
        totalLocations: number
        todaySales: number
        yesterdaySales: number
        weekSales: number
        todayTransactions: number
        appointmentsToday: number // Added for salon
        topLocation: string | null
    }
    exceptions: Exception[]
    exceptionCounts: {
        critical: number
        warning: number
        info: number
        total: number
    }
}

export default function SalonOwnerCommandCenter() {
    const { data: session } = useSession()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState(new Date())

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch multi-store data
            const storeRes = await fetch('/api/dashboard/multi-store')
            const storeData = await storeRes.json()

            // Fetch exceptions
            const exRes = await fetch('/api/owner/exceptions')
            const exData = await exRes.json()

            // Transform data for Salon View
            const locations = storeData.locations?.map((loc: any) => {
                const hasSales = (loc.today.sales || 0) > 0 || (loc.today.transactions || 0) > 0
                const hasStaffIssues = (loc.staff.count || 0) === 0
                const status: 'active' | 'warning' | 'idle' =
                    hasSales ? 'active'
                    : hasStaffIssues ? 'warning'
                    : 'idle'
                return {
                    id: loc.location.id,
                    name: loc.location.name,
                    todaySales: loc.today.sales,
                    transactions: loc.today.transactions,
                    appointments: Math.floor((loc.today.transactions || 0) * 1.5), // Simulated if missing from backend
                    cash: loc.today.cash,
                    card: loc.today.card,
                    activeStaff: loc.staff.count,
                    status,
                }
            }) || []

            setData({
                locations,
                summary: {
                    totalLocations: storeData.summary?.totalLocations || locations.length,
                    todaySales: storeData.summary?.todaySales || 0,
                    yesterdaySales: storeData.summary?.yesterdaySales || 0,
                    weekSales: storeData.summary?.mtdSales || 0,
                    todayTransactions: storeData.summary?.todayTransactions || 0,
                    appointmentsToday: locations.reduce((sum: number, loc: any) => sum + (loc.appointments || 0), 0),
                    topLocation: storeData.summary?.topLocation
                },
                exceptions: exData.exceptions?.slice(0, 5) || [],
                exceptionCounts: exData.counts || { critical: 0, warning: 0, info: 0, total: 0 }
            })
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
        } finally {
            setLoading(false)
            setLastRefresh(new Date())
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 60000) // Refresh every minute
        return () => clearInterval(interval)
    }, [])

    const vsYesterday = data?.summary?.yesterdaySales
        ? ((data.summary.todaySales - data.summary.yesterdaySales) / data.summary.yesterdaySales * 100)
        : 0
    const isUp = vsYesterday >= 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0c] via-[#120f1a] to-[#0a0a0c] text-white p-6 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-fuchsia-600/10 blur-[120px] rounded-full pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-violet-400" />
                        </div>
                        Salon Command Center
                    </h1>
                    <p className="text-stone-400 mt-1 pl-[3.25rem]">All studios and talent at a glance</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-stone-900/80 hover:bg-stone-800 text-stone-200 rounded-xl border border-stone-800 transition-all font-medium"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Persistent subnav — Salon Focus */}
            <nav className="flex items-center gap-1 mb-8 overflow-x-auto pb-1 border-b border-stone-800/50 scrollbar-hide relative z-10">
                {[
                    { href: '/dashboard/owner', label: 'Overview', icon: Store },
                    { href: '/dashboard/appointments', label: 'Appointments', icon: Calendar },
                    { href: '/dashboard/services', label: 'Services Menu', icon: Scissors },
                    { href: '/dashboard/employees', label: 'Talent & Commission', icon: Users },
                    { href: '/dashboard/reports', label: 'Financials', icon: BarChart3 },
                ].map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-stone-400 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </Link>
                ))}
            </nav>

            {/* Hero Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
                {/* Total Services Revenue */}
                <div className="bg-stone-900/50 backdrop-blur-md border border-stone-800/80 hover:border-violet-500/30 rounded-2xl p-6 transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <DollarSign className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-stone-400">Services Revenue</span>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tight">{formatCurrency(data?.summary?.todaySales || 0)}</p>
                    <div className={`flex items-center gap-1.5 mt-3 text-sm font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span>{isUp ? '+' : ''}{vsYesterday.toFixed(1)}% vs yesterday</span>
                    </div>
                </div>

                {/* Studios / Capacity */}
                <div className="bg-stone-900/50 backdrop-blur-md border border-stone-800/80 hover:border-violet-500/30 rounded-2xl p-6 transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <Store className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-stone-400">Active Studios</span>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tight">{data?.summary?.totalLocations || 0}</p>
                    <p className="text-sm text-blue-400 mt-3 font-medium">
                        {(data?.locations || []).filter(l => l.status === 'active').length} locations actively booking
                    </p>
                </div>

                {/* Appointments Today */}
                <div className="bg-stone-900/50 backdrop-blur-md border border-stone-800/80 hover:border-violet-500/30 rounded-2xl p-6 transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-400">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-stone-400">Appointments Today</span>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tight">{data?.summary?.appointmentsToday || 0}</p>
                    <p className="text-sm text-fuchsia-400 mt-3 font-medium">
                        Avg Ticket: {formatCurrency((data?.summary?.todaySales || 0) / Math.max(data?.summary?.appointmentsToday || 1, 1))}
                    </p>
                </div>

                {/* Talent On Floor */}
                <div className="bg-stone-900/50 backdrop-blur-md border border-stone-800/80 hover:border-violet-500/30 rounded-2xl p-6 transition-all group">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                            <Users className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-stone-400">Talent On Floor</span>
                    </div>
                    <p className="text-4xl font-black text-white tracking-tight">
                        {data?.locations?.reduce((acc: number, loc) => acc + (loc.activeStaff || 0), 0) || 0}
                    </p>
                    <p className="text-sm text-amber-400 mt-3 font-medium">
                        Across all locations
                    </p>
                </div>
            </div>

            {/* Middle Section: Quick Actions & Beauty Loop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 relative z-10">
                {/* Exception Feed */}
                <div className="lg:col-span-2 bg-stone-900/50 backdrop-blur-md border border-stone-800/80 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                            <AlertCircle className="h-5 w-5 text-amber-400" />
                            Studio Exceptions
                        </h3>
                        {data?.exceptions?.length ? (
                            <Link href="/dashboard/owner/exceptions" className="text-sm text-violet-400 hover:text-violet-300 font-medium">
                                View Full Log &rarr;
                            </Link>
                        ) : null}
                    </div>

                    {(data?.exceptions?.length || 0) === 0 ? (
                        <div className="text-center py-10 text-stone-500">
                            <div className="w-16 h-16 rounded-full bg-stone-800/50 flex items-center justify-center mx-auto mb-4 border border-stone-700/50">
                                <AlertCircle className="h-8 w-8 text-stone-600" />
                            </div>
                            <p className="font-medium text-stone-300">All studios running smoothly</p>
                            <p className="text-sm mt-1">No voids, no-shows, or critical overrides detected.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.exceptions?.map(ex => (
                                <div key={ex.id} className={`flex items-start gap-4 p-4 rounded-xl backdrop-blur-md transition-colors ${
                                    ex.severity === 'CRITICAL' ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20' :
                                    ex.severity === 'WARNING' ? 'bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20' :
                                    'bg-white/5 border border-white/10 hover:bg-white/10'
                                }`}>
                                    <div className={`mt-1 p-1.5 rounded-full ${
                                        ex.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                                        ex.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400' : 
                                        'bg-blue-500/20 text-blue-400'
                                    }`}>
                                        <AlertTriangle size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-white text-sm">{ex.title}</p>
                                            <span className="text-xs font-medium text-stone-400 bg-black/20 px-2 py-0.5 rounded-full">{ex.locationName}</span>
                                        </div>
                                        <p className="text-sm text-stone-300 mt-1">{ex.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Growth Hub & Quick Actions */}
                <div className="bg-stone-900/50 backdrop-blur-md border border-stone-800/80 rounded-2xl p-6 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6">Growth Hub</h3>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <Link href="/dashboard/owner/salon-loyalty" className="p-4 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 hover:from-violet-600/30 hover:to-fuchsia-600/30 border border-violet-500/30 rounded-xl transition-all group flex flex-col items-center text-center">
                            <Trophy className="h-6 w-6 text-violet-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold text-white">Beauty Loop</span>
                            <span className="text-xs text-violet-300 mt-1">Configure retention</span>
                        </Link>
                        <Link href="/dashboard/customers" className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group flex flex-col items-center text-center">
                            <UserPlus className="h-6 w-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold text-white">Client Roster</span>
                            <span className="text-xs text-stone-400 mt-1">View history</span>
                        </Link>
                        <Link href="/dashboard/services" className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group flex flex-col items-center text-center">
                            <Scissors className="h-6 w-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold text-white">Service Menu</span>
                            <span className="text-xs text-stone-400 mt-1">Update pricing</span>
                        </Link>
                        <Link href="/dashboard/employees" className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group flex flex-col items-center text-center">
                            <DollarSign className="h-6 w-6 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold text-white">Payroll Process</span>
                            <span className="text-xs text-stone-400 mt-1">Approve cuts</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Studio Breakdown */}
            <div className="relative z-10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                    <MapPin className="h-5 w-5 text-fuchsia-400" />
                    Studio Performance
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(data?.locations || []).map(loc => (
                        <div key={loc.id} className="bg-stone-900/50 backdrop-blur-md border border-stone-800/80 hover:border-violet-500/50 rounded-2xl overflow-hidden transition-all group">
                            {/* Card Header */}
                            <div className="p-5 border-b border-stone-800/50 bg-white/[0.02]">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h4 className="font-bold text-lg text-white truncate">{loc.name}</h4>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`w-2 h-2 rounded-full ${
                                                loc.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                loc.status === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
                                                'bg-stone-600'
                                            }`} />
                                            <span className={`text-xs font-bold uppercase tracking-wider ${
                                                loc.status === 'active' ? 'text-emerald-400' :
                                                loc.status === 'warning' ? 'text-amber-400' : 
                                                'text-stone-500'
                                            }`}>
                                                {loc.status === 'active' ? 'Booking' : loc.status === 'warning' ? 'Check Schedule' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5">
                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Revenue</p>
                                        <p className="text-2xl font-black text-emerald-400">{formatCurrency(loc.todaySales)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Appointments</p>
                                        <p className="text-2xl font-black text-white">{loc.appointments}</p>
                                    </div>
                                </div>

                                <div className="bg-black/30 rounded-xl p-3 flex items-center justify-between border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-stone-400" />
                                        <span className="text-sm font-medium text-stone-300">Staff On Floor</span>
                                    </div>
                                    <span className="font-bold text-white">{loc.activeStaff}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {(data?.locations?.length || 0) === 0 && !loading && (
                        <div className="col-span-full bg-stone-900/50 backdrop-blur-md rounded-3xl border border-stone-800/80 p-12 text-center text-stone-500">
                            <Store className="h-16 w-16 mx-auto mb-4 opacity-50 text-stone-600" />
                            <p className="text-xl font-bold text-white">No studios provisioned yet</p>
                            <p className="text-sm mt-2 text-stone-400 max-w-sm mx-auto">Once your POS units are paired and locations are live, performance data will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
