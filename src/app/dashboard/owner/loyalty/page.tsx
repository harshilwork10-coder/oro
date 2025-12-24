'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Award, RefreshCw, Search, Plus, Star,
    User, DollarSign, TrendingUp, Settings, Gift
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LoyaltyMember {
    id: string
    phone: string
    email: string | null
    name: string | null
    pointsBalance: number
    lifetimePoints: number
    lifetimeSpend: number
    enrolledAt: string
    lastActivity: string
    isCrossStore: boolean
    pooledBalance: number
}

interface Stats {
    totalMembers: number
    activeMembers: number
    totalPointsOutstanding: number
    totalLifetimePoints: number
    totalLifetimeSpend: number
}

export default function LoyaltyPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [program, setProgram] = useState<any>(null)
    const [stats, setStats] = useState<Stats | null>(null)
    const [topMembers, setTopMembers] = useState<any[]>([])
    const [searchResults, setSearchResults] = useState<LoyaltyMember[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searching, setSearching] = useState(false)
    const [showEnroll, setShowEnroll] = useState(false)
    const [showSettings, setShowSettings] = useState(false)
    const [message, setMessage] = useState('')

    // Enroll form
    const [enrollForm, setEnrollForm] = useState({ phone: '', email: '', name: '' })
    const [saving, setSaving] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [statsRes, topRes] = await Promise.all([
                fetch('/api/owner/loyalty?type=stats'),
                fetch('/api/owner/loyalty?type=top-members')
            ])
            const statsData = await statsRes.json()
            const topData = await topRes.json()

            setProgram(statsData.program)
            setStats(statsData.stats)
            setTopMembers(topData.topMembers || [])
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const searchMembers = async () => {
        if (!searchQuery || searchQuery.length < 3) return
        setSearching(true)
        try {
            const res = await fetch(`/api/owner/loyalty?type=search&phone=${encodeURIComponent(searchQuery)}`)
            const data = await res.json()
            setSearchResults(data.members || [])
        } catch (error) {
            console.error('Search failed:', error)
        } finally {
            setSearching(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(searchMembers, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const enrollMember = async () => {
        if (!enrollForm.phone) return
        setSaving(true)
        try {
            const res = await fetch('/api/owner/loyalty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'enroll', ...enrollForm })
            })
            const data = await res.json()
            if (res.ok) {
                setShowEnroll(false)
                setEnrollForm({ phone: '', email: '', name: '' })
                setMessage('✓ ' + (data.message || 'Member enrolled'))
                fetchData()
            }
        } catch (error) {
            setMessage('Failed to enroll')
        } finally {
            setSaving(false)
        }
    }

    const updateSettings = async () => {
        if (!program) return
        setSaving(true)
        try {
            const res = await fetch('/api/owner/loyalty', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(program)
            })
            if (res.ok) {
                setShowSettings(false)
                setMessage('✓ Settings saved')
                fetchData()
            }
        } catch (error) {
            setMessage('Failed to save')
        } finally {
            setSaving(false)
        }
    }

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
                            <Award className="h-8 w-8 text-yellow-500" />
                            {program?.name || 'Loyalty'} Program
                        </h1>
                        <p className="text-stone-400">Cross-store rewards tracking</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(true)} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl">
                        <Settings className="h-5 w-5" />
                    </button>
                    <button onClick={fetchData} disabled={loading} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl">
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowEnroll(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-xl"
                    >
                        <Plus className="h-4 w-4" />
                        Enroll Member
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-xl ${message.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-yellow-600/30 to-yellow-900/30 border border-yellow-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5 text-yellow-400" />
                        <span className="text-sm text-stone-400">Total Members</span>
                    </div>
                    <p className="text-3xl font-bold">{stats?.totalMembers?.toLocaleString() || 0}</p>
                    <p className="text-sm text-stone-500 mt-1">{stats?.activeMembers || 0} active (30d)</p>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Star className="h-5 w-5 text-amber-400" />
                        <span className="text-sm text-stone-400">Points Outstanding</span>
                    </div>
                    <p className="text-3xl font-bold">{(stats?.totalPointsOutstanding || 0).toLocaleString()}</p>
                    <p className="text-sm text-stone-500 mt-1">
                        ≈ {formatCurrency((stats?.totalPointsOutstanding || 0) * Number(program?.redemptionRatio || 0.01))} value
                    </p>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm text-stone-400">Lifetime Spend</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(stats?.totalLifetimeSpend || 0)}</p>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-stone-400">Lifetime Points</span>
                    </div>
                    <p className="text-3xl font-bold">{(stats?.totalLifetimePoints || 0).toLocaleString()}</p>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by phone number..."
                        className="w-full pl-12 pr-4 py-4 bg-stone-900 border border-stone-700 rounded-2xl text-lg"
                    />
                    {searching && <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-stone-500" />}
                </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="mb-6 bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold mb-4">Search Results ({searchResults.length})</h3>
                    <div className="space-y-3">
                        {searchResults.map(member => (
                            <div key={member.id} className="p-4 bg-stone-800 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{member.name || member.phone}</p>
                                    <p className="text-sm text-stone-400">{member.phone} {member.email && `• ${member.email}`}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-yellow-400">{member.pointsBalance.toLocaleString()} pts</p>
                                    <p className="text-sm text-stone-500">Lifetime: {formatCurrency(member.lifetimeSpend)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Members */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Gift className="h-5 w-5 text-yellow-400" />
                    Top Loyalty Members
                </h3>

                {topMembers.length === 0 ? (
                    <div className="text-center py-8 text-stone-500">
                        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No members yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {topMembers.map((member, i) => (
                            <div key={member.id} className="flex items-center gap-4 p-3 bg-stone-800 rounded-xl">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full ${i === 0 ? 'bg-yellow-500 text-black' :
                                        i === 1 ? 'bg-stone-400 text-black' :
                                            i === 2 ? 'bg-amber-700 text-white' :
                                                'bg-stone-700'
                                    }`}>
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">{member.name || member.phone}</p>
                                    <p className="text-sm text-stone-500">{member.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-yellow-400">{member.pointsBalance?.toLocaleString()} pts</p>
                                    <p className="text-sm text-emerald-400">{formatCurrency(member.lifetimeSpend)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Enroll Modal */}
            {showEnroll && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-md">
                        <div className="p-5 border-b border-stone-700">
                            <h2 className="text-xl font-bold">Enroll New Member</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm text-stone-400">Phone *</label>
                                <input
                                    type="tel"
                                    value={enrollForm.phone}
                                    onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                                    placeholder="(555) 123-4567"
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-stone-400">Name</label>
                                <input
                                    type="text"
                                    value={enrollForm.name}
                                    onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-stone-400">Email</label>
                                <input
                                    type="email"
                                    value={enrollForm.email}
                                    onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>
                        </div>
                        <div className="p-5 border-t border-stone-700 flex gap-2">
                            <button onClick={() => setShowEnroll(false)} className="flex-1 py-3 bg-stone-700 rounded-xl">
                                Cancel
                            </button>
                            <button onClick={enrollMember} disabled={saving} className="flex-1 py-3 bg-yellow-600 rounded-xl disabled:opacity-50">
                                {saving ? 'Enrolling...' : 'Enroll'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && program && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-md">
                        <div className="p-5 border-b border-stone-700">
                            <h2 className="text-xl font-bold">Program Settings</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm text-stone-400">Program Name</label>
                                <input
                                    type="text"
                                    value={program.name}
                                    onChange={(e) => setProgram({ ...program, name: e.target.value })}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-stone-400">Points per Dollar Spent</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={program.pointsPerDollar}
                                    onChange={(e) => setProgram({ ...program, pointsPerDollar: parseFloat(e.target.value) })}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-stone-400">Redemption Value ($/point)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={program.redemptionRatio}
                                    onChange={(e) => setProgram({ ...program, redemptionRatio: parseFloat(e.target.value) })}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                                <p className="text-xs text-stone-500 mt-1">
                                    100 pts = {formatCurrency(100 * program.redemptionRatio)}
                                </p>
                            </div>
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={program.isEnabled}
                                    onChange={(e) => setProgram({ ...program, isEnabled: e.target.checked })}
                                    className="rounded"
                                />
                                <span>Program Enabled</span>
                            </label>
                        </div>
                        <div className="p-5 border-t border-stone-700 flex gap-2">
                            <button onClick={() => setShowSettings(false)} className="flex-1 py-3 bg-stone-700 rounded-xl">
                                Cancel
                            </button>
                            <button onClick={updateSettings} disabled={saving} className="flex-1 py-3 bg-yellow-600 rounded-xl disabled:opacity-50">
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
