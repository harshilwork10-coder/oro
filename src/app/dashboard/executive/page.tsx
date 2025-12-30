'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    TrendingUp,
    TrendingDown,
    Award,
    AlertTriangle,
    Building2,
    MapPin,
    Users,
    DollarSign,
    Activity,
    CheckCircle,
    ArrowRight
} from 'lucide-react'

export default function ExecutiveSummaryPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    // Mock data - replace with real API calls
    const healthScore = 87
    const trends = {
        revenue: { value: '+23%', positive: true },
        locations: { value: '+5', positive: true },
        employees: { value: '+12', positive: true },
        satisfaction: { value: '-2%', positive: false }
    }

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Executive Summary</h1>
                    <p className="text-stone-400 mt-1">System-wide health and performance overview</p>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:shadow-lg hover:shadow-orange-900/20 transition-all flex items-center gap-2 font-medium">
                    Export PDF
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>

            {/* System Health Score */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-blue-500">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <Activity className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-stone-100">System Health Score</h2>
                                <p className="text-stone-400 text-sm">Overall system performance and health indicator</p>
                            </div>
                        </div>

                        {/* Health Score Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-stone-400 mb-2">Operations</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: '92%' }}></div>
                                    </div>
                                    <span className="text-sm font-semibold text-stone-100">92</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-stone-400 mb-2">Financial</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: '88%' }}></div>
                                    </div>
                                    <span className="text-sm font-semibold text-stone-100">88</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-stone-400 mb-2">Compliance</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500" style={{ width: '78%' }}></div>
                                    </div>
                                    <span className="text-sm font-semibold text-stone-100">78</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-stone-400 mb-2">Customer Sat.</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: '91%' }}></div>
                                    </div>
                                    <span className="text-sm font-semibold text-stone-100">91</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Large Health Score Circle */}
                    <div className="flex items-center justify-center">
                        <div className="relative h-40 w-40">
                            <svg className="transform -rotate-90 h-40 w-40">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="none"
                                    className="text-stone-800"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="12"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 70}`}
                                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - healthScore / 100)}`}
                                    className="text-emerald-500 transition-all duration-1000"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-stone-100">{healthScore}</span>
                                <span className="text-sm text-emerald-400">Excellent</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Wins & Concerns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 3 Wins */}
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-emerald-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <Award className="h-6 w-6 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-bold text-stone-100">Top 3 Wins 🎉</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-stone-100">Record Monthly Revenue</h3>
                                <span className="text-emerald-400 font-semibold">+23%</span>
                            </div>
                            <p className="text-sm text-stone-400">Achieved $124K in revenue, surpassing previous record by $23K</p>
                        </div>

                        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-stone-100">5 New Locations Opened</h3>
                                <span className="text-emerald-400 font-semibold">+11%</span>
                            </div>
                            <p className="text-sm text-stone-400">Expanded network to 47 locations across 3 new markets</p>
                        </div>

                        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-stone-100">Zero Compliance Issues</h3>
                                <CheckCircle className="h-5 w-5 text-emerald-400" />
                            </div>
                            <p className="text-sm text-stone-400">All locations passed quarterly compliance review</p>
                        </div>
                    </div>
                </div>

                {/* Top 3 Concerns */}
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-amber-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="h-6 w-6 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-bold text-stone-100">Top 3 Concerns ⚠️</h2>
                    </div>

                    <div className="space-y-4">
                        <Link href="/dashboard/locations" className="block p-4 bg-red-500/10 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all group">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-stone-100">3 Underperforming Locations</h3>
                                <span className="text-red-400 font-semibold">-15%</span>
                            </div>
                            <p className="text-sm text-stone-400">Locations in Zone B showing declining revenue trend</p>
                            <p className="text-xs text-amber-400 mt-2 font-medium group-hover:text-amber-300">Click to investigate →</p>
                        </Link>

                        <Link href="/dashboard/employees" className="block p-4 bg-red-500/10 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all group">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-stone-100">High Employee Turnover</h3>
                                <span className="text-red-400 font-semibold">18%</span>
                            </div>
                            <p className="text-sm text-stone-400">Turnover rate above industry average in 4 locations</p>
                            <p className="text-xs text-amber-400 mt-2 font-medium group-hover:text-amber-300">Click to review →</p>
                        </Link>

                        <Link href="/dashboard/financials" className="block p-4 bg-red-500/10 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all group">
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-stone-100">2 Overdue Invoices</h3>
                                <span className="text-red-400 font-semibold">$8.5K</span>
                            </div>
                            <p className="text-sm text-stone-400">Payment delays from 2 franchises, 30+ days overdue</p>
                            <p className="text-xs text-amber-400 mt-2 font-medium group-hover:text-amber-300">Click to resolve →</p>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-6">Key Performance Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <Building2 className="h-8 w-8 text-blue-400" />
                            <div className={`flex items-center gap-1 text-sm font-semibold ${trends.revenue.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {trends.revenue.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {trends.revenue.value}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-stone-100 relative z-10">$124K</p>
                        <p className="text-sm text-stone-400 mt-1 relative z-10">Monthly Revenue</p>
                    </div>

                    <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <MapPin className="h-8 w-8 text-emerald-400" />
                            <div className={`flex items-center gap-1 text-sm font-semibold ${trends.locations.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {trends.locations.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {trends.locations.value}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-stone-100 relative z-10">47</p>
                        <p className="text-sm text-stone-400 mt-1 relative z-10">Active Locations</p>
                    </div>

                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 hover:border-purple-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <Users className="h-8 w-8 text-purple-400" />
                            <div className={`flex items-center gap-1 text-sm font-semibold ${trends.employees.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {trends.employees.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {trends.employees.value}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-stone-100 relative z-10">234</p>
                        <p className="text-sm text-stone-400 mt-1 relative z-10">Total Employees</p>
                    </div>

                    <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 hover:border-amber-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <DollarSign className="h-8 w-8 text-amber-400" />
                            <div className={`flex items-center gap-1 text-sm font-semibold ${trends.satisfaction.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {trends.satisfaction.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                {trends.satisfaction.value}
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-stone-100 relative z-10">4.6/5</p>
                        <p className="text-sm text-stone-400 mt-1 relative z-10">Avg Customer Rating</p>
                    </div>
                </div>
            </div>

            {/* Performance Distribution */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-6">Location Performance Distribution</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-center hover:border-emerald-500/40 transition-all">
                        <p className="text-4xl font-bold text-emerald-400 mb-2">28</p>
                        <p className="text-sm font-medium text-stone-200">High Performers</p>
                        <p className="text-xs text-stone-400 mt-1">60% of network</p>
                    </div>
                    <div className="p-6 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center hover:border-amber-500/40 transition-all">
                        <p className="text-4xl font-bold text-amber-400 mb-2">16</p>
                        <p className="text-sm font-medium text-stone-200">Average Performers</p>
                        <p className="text-xs text-stone-400 mt-1">34% of network</p>
                    </div>
                    <div className="p-6 bg-red-500/10 rounded-xl border border-red-500/20 text-center hover:border-red-500/40 transition-all">
                        <p className="text-4xl font-bold text-red-400 mb-2">3</p>
                        <p className="text-sm font-medium text-stone-200">Needs Attention</p>
                        <p className="text-xs text-stone-400 mt-1">6% of network</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

