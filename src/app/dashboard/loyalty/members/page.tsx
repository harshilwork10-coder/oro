'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Search,
    Star,
    Users,
    Gift,
    TrendingUp,
    Phone,
    Mail,
    Calendar,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Award,
    Sparkles
} from 'lucide-react'

interface LoyaltyMember {
    id: string
    phone: string
    name: string | null
    email: string | null
    pointsBalance: number
    lifetimePoints: number
    lifetimeSpend: number
    createdAt: string
    program: {
        id: string
        name: string
        franchise: {
            name: string
        }
    }
    masterAccountId: string | null
}

export default function LoyaltyMembersPage() {
    const { data: session } = useSession()
    const user = session?.user as any
    const [members, setMembers] = useState<LoyaltyMember[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalMembers, setTotalMembers] = useState(0)
    const pageSize = 20

    const fetchMembers = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                ...(search && { search })
            })
            const res = await fetch(`/api/loyalty/members/list?${params}`)
            if (res.ok) {
                const data = await res.json()
                setMembers(data.members || [])
                setTotalMembers(data.total || 0)
            }
        } catch (error) {
            console.error('Failed to fetch members:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMembers()
    }, [page, search])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        fetchMembers()
    }

    const totalPages = Math.ceil(totalMembers / pageSize)

    // Summary stats
    const totalPoints = members.reduce((sum, m) => sum + (m.pointsBalance || 0), 0)
    const totalLifetimeSpend = members.reduce((sum, m) => sum + (m.lifetimeSpend || 0), 0)
    const linkedAccounts = members.filter(m => m.masterAccountId).length

    return (
        <div className="min-h-screen bg-stone-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <Star className="w-6 h-6 text-white" />
                            </div>
                            Loyalty Members
                        </h1>
                        <p className="text-stone-400 mt-1">Manage your loyalty program members</p>
                    </div>
                    <button
                        onClick={fetchMembers}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-300 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-5 h-5 text-amber-400" />
                            <span className="text-amber-200 text-sm">Total Members</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{totalMembers.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Star className="w-5 h-5 text-emerald-400" />
                            <span className="text-emerald-200 text-sm">Active Points</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{totalPoints.toLocaleString()}</p>
                        <p className="text-xs text-emerald-400 mt-1">≈ ${(totalPoints * 0.01).toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            <span className="text-blue-200 text-sm">Lifetime Spend</span>
                        </div>
                        <p className="text-3xl font-bold text-white">${totalLifetimeSpend.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Sparkles className="w-5 h-5 text-purple-400" />
                            <span className="text-purple-200 text-sm">Linked Accounts</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{linkedAccounts}</p>
                        <p className="text-xs text-purple-400 mt-1">Multi-brand members</p>
                    </div>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search by phone, name, or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
                        />
                    </div>
                </form>

                {/* Members Table */}
                <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-800">
                                    <th className="text-left py-4 px-6 text-stone-400 font-medium text-sm">Member</th>
                                    <th className="text-left py-4 px-6 text-stone-400 font-medium text-sm">Phone</th>
                                    <th className="text-right py-4 px-6 text-stone-400 font-medium text-sm">Points</th>
                                    <th className="text-right py-4 px-6 text-stone-400 font-medium text-sm">Lifetime</th>
                                    <th className="text-center py-4 px-6 text-stone-400 font-medium text-sm">Status</th>
                                    <th className="text-left py-4 px-6 text-stone-400 font-medium text-sm">Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-stone-500">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading members...
                                        </td>
                                    </tr>
                                ) : members.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-stone-500">
                                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            No members found
                                        </td>
                                    </tr>
                                ) : (
                                    members.map((member) => (
                                        <tr key={member.id} className="border-b border-stone-800/50 hover:bg-stone-800/30">
                                            <td className="py-4 px-6">
                                                <div>
                                                    <p className="font-medium text-white">
                                                        {member.name || 'Unnamed Member'}
                                                    </p>
                                                    {member.email && (
                                                        <p className="text-sm text-stone-500 flex items-center gap-1">
                                                            <Mail className="w-3 h-3" />
                                                            {member.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-stone-300 flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-stone-500" />
                                                    {member.phone}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <span className="text-amber-400 font-bold">{member.pointsBalance.toLocaleString()}</span>
                                                <span className="text-stone-500 text-sm ml-1">pts</span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div>
                                                    <p className="text-stone-300">{member.lifetimePoints.toLocaleString()} pts</p>
                                                    <p className="text-xs text-stone-500">${member.lifetimeSpend.toFixed(2)}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {member.masterAccountId ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                                        <Sparkles className="w-3 h-3" />
                                                        Linked
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-stone-800 text-stone-400 text-xs rounded-full">
                                                        <Award className="w-3 h-3" />
                                                        Single
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-stone-400 text-sm flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(member.createdAt).toLocaleDateString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t border-stone-800">
                            <p className="text-stone-500 text-sm">
                                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalMembers)} of {totalMembers}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                                >
                                    <ChevronLeft className="w-4 h-4 text-white" />
                                </button>
                                <span className="text-white px-4">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                                >
                                    <ChevronRight className="w-4 h-4 text-white" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

