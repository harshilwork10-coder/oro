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
    Phone,
    CreditCard,
    Clock,
    Gift,
    Ticket
} from "lucide-react"
import RequestExpansionModal from "@/components/modals/RequestExpansionModal"
import ConsultationRequestModal from "@/components/modals/ConsultationRequestModal"
import MerchantApplicationModal from "@/components/modals/MerchantApplicationModal"
import CheckInQueue from "@/components/dashboard/employee/CheckInQueue"
import TodayAppointments from "@/components/dashboard/employee/TodayAppointments"
import UpcomingAppointments from "@/components/dashboard/employee/UpcomingAppointments"
import EmployeePerformanceStats from "@/components/dashboard/employee/EmployeePerformanceStats"
import NextClientSpotlight from "@/components/dashboard/employee/NextClientSpotlight"
import { useState, useEffect } from "react"

type DashboardStats = {
    totalFranchisors: number
    totalFranchises: number
    totalLocations: number
    totalEmployees: number
    monthlyRevenue: number
    recentActivity: Array<{
        id: string
        type: string
        title: string
        description: string
        timestamp: string
        meta: any
    }>
}

export default function DashboardPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    // NOTE: Employees CAN access dashboard now - their sidebar is permission-filtered
    // Previously redirected employees to POS, but now we show permission-based content

    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (session?.user?.role === 'PROVIDER') {
            fetchDashboardStats()
        }
    }, [session])

    async function fetchDashboardStats() {
        try {
            const res = await fetch('/api/admin/dashboard/stats')
            if (res.ok) {
                const data = await res.json()
                setStats(data)
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    const role = session?.user?.role

    // Provider Dashboard
    if (role === 'PROVIDER') {
        return (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">
                        Welcome back, System Provider! 👋
                    </h1>
                    <p className="text-stone-400 mt-2">Here's what's happening with your business today.</p>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Franchises */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Total Franchisors</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">
                                    {loading ? '...' : stats?.totalFranchisors || 0}
                                </p>
                                <p className="text-sm text-stone-500 mt-2">
                                    Clients in system
                                </p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-orange-900/20">
                                <Building2 className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Total Locations */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Total Locations</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">
                                    {loading ? '...' : stats?.totalLocations || 0}
                                </p>
                                <p className="text-sm text-stone-500 mt-2">
                                    Across all franchises
                                </p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-stone-700 to-stone-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-stone-900/20">
                                <MapPin className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Total Employees */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Total Employees</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">
                                    {loading ? '...' : stats?.totalEmployees || 0}
                                </p>
                                <p className="text-sm text-stone-500 mt-2">
                                    Active staff
                                </p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-stone-700 to-stone-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-stone-900/20">
                                <Users className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Monthly Revenue */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Monthly Revenue</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">
                                    ${loading ? '...' : (stats?.monthlyRevenue ? `${(stats.monthlyRevenue / 1000).toFixed(0)}K` : '0')}
                                </p>
                                <p className="text-sm text-stone-500 mt-2">
                                    Last 30 days
                                </p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/20">
                                <DollarSign className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity & Action Items */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-bold text-stone-100 mb-6">Recent Activity</h2>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            </div>
                        ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
                            <div className="space-y-4">
                                {stats.recentActivity.slice(0, 3).map((activity) => (
                                    <div key={activity.id} className="p-4 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-orange-500/30 transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Building2 className="h-6 w-6 text-orange-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base font-semibold text-stone-200 mb-1">{activity.title}</p>
                                                <p className="text-sm text-stone-400">{activity.description}</p>
                                                <p className="text-xs text-stone-500 mt-2">
                                                    {new Date(activity.timestamp).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-16 w-16 bg-stone-800/50 rounded-full flex items-center justify-center mb-4">
                                    <Building2 className="h-8 w-8 text-stone-600" />
                                </div>
                                <p className="text-stone-400 font-medium">No recent activity</p>
                                <p className="text-stone-600 text-sm mt-1">Activity will appear here when you add clients</p>
                            </div>
                        )}
                    </div>

                    {/* Action Items */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-bold text-stone-100 mb-6">Action Items</h2>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-16 w-16 bg-stone-800/50 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="h-8 w-8 text-stone-600" />
                            </div>
                            <p className="text-stone-400 font-medium">No action items</p>
                            <p className="text-stone-600 text-sm mt-1">You're all caught up!</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Get businessType from session for FRANCHISOR users
    const businessType = (session?.user as any)?.businessType

    // Multi-Location Owner Dashboard (owns their own stores)
    if (role === 'FRANCHISOR' && businessType === 'MULTI_LOCATION_OWNER') {
        const [franchisorStats, setFranchisorStats] = useState<any>(null)
        const [loadingStats, setLoadingStats] = useState(true)
        const [approvalStatus, setApprovalStatus] = useState<string | null>(null)

        useEffect(() => {
            async function checkApprovalAndFetchStats() {
                try {
                    const res = await fetch('/api/franchisor/stats')
                    if (res.ok) {
                        const data = await res.json()
                        setApprovalStatus(data.approvalStatus)

                        // Redirect if pending
                        if (data.approvalStatus === 'PENDING') {
                            redirect('/auth/pending-approval')
                            return
                        }

                        setFranchisorStats(data)
                    }
                } catch (error) {
                    console.error('Error fetching franchisor stats:', error)
                } finally {
                    setLoadingStats(false)
                }
            }
            checkApprovalAndFetchStats()
        }, [])

        // Show loading state while checking approval
        if (loadingStats || approvalStatus === 'PENDING') {
            return (
                <div className="flex items-center justify-center min-h-screen bg-stone-950">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            )
        }

        return (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
                    </h1>
                    <p className="text-stone-400 mt-2">Here's what's happening with your business today.</p>
                </div>

                {/* Statistics Cards - Multi-Store Owner */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">My Stores</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">{franchisorStats?.totalLocations || 0}</p>
                                <p className="text-sm text-stone-500 mt-2">Active locations</p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-orange-900/20">
                                <MapPin className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Employees</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">{franchisorStats?.totalEmployees || 0}</p>
                                <p className="text-sm text-stone-500 mt-2">Team members</p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/20">
                                <Users className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Monthly Revenue</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">
                                    ${franchisorStats?.monthlyRevenue ? `${(franchisorStats.monthlyRevenue / 1000).toFixed(1)}K` : '0'}
                                </p>
                                <p className="text-sm text-stone-500 mt-2">Last 30 days</p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/20">
                                <DollarSign className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Transactions</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">{franchisorStats?.totalTransactions || 0}</p>
                                <p className="text-sm text-stone-500 mt-2">Last 30 days</p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/20">
                                <CreditCard className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-stone-100 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/dashboard/locations" className="p-4 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center">
                            <MapPin className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                            <p className="text-sm text-stone-300">My Stores</p>
                        </Link>
                        <Link href="/dashboard/employees" className="p-4 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center">
                            <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-stone-300">Employees</p>
                        </Link>
                        <Link href="/dashboard/transactions" className="p-4 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center">
                            <CreditCard className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm text-stone-300">Transactions</p>
                        </Link>
                        <Link href="/dashboard/reports" className="p-4 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center">
                            <TrendingUp className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                            <p className="text-sm text-stone-300">Reports</p>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }


    // Brand Franchisor Dashboard (sells franchises) OR fallback for FRANCHISOR without businessType
    if (role === 'FRANCHISOR') {
        const [franchisorStats, setFranchisorStats] = useState<any>(null)
        const [loadingStats, setLoadingStats] = useState(true)
        const [approvalStatus, setApprovalStatus] = useState<string | null>(null)

        useEffect(() => {
            async function checkApprovalAndFetchStats() {
                try {
                    const res = await fetch('/api/franchisor/stats')
                    if (res.ok) {
                        const data = await res.json()
                        setApprovalStatus(data.approvalStatus)

                        // Redirect if pending
                        if (data.approvalStatus === 'PENDING') {
                            redirect('/auth/pending-approval')
                            return
                        }

                        setFranchisorStats(data)
                    }
                } catch (error) {
                    console.error('Error fetching franchisor stats:', error)
                } finally {
                    setLoadingStats(false)
                }
            }
            checkApprovalAndFetchStats()
        }, [])

        // Show loading state while checking approval
        if (loadingStats || approvalStatus === 'PENDING') {
            return (
                <div className="flex items-center justify-center min-h-screen bg-stone-950">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            )
        }

        return (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
                    </h1>
                    <p className="text-stone-400 mt-2">Here's what's happening with your business today.</p>
                </div>

                {/* Statistics Cards - Franchise Brand */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Brand Name */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Your Brand</p>
                                <p className="text-2xl font-bold text-stone-100 mt-2">
                                    {franchisorStats?.name || 'Your Franchise'}
                                </p>
                                <p className="text-sm text-blue-400 mt-2 flex items-center">
                                    Since {franchisorStats?.createdAt ? new Date(franchisorStats.createdAt).getFullYear() : '2024'}
                                </p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/20">
                                <Building2 className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Franchisees */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Franchisees</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">{franchisorStats?.totalFranchisees || 0}</p>
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
                                <p className="text-sm font-medium text-stone-400">Locations</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">{franchisorStats?.totalLocations || 0}</p>
                                <p className="text-sm text-stone-500 mt-2 flex items-center">
                                    Across all franchisees
                                </p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/20">
                                <MapPin className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Revenue */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Monthly Revenue</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">
                                    ${franchisorStats?.monthlyRevenue ? `${(franchisorStats.monthlyRevenue / 1000).toFixed(1)}K` : '0'}
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

                {/* Recent Activity & Action Items */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-bold text-stone-100 mb-6">Recent Activity</h2>
                        {franchisorStats?.recentActivity && franchisorStats.recentActivity.length > 0 ? (
                            <div className="space-y-4">
                                {franchisorStats.recentActivity.slice(0, 3).map((activity: any) => (
                                    <div key={activity.id} className="p-4 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-orange-500/30 transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="h-12 w-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <MapPin className="h-6 w-6 text-emerald-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base font-semibold text-stone-200 mb-1">{activity.title}</p>
                                                <p className="text-sm text-stone-400">{activity.description}</p>
                                                <p className="text-xs text-stone-500 mt-2">
                                                    {new Date(activity.timestamp).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="h-16 w-16 bg-stone-800/50 rounded-full flex items-center justify-center mb-4">
                                    <Building2 className="h-8 w-8 text-stone-600" />
                                </div>
                                <p className="text-stone-400 font-medium">No recent activity</p>
                                <p className="text-stone-600 text-sm mt-1">Activity will appear here as you grow</p>
                            </div>
                        )}
                    </div>

                    {/* Action Items */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-bold text-stone-100 mb-6">Action Items</h2>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-16 w-16 bg-stone-800/50 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="h-8 w-8 text-stone-600" />
                            </div>
                            <p className="text-stone-400 font-medium">No action items</p>
                            <p className="text-stone-600 text-sm mt-1">You're all caught up!</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // FRANCHISEE Dashboard - for users who bought a franchise from a brand
    if (role === 'FRANCHISEE') {
        const [franchiseeData, setFranchiseeData] = useState<any>(null)
        const [loadingData, setLoadingData] = useState(true)

        useEffect(() => {
            async function fetchFranchiseeData() {
                try {
                    const res = await fetch('/api/franchisee/my-locations')
                    if (res.ok) {
                        const locations = await res.json()
                        const totalEmployees = locations.reduce((sum: number, loc: any) => sum + (loc._count?.users || 0), 0)
                        setFranchiseeData({ locations, totalEmployees })
                    }
                } catch (error) {
                    console.error('Error fetching franchisee data:', error)
                } finally {
                    setLoadingData(false)
                }
            }
            fetchFranchiseeData()
        }, [])

        if (loadingData) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-stone-950">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            )
        }

        return (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
                    </h1>
                    <p className="text-stone-400 mt-2">Here's your franchise operations overview.</p>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">My Locations</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">{franchiseeData?.locations?.length || 0}</p>
                                <p className="text-sm text-stone-500 mt-2">Active stores</p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-orange-900/20">
                                <MapPin className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Employees</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">{franchiseeData?.totalEmployees || 0}</p>
                                <p className="text-sm text-stone-500 mt-2">Across all locations</p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/20">
                                <Users className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Status</p>
                                <p className="text-2xl font-bold text-emerald-400 mt-2">Active</p>
                                <p className="text-sm text-stone-500 mt-2">Franchise in good standing</p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/20">
                                <TrendingUp className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="glass-panel p-6 rounded-2xl">
                    <h2 className="text-lg font-semibold text-stone-100 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/dashboard/my-locations" className="p-4 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center">
                            <MapPin className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                            <p className="text-sm text-stone-300">My Locations</p>
                        </Link>
                        <Link href="/dashboard/employees" className="p-4 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center">
                            <Users className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-stone-300">Employees</p>
                        </Link>
                        <Link href="/dashboard/expansion-requests" className="p-4 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center">
                            <Building2 className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                            <p className="text-sm text-stone-300">Request Expansion</p>
                        </Link>
                        <Link href="/dashboard/reports" className="p-4 bg-stone-800/50 rounded-xl hover:bg-stone-700/50 transition-all text-center">
                            <TrendingUp className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                            <p className="text-sm text-stone-300">Reports</p>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    // Employee Dashboard
    if (role === 'EMPLOYEE' || role === 'USER') {
        const industryType = (session?.user as any)?.industryType || 'SERVICE'

        // RETAIL Employee Dashboard
        if (industryType === 'RETAIL') {
            return (
                <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-stone-100">
                                Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {session?.user?.name?.split(' ')[0] || 'there'}
                            </h1>
                            <p className="text-stone-500 text-sm mt-1">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Link href="/dashboard/pos/retail" className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                Open POS
                            </Link>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-xs text-stone-500 uppercase">Today's Sales</p>
                            <p className="text-2xl font-bold text-stone-100 mt-1">$0.00</p>
                            <p className="text-xs text-emerald-500 mt-1">↑ Live</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-xs text-stone-500 uppercase">Transactions</p>
                            <p className="text-2xl font-bold text-stone-100 mt-1">0</p>
                            <p className="text-xs text-stone-500 mt-1">Today</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-xs text-stone-500 uppercase">Items Sold</p>
                            <p className="text-2xl font-bold text-stone-100 mt-1">0</p>
                            <p className="text-xs text-stone-500 mt-1">Today</p>
                        </div>
                        <div className="glass-panel p-4 rounded-xl">
                            <p className="text-xs text-stone-500 uppercase">Avg Transaction</p>
                            <p className="text-2xl font-bold text-stone-100 mt-1">$0.00</p>
                            <p className="text-xs text-stone-500 mt-1">Today</p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link href="/dashboard/deals" className="glass-panel p-6 rounded-xl text-center hover:border-pink-500/50 transition-all group">
                            <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Gift className="h-6 w-6 text-pink-500" />
                            </div>
                            <p className="font-medium text-stone-200">Deals</p>
                            <p className="text-xs text-stone-500 mt-1">Promotions</p>
                        </Link>
                        <Link href="/dashboard/inventory/retail" className="glass-panel p-6 rounded-xl text-center hover:border-orange-500/50 transition-all group">
                            <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Building2 className="h-6 w-6 text-blue-500" />
                            </div>
                            <p className="font-medium text-stone-200">Inventory</p>
                            <p className="text-xs text-stone-500 mt-1">Manage Products</p>
                        </Link>
                        <Link href="/dashboard/customers" className="glass-panel p-6 rounded-xl text-center hover:border-orange-500/50 transition-all group">
                            <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6 text-emerald-500" />
                            </div>
                            <p className="font-medium text-stone-200">Customers</p>
                            <p className="text-xs text-stone-500 mt-1">Lookup & Loyalty</p>
                        </Link>
                        <Link href="/dashboard/transactions" className="glass-panel p-6 rounded-xl text-center hover:border-orange-500/50 transition-all group">
                            <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <TrendingUp className="h-6 w-6 text-purple-500" />
                            </div>
                            <p className="font-medium text-stone-200">Orders</p>
                            <p className="text-xs text-stone-500 mt-1">View History</p>
                        </Link>
                        <Link href="/dashboard/lottery" className="glass-panel p-6 rounded-xl text-center hover:border-blue-500/50 transition-all group">
                            <div className="h-12 w-12 mx-auto mb-3 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Ticket className="h-6 w-6 text-blue-500" />
                            </div>
                            <p className="font-medium text-stone-200">Lottery</p>
                            <p className="text-xs text-stone-500 mt-1">Games & Packs</p>
                        </Link>
                    </div>

                    {/* Low Stock Alerts */}
                    <div className="glass-panel p-6 rounded-xl">
                        <h2 className="text-lg font-semibold text-stone-100 mb-4 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Low Stock Alerts
                        </h2>
                        <div className="text-center py-8 text-stone-500">
                            <p>No low stock alerts</p>
                            <p className="text-sm mt-1">Products below reorder point will appear here</p>
                        </div>
                    </div>
                </div>
            )
        }

        // SERVICE Employee Dashboard (original)
        return (
            <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Clean Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100">
                            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {session?.user?.name?.split(' ')[0] || 'there'}
                        </h1>
                        <p className="text-stone-500 text-sm mt-1">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Link href="/dashboard/pos" className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-stone-700/50">
                            <CreditCard className="h-4 w-4" />
                            New Sale
                        </Link>
                        <Link href="/dashboard/appointments" className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Book Appt
                        </Link>
                    </div>
                </div>

                {/* Stats Row */}
                <EmployeePerformanceStats />

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Main Content - Left */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Up Next Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide">Up Next</h2>
                            </div>
                            <NextClientSpotlight />
                        </div>

                        {/* Waiting Room */}
                        <div>
                            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3">Waiting Room</h2>
                            <CheckInQueue />
                        </div>
                    </div>

                    {/* Sidebar - Right */}
                    <div className="lg:col-span-2">
                        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3">Today's Schedule</h2>
                        <TodayAppointments />
                    </div>
                </div>
            </div>
        )
    }

    // Default dashboard for other roles (Franchisee / Manager)
    const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false)
    const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false)
    const [isMerchantApplicationModalOpen, setIsMerchantApplicationModalOpen] = useState(false)
    const [todayStats, setTodayStats] = useState({ visits: 0, revenue: 0, services: 0 })

    // Fetch today's stats
    useState(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/franchise/stats/today')
                if (res.ok) {
                    const data = await res.json()
                    setTodayStats(data)
                }
            } catch (error) {
                console.error('Error fetching stats:', error)
            }
        }
        fetchStats()
    }) // Runs once on mount (in strict mode dev it might run twice but that's fine)

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">
                        Welcome back, {session?.user?.name}! 👋
                    </h1>
                    <p className="text-stone-400 mt-2">Here's what's happening at your location today.</p>
                </div>
                {/* Action Buttons - Only for Franchise Owners and above */}
                {session?.user?.role !== 'EMPLOYEE' && (
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setIsMerchantApplicationModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-blue-900/20 transition-all font-medium flex items-center gap-2"
                        >
                            <CreditCard className="h-5 w-5" />
                            Apply for Processing
                        </button>
                        <button
                            onClick={() => setIsConsultationModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl shadow-lg shadow-purple-900/20 transition-all font-medium flex items-center gap-2"
                        >
                            <Phone className="h-5 w-5" />
                            Request Consultation
                        </button>
                        <button
                            onClick={() => setIsExpansionModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-900/20 transition-all font-medium flex items-center gap-2"
                        >
                            <MapPin className="h-5 w-5" />
                            Request Expansion
                        </button>
                    </div>
                )}
            </div>

            <RequestExpansionModal
                isOpen={isExpansionModalOpen}
                onClose={() => setIsExpansionModalOpen(false)}
                onSuccess={() => {
                    alert('Expansion request submitted successfully!')
                }}
            />

            <ConsultationRequestModal
                isOpen={isConsultationModalOpen}
                onClose={() => setIsConsultationModalOpen(false)}
                onSuccess={() => {
                    alert('Consultation request submitted successfully!')
                }}
            />

            <MerchantApplicationModal
                isOpen={isMerchantApplicationModalOpen}
                onClose={() => setIsMerchantApplicationModalOpen(false)}
                onSuccess={() => {
                    alert('Merchant application submitted successfully!')
                }}
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Customer Visits</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">{todayStats.visits}</p>
                            <p className="text-sm text-emerald-500 mt-2 flex items-center">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Live Today
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-stone-700/50 rounded-xl flex items-center justify-center shadow-lg shadow-stone-900/20">
                            <Users className="h-6 w-6 text-stone-300" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Services Completed</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">{todayStats.services}</p>
                            <p className="text-sm text-emerald-500 mt-2 flex items-center">
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Live Today
                            </p>
                        </div>
                        <div className="h-12 w-12 bg-stone-700/50 rounded-xl flex items-center justify-center shadow-lg shadow-stone-900/20">
                            <Clock className="h-6 w-6 text-stone-300" />
                        </div>
                    </div>
                </div>
                <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Today's Revenue</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">${todayStats.revenue.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
