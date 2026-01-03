'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
    Users,
    MapPin,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Search,
    Filter,
    Phone,
    Mail,
    Calendar
} from "lucide-react"

import AddFranchiseeModal from "@/components/modals/AddFranchiseeModal"

type Franchisee = {
    id: string
    name: string
    email: string
    phone: string
    franchiseName: string
    contractStart: string
    contractEnd: string
    healthScore: number
    locations: number
    totalRevenue: number
    complianceScore: number
    employeeCount: number
    trend: 'up' | 'down'
    breakdown?: {
        revenue: number
        compliance: number
        customerSat: number
        employeeRetention: number
        growth: number
    }
}

export default function FranchiseesPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [franchisees, setFranchisees] = useState<Franchisee[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)

    async function fetchFranchisees() {
        try {
            const response = await fetch('/api/franchisees')
            if (response.ok) {
                const data = await response.json()
                setFranchisees(data)
            }
        } catch (error) {
            console.error('Error fetching franchisees:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === 'authenticated') {
            fetchFranchisees()
        }
    }, [status])

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    // Calculate summary stats
    const totalLocations = franchisees.reduce((sum, f) => sum + f.locations, 0)
    const totalRevenue = franchisees.reduce((sum, f) => sum + f.totalRevenue, 0)
    const avgHealthScore = franchisees.length > 0
        ? Math.round(franchisees.reduce((sum, f) => sum + f.healthScore, 0) / franchisees.length)
        : 0


    const getHealthScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50 border-green-200'
        if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
        return 'text-red-600 bg-red-50 border-red-200'
    }

    const getHealthScoreBadge = (score: number) => {
        if (score >= 80) return 'Healthy'
        if (score >= 60) return 'At Risk'
        return 'Critical'
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">Franchisee CRM</h1>
                    <p className="text-stone-400 mt-2">Manage franchisee relationships and performance</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl shadow-lg shadow-orange-900/20 hover:shadow-orange-900/40 hover:scale-105 transition-all font-medium flex items-center gap-2"
                >
                    <Users className="h-5 w-5" />
                    Add Franchisee
                </button>
            </div>

            <AddFranchiseeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    fetchFranchisees()
                    setIsModalOpen(false)
                }}
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Total Franchisees</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">{franchisees.length}</p>
                        </div>
                        <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Avg Health Score</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">{avgHealthScore}</p>
                        </div>
                        <div className="h-12 w-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-emerald-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Total Locations</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">{totalLocations}</p>
                        </div>
                        <div className="h-12 w-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <MapPin className="h-6 w-6 text-purple-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-stone-400">Total Revenue</p>
                            <p className="text-3xl font-bold text-stone-100 mt-2">${(totalRevenue / 1000).toFixed(0)}K</p>
                        </div>
                        <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-amber-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search franchisees..."
                            className="w-full pl-10 pr-4 py-3 bg-stone-900/50 border border-stone-700 rounded-xl text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <button className="px-6 py-3 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 rounded-xl transition-all flex items-center gap-2 font-medium">
                        <Filter className="h-5 w-5" />
                        Filters
                    </button>
                </div>
            </div>

            {/* Franchisee Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {franchisees.map((franchisee) => (
                    <Link
                        key={franchisee.id}
                        href={`/dashboard/franchisees/${franchisee.id}`}
                        className="glass-panel p-6 rounded-2xl hover:border-orange-500/30 transition-all group cursor-pointer relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Header */}
                        <div className="flex items-start justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-stone-800 to-stone-700 flex items-center justify-center text-stone-100 font-bold text-xl border border-stone-600 shadow-lg">
                                    {franchisee.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-stone-100 group-hover:text-orange-400 transition-colors">
                                        {franchisee.name}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm text-stone-400 flex items-center gap-1">
                                            <Mail className="h-4 w-4" />
                                            {franchisee.email}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full border font-semibold text-sm backdrop-blur-md ${franchisee.healthScore >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                    franchisee.healthScore >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                                        'text-red-400 bg-red-500/10 border-red-500/20'
                                }`}>
                                {getHealthScoreBadge(franchisee.healthScore)}
                            </div>
                        </div>

                        {/* Health Score */}
                        <div className="mb-6 relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-stone-400">Health Score</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold text-stone-100">{franchisee.healthScore}</span>
                                    {franchisee.trend === 'up' ? (
                                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-red-500" />
                                    )}
                                </div>
                            </div>
                            <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`h-2 rounded-full transition-all ${franchisee.healthScore >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                            franchisee.healthScore >= 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                                'bg-gradient-to-r from-red-500 to-red-400'
                                        }`}
                                    style={{ width: `${franchisee.healthScore}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-stone-800 relative z-10">
                            <div>
                                <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Locations</p>
                                <p className="text-lg font-bold text-stone-200 mt-1">{franchisee.locations}</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Revenue</p>
                                <p className="text-lg font-bold text-stone-200 mt-1">${(franchisee.totalRevenue / 1000).toFixed(0)}K</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Compliance</p>
                                <p className="text-lg font-bold text-stone-200 mt-1">{franchisee.complianceScore}%</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">Customer Sat</p>
                                <p className="text-lg font-bold text-stone-200 mt-1">{franchisee.breakdown?.customerSat || 85}%</p>
                            </div>
                        </div>

                        {/* Contract Info */}
                        <div className="mt-4 pt-4 border-t border-stone-800 flex items-center gap-2 text-sm text-stone-500 relative z-10">
                            <Calendar className="h-4 w-4" />
                            <span>Contract expires: {new Date(franchisee.contractEnd).toLocaleDateString()}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}

