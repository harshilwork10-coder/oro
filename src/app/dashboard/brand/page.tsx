'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
    Building2,
    MapPin,
    Users,
    DollarSign,
    TrendingUp,
    AlertCircle,
    Copy,
    ArrowRight
} from "lucide-react"
import { useState, useEffect } from "react"

export default function BrandDashboardPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [approvalStatus, setApprovalStatus] = useState<string | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/brand/dashboard')
                if (res.ok) {
                    const data = await res.json()
                    setApprovalStatus(data.approvalStatus)
                    setStats(data)
                } else if (res.status === 403) {
                    setError('Access Denied: You must be a Brand Franchisor.')
                } else {
                    setError('Failed to load dashboard.')
                }
            } catch (error) {
                console.error('Error fetching brand stats:', error)
                setError('An error occurred.')
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-stone-100 mb-2">Access Error</h1>
                <p className="text-stone-400">{error}</p>
                <Link href="/dashboard" className="inline-block mt-6 text-orange-500 hover:text-orange-400">
                    Return to Dashboard
                </Link>
            </div>
        )
    }

    if (approvalStatus === 'PENDING') {
        redirect('/auth/pending-approval')
    }

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-stone-100">
                            {stats?.name || 'Brand Dashboard'}
                        </h1>
                        {stats?.brandCode && (
                            <span className="px-2 py-1 rounded-md bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-mono font-medium flex items-center gap-1 group cursor-pointer"
                                title="Brand Code"
                                onClick={() => navigator.clipboard.writeText(stats.brandCode)}
                            >
                                {stats.brandCode}
                                <Copy className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                            </span>
                        )}
                    </div>
                    <p className="text-stone-400">
                        Welcome back, {session?.user?.name?.split(' ')[0]}! You are managing {stats?.totalFranchisees || 0} franchise partners.
                    </p>
                </div>

                <div className="flex gap-3">
                    <Link href="/dashboard/brand/settings" className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-sm font-medium transition-colors border border-stone-700/50 flex items-center gap-2">
                        Global Settings
                    </Link>
                    <Link href="/dashboard/brand/sub-franchisees" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-orange-900/20">
                        Manage Franchisees
                    </Link>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Franchisees */}
                <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Franchisees</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">{stats?.totalFranchisees || 0}</p>
                            <p className="text-sm text-stone-500 mt-2 flex items-center">
                                Active partners
                            </p>
                        </div>
                        <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/20">
                            <Users className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>

                {/* Total Locations */}
                <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Total Locations</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">{stats?.totalLocations || 0}</p>
                            <p className="text-sm text-stone-500 mt-2 flex items-center">
                                Across system
                            </p>
                        </div>
                        <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/20">
                            <Building2 className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>

                {/* Total Employees */}
                <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">System Employees</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">{stats?.totalEmployees || 0}</p>
                            <p className="text-sm text-stone-500 mt-2">
                                Total workforce
                            </p>
                        </div>
                        <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/20">
                            <Users className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>

                {/* Revenue */}
                <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">System Revenue</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">
                                ${stats?.monthlyRevenue ? `${(stats.monthlyRevenue / 1000).toFixed(1)}K` : '0'}
                            </p>
                            <p className="text-sm text-stone-500 mt-2 flex items-center">
                                Last 30 days
                            </p>
                        </div>
                        <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-orange-900/20">
                            <DollarSign className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Info */}
            <div className="glass-panel p-8 rounded-2xl text-center border-dashed border-stone-800">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-800/50 mb-4">
                    <TrendingUp className="h-8 w-8 text-stone-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-200">Sub-Franchisee Onboarding</h3>
                <p className="text-stone-500 mt-2 max-w-md mx-auto">
                    You can now set up your brand settings. Sub-franchisee invitations and management will be enabled in the next phase.
                </p>
                <div className="mt-6">
                    <Link href="/dashboard/brand/settings" className="inline-flex items-center gap-2 text-orange-500 hover:text-orange-400 font-medium">
                        Go to Brand Settings <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
