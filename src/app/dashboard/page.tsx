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
    Clock
} from "lucide-react"
import PredictiveAlerts from "@/components/dashboard/PredictiveAlerts"
import RequestExpansionModal from "@/components/modals/RequestExpansionModal"
import ConsultationRequestModal from "@/components/modals/ConsultationRequestModal"
import MerchantApplicationModal from "@/components/modals/MerchantApplicationModal"
import { useState } from "react"

export default function DashboardPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

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

                {/* AI Alerts */}
                <PredictiveAlerts />

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Franchises */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Total Franchises</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">12</p>
                                <p className="text-sm text-emerald-500 mt-2 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    +2 this month
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
                                <p className="text-3xl font-bold text-stone-100 mt-2">47</p>
                                <p className="text-sm text-emerald-500 mt-2 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    +5 this month
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
                                <p className="text-3xl font-bold text-stone-100 mt-2">234</p>
                                <p className="text-sm text-emerald-500 mt-2 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    +12 this month
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
                                <p className="text-3xl font-bold text-stone-100 mt-2">$124K</p>
                                <p className="text-sm text-emerald-500 mt-2 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    +18% vs last month
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
                        <div className="space-y-4">
                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-orange-500/30 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Building2 className="h-6 w-6 text-orange-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 mb-1">New franchise added</p>
                                        <p className="text-sm text-stone-400">Downtown Franchise</p>
                                        <p className="text-xs text-stone-500 mt-2">2 hours ago</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-orange-500/30 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-stone-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <MapPin className="h-6 w-6 text-stone-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 mb-1">3 new locations opened</p>
                                        <p className="text-sm text-stone-400">Westside, Airport, Suburban</p>
                                        <p className="text-xs text-stone-500 mt-2">Today</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-orange-500/30 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-stone-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Users className="h-6 w-6 text-stone-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 mb-1">12 employees onboarded</p>
                                        <p className="text-sm text-stone-400">Across 5 locations</p>
                                        <p className="text-xs text-stone-500 mt-2">This week</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Items */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-bold text-stone-100 mb-6">Action Items</h2>
                        <div className="space-y-4">
                            <Link href="/dashboard/compliance" className="block p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <AlertCircle className="h-6 w-6 text-amber-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 group-hover:text-amber-400 mb-1">3 compliance reviews needed</p>
                                        <p className="text-sm text-stone-400">Due this week</p>
                                        <p className="text-xs text-amber-500 mt-2 font-medium">Click to review →</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/dashboard/financials" className="block p-4 bg-red-500/10 rounded-xl border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <DollarSign className="h-6 w-6 text-red-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 group-hover:text-red-400 mb-1">2 overdue invoices</p>
                                        <p className="text-sm text-stone-400">Requires immediate attention</p>
                                        <p className="text-xs text-red-500 mt-2 font-medium">Click to resolve →</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/dashboard/documents" className="block p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <AlertCircle className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 group-hover:text-blue-400 mb-1">5 documents pending approval</p>
                                        <p className="text-sm text-stone-400">Review required</p>
                                        <p className="text-xs text-blue-500 mt-2 font-medium">Click to approve →</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Franchisor Dashboard (Franchise Owner)
    if (role === 'FRANCHISOR') {
        return (
            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">
                        Welcome back, Franchise Owner! 👋
                    </h1>
                    <p className="text-stone-400 mt-2">Here's what's happening with your franchise today.</p>
                </div>

                {/* Statistics Cards - Franchise Scoped */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Franchise Name */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Your Franchise</p>
                                <p className="text-2xl font-bold text-stone-100 mt-2">Downtown Franchise</p>
                                <p className="text-sm text-blue-400 mt-2 flex items-center">
                                    Active since 2023
                                </p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/20">
                                <Building2 className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Your Locations */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Your Locations</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">5</p>
                                <p className="text-sm text-emerald-500 mt-2 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    +1 this month
                                </p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/20">
                                <MapPin className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Your Employees */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Your Employees</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">23</p>
                                <p className="text-sm text-emerald-500 mt-2 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    +3 this month
                                </p>
                            </div>
                            <div className="h-14 w-14 bg-gradient-to-br from-stone-700 to-stone-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-stone-900/20">
                                <Users className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Your Revenue */}
                    <div className="glass-panel p-6 rounded-2xl group cursor-pointer hover:border-orange-500/30 transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-stone-400">Monthly Revenue</p>
                                <p className="text-3xl font-bold text-stone-100 mt-2">$45K</p>
                                <p className="text-sm text-emerald-500 mt-2 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    +12% vs last month
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
                        <div className="space-y-4">
                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-orange-500/30 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <MapPin className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 mb-1">Location opened</p>
                                        <p className="text-sm text-stone-400">Westside Location - Now serving customers</p>
                                        <p className="text-xs text-stone-500 mt-2">2 hours ago</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-orange-500/30 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-stone-700/50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Users className="h-6 w-6 text-stone-300" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 mb-1">3 employees hired</p>
                                        <p className="text-sm text-stone-400">Airport Location - Training starts Monday</p>
                                        <p className="text-xs text-stone-500 mt-2">1 day ago</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-stone-800/50 rounded-xl border border-stone-700 hover:border-orange-500/30 transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <DollarSign className="h-6 w-6 text-orange-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 mb-1">Best sales day</p>
                                        <p className="text-sm text-stone-400">Downtown Location - $8,500 in revenue</p>
                                        <p className="text-xs text-stone-500 mt-2">2 days ago</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Items */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-bold text-stone-100 mb-6">Action Items</h2>
                        <div className="space-y-4">
                            <Link href="/dashboard/compliance" className="block p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <AlertCircle className="h-6 w-6 text-amber-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 group-hover:text-amber-400 mb-1">1 compliance review needed</p>
                                        <p className="text-sm text-stone-400">Due this week</p>
                                        <p className="text-xs text-amber-500 mt-2 font-medium">Click to review →</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/dashboard/employees" className="block p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <Users className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 group-hover:text-blue-400 mb-1">2 training sessions pending</p>
                                        <p className="text-sm text-stone-400">New employee onboarding</p>
                                        <p className="text-xs text-blue-500 mt-2 font-medium">Click to schedule →</p>
                                    </div>
                                </div>
                            </Link>

                            <Link href="/dashboard/financials" className="block p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all group">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                        <DollarSign className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-semibold text-stone-200 group-hover:text-emerald-400 mb-1">Invoice ready for review</p>
                                        <p className="text-sm text-stone-400">Monthly SaaS fee: $2,450</p>
                                        <p className="text-xs text-emerald-500 mt-2 font-medium">Click to view →</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Default dashboard for other roles (Franchisee / Employee)
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
