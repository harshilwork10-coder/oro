'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    DollarSign, Users, Calendar, Clock, TrendingUp, TrendingDown,
    AlertTriangle, Globe, Smartphone, PhoneCall, Footprints,
    Loader2, ChevronRight, Download, Scissors, CreditCard, Star, Trophy
} from 'lucide-react'

interface DashboardData {
    date: string
    kpis: {
        totalRevenue: number
        totalTips: number
        serviceRevenue: number
        totalClients: number
        totalTransactions: number
        avgTicket: number
        estimatedCommissions: number
    }
    appointments: {
        total: number
        scheduled: number
        completed: number
        cancelled: number
        noShow: number
        pending: number
    }
    sources: {
        online: number
        pos: number
        phone: number
        walkIn: number
    }
    staffOnDuty: { id: string; name: string; clockedIn: string }[]
    upcoming: {
        id: string
        time: string
        customer: string
        service: string
        staff: string
        price: number
        source?: string
        status: string
    }[]
    noShowCount: number
    pendingApprovals: number
}

function KPICard({ label, value, icon, color, subtext }: {
    label: string; value: string; icon: React.ReactNode; color: string; subtext?: string
}) {
    return (
        <div className={`bg-stone-900/60 border border-stone-800 rounded-xl p-5 hover:border-stone-700 transition-all`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-stone-400">{label}</span>
                <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtext && <p className="text-xs text-stone-500 mt-1">{subtext}</p>}
        </div>
    )
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

export default function SalonOwnerDashboardPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() { redirect('/login') }
    })

    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [rankings, setRankings] = useState<any[]>([])

    useEffect(() => {
        if (status === 'authenticated') fetchDashboard()
    }, [status])

    async function fetchDashboard() {
        try {
            const [dashRes, rankRes] = await Promise.all([
                fetch('/api/salon/owner-dashboard'),
                fetch('/api/pos/staff-rankings?period=today')
            ])
            if (dashRes.ok) {
                setData(await dashRes.json())
            } else {
                setError('Failed to load dashboard')
            }
            if (rankRes.ok) {
                const rankData = await rankRes.json()
                setRankings(rankData.data || [])
            }
        } catch (e) {
            setError('Failed to load dashboard')
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <p className="text-stone-400">{error || 'No data'}</p>
            </div>
        )
    }

    const { kpis, appointments, sources, staffOnDuty, upcoming, pendingApprovals, noShowCount } = data

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-violet-500/10 rounded-xl">
                        <Scissors className="h-6 w-6 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Salon Dashboard</h1>
                        <p className="text-stone-400 text-sm">
                            {new Date(data.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {pendingApprovals > 0 && (
                        <a href="/dashboard/appointments" className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 hover:bg-amber-500/20 transition-all">
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            <span className="text-amber-300 font-medium text-sm">{pendingApprovals} pending</span>
                            <ChevronRight className="h-4 w-4 text-amber-400" />
                        </a>
                    )}
                    {noShowCount > 0 && (
                        <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-400" />
                            <span className="text-orange-300 font-medium text-sm">{noShowCount} no-show{noShowCount > 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    label="Today's Revenue"
                    value={`$${kpis.totalRevenue.toFixed(2)}`}
                    icon={<DollarSign className="h-5 w-5" />}
                    color="bg-emerald-500/10 text-emerald-400"
                    subtext={`Tips: $${kpis.totalTips.toFixed(2)}`}
                />
                <KPICard
                    label="Appointments"
                    value={String(appointments.total)}
                    icon={<Calendar className="h-5 w-5" />}
                    color="bg-blue-500/10 text-blue-400"
                    subtext={`${appointments.completed} done · ${appointments.scheduled} upcoming`}
                />
                <KPICard
                    label="Clients Served"
                    value={String(kpis.totalClients)}
                    icon={<Users className="h-5 w-5" />}
                    color="bg-purple-500/10 text-purple-400"
                    subtext={`Avg ticket: $${kpis.avgTicket.toFixed(2)}`}
                />
                <KPICard
                    label="Est. Commissions"
                    value={`$${kpis.estimatedCommissions.toFixed(2)}`}
                    icon={<CreditCard className="h-5 w-5" />}
                    color="bg-amber-500/10 text-amber-400"
                    subtext={`${kpis.totalTransactions} transactions`}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upcoming Appointments - 2 cols */}
                <div className="lg:col-span-2 bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-white flex items-center gap-2">
                            <Clock className="h-5 w-5 text-violet-400" />
                            Upcoming Appointments
                        </h2>
                        <a href="/dashboard/appointments" className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1">
                            View Calendar <ChevronRight className="h-4 w-4" />
                        </a>
                    </div>
                    {upcoming.length === 0 ? (
                        <div className="text-center py-8">
                            <Calendar className="h-10 w-10 text-stone-600 mx-auto mb-3" />
                            <p className="text-stone-500">No upcoming appointments today</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {upcoming.map(apt => (
                                <div key={apt.id} className="flex items-center justify-between py-3 px-4 bg-stone-800/40 rounded-lg hover:bg-stone-800/60 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-violet-500/10 px-3 py-1.5 rounded-lg">
                                            <span className="text-violet-300 font-bold text-sm">
                                                {new Date(apt.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{apt.customer}</p>
                                            <p className="text-stone-400 text-sm flex items-center gap-2">
                                                {apt.service} · {apt.staff}
                                                <SourceBadge source={apt.source} />
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-white font-medium">${apt.price.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Staff On Duty */}
                    <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                        <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
                            <Users className="h-5 w-5 text-emerald-400" />
                            Staff On Duty
                        </h2>
                        {staffOnDuty.length === 0 ? (
                            <p className="text-stone-500 text-sm text-center py-4">No staff clocked in yet</p>
                        ) : (
                            <div className="space-y-2">
                                {staffOnDuty.map(s => (
                                    <div key={s.id} className="flex items-center gap-3 py-2">
                                        <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                                        <span className="text-white text-sm">{s.name}</span>
                                        <span className="text-stone-500 text-xs ml-auto">
                                            since {new Date(s.clockedIn).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Booking Sources */}
                    <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                        <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
                            <Globe className="h-5 w-5 text-blue-400" />
                            Booking Sources
                        </h2>
                        <div className="space-y-3">
                            {[
                                { label: 'Online', count: sources.online, cls: 'bg-blue-500', icon: <Globe className="h-4 w-4 text-blue-400" /> },
                                { label: 'POS', count: sources.pos, cls: 'bg-emerald-500', icon: <Smartphone className="h-4 w-4 text-emerald-400" /> },
                                { label: 'Phone', count: sources.phone, cls: 'bg-purple-500', icon: <PhoneCall className="h-4 w-4 text-purple-400" /> },
                                { label: 'Walk-in', count: sources.walkIn, cls: 'bg-amber-500', icon: <Footprints className="h-4 w-4 text-amber-400" /> },
                            ].map(s => {
                                const total = Math.max(sources.online + sources.pos + sources.phone + sources.walkIn, 1)
                                const pct = Math.round((s.count / total) * 100)
                                return (
                                    <div key={s.label} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {s.icon}
                                                <span className="text-sm text-stone-300">{s.label}</span>
                                            </div>
                                            <span className="text-sm text-stone-400">{s.count} ({pct}%)</span>
                                        </div>
                                        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                            <div className={`h-full ${s.cls} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                        <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
                            <Star className="h-5 w-5 text-amber-400" />
                            Quick Stats
                        </h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-stone-400">Cancelled</span>
                                <span className="text-red-400 font-medium">{appointments.cancelled}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-400">No-shows</span>
                                <span className="text-orange-400 font-medium">{appointments.noShow}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-400">Service Revenue</span>
                                <span className="text-white font-medium">${kpis.serviceRevenue.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-400">Tips</span>
                                <span className="text-emerald-400 font-medium">${kpis.totalTips.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Staff Rankings Widget */}
                    {rankings.length > 0 && (
                        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-5">
                            <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
                                <Trophy className="h-5 w-5 text-amber-400" />
                                Staff Rankings
                            </h2>
                            <div className="space-y-3">
                                {rankings.slice(0, 5).map((r: any, i: number) => {
                                    const medals = ['🥇', '🥈', '🥉']
                                    return (
                                        <div key={i} className="flex items-center gap-3 py-2">
                                            <span className="text-lg w-7 text-center">
                                                {i < 3 ? medals[i] : <span className="text-stone-600 text-sm font-mono">#{i + 1}</span>}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{r.name}</p>
                                                <p className="text-stone-500 text-xs">
                                                    {r.servicesCompleted} services · ${r.tipsEarned.toFixed(0)} tips
                                                </p>
                                            </div>
                                            <span className="text-emerald-400 font-bold text-sm">
                                                ${r.revenue.toFixed(0)}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
