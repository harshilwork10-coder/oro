'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
    DollarSign,
    Clock,
    Users,
    TrendingUp,
    TrendingDown,
    ChevronRight,
    Calendar,
    AlertTriangle,
    Check,
    CreditCard,
    RefreshCw,
    LogOut,
    Store,
    UserCheck,
    Coffee,
    Scissors
} from 'lucide-react'

// Types
interface BarberStats {
    id: string
    name: string
    chair: number
    status: 'on-shift' | 'break' | 'off'
    clockIn?: string
    salesToday: number
    tipsToday: number
    currentClient?: string
    queueCount: number
}

interface PayoutItem {
    barberId: string
    barberName: string
    earned: number
    commission: number
    tips: number
    status: 'pending' | 'approved' | 'paid'
}

interface AppointmentStats {
    booked: number
    arrived: number
    inChair: number
    completed: number
    noShows: number
    walkIns: number
}

interface Issue {
    id: string
    type: 'warning' | 'info' | 'critical'
    message: string
    action?: string
}

export default function SalonOwnerDashboard() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)

    // Real data state
    const [shopName, setShopName] = useState('My Salon')
    const [totalRevenueToday, setTotalRevenueToday] = useState(0)
    const [totalRevenueTips, setTotalRevenueTips] = useState(0)
    const [totalClients, setTotalClients] = useState(0)
    const [walkInsToday, setWalkInsToday] = useState(0)
    const [changePercent, setChangePercent] = useState(0)

    const [barbers, setBarbers] = useState<BarberStats[]>([])
    const [payouts, setPayouts] = useState<PayoutItem[]>([])
    const [totalCommissionOwed, setTotalCommissionOwed] = useState(0)
    const [totalTipsOwed, setTotalTipsOwed] = useState(0)

    const [appointmentStats, setAppointmentStats] = useState<AppointmentStats>({
        booked: 0, arrived: 0, inChair: 0, completed: 0, noShows: 0, walkIns: 0
    })

    const [issues, setIssues] = useState<Issue[]>([])

    // Fetch all data
    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch today's stats
            const statsRes = await fetch('/api/owner/today-stats')
            if (statsRes.ok) {
                const stats = await statsRes.json()
                setShopName(stats.shopName || 'My Salon')
                setTotalRevenueToday(stats.totalRevenueToday || 0)
                setTotalRevenueTips(stats.totalTipsToday || 0)
                setTotalClients(stats.totalClients || 0)
                setWalkInsToday(stats.walkIns || 0)
                setChangePercent(stats.changePercent || 0)
            }

            // Fetch working barbers
            const barbersRes = await fetch('/api/owner/working-barbers')
            if (barbersRes.ok) {
                const data = await barbersRes.json()
                setBarbers(data.barbers || [])
            }

            // Fetch payouts
            const payoutsRes = await fetch('/api/owner/barber-payouts')
            if (payoutsRes.ok) {
                const data = await payoutsRes.json()
                setPayouts(data.payouts || [])
                setTotalCommissionOwed(data.totals?.commission || 0)
                setTotalTipsOwed(data.totals?.cardTips || 0)
            }

            // Appointments API pending
            // For now, use walk-ins from stats
            setAppointmentStats(prev => ({
                ...prev,
                walkIns: walkInsToday,
                completed: totalClients
            }))

        } catch (error) {
            console.error('Failed to fetch owner data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Handle marking a payout as paid
    const handleMarkAsPaid = async (payout: PayoutItem) => {
        const totalAmount = payout.commission + (payout.tips || 0)

        try {
            const res = await fetch('/api/owner/payouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    barberId: payout.barberId,
                    amount: totalAmount,
                    paymentMethod: 'CASH', // Default to cash
                    commissionAmount: payout.commission,
                    tipsAmount: payout.tips || 0,
                    note: `Daily payout: $${payout.commission} commission + $${payout.tips || 0} card tips`
                })
            })

            if (res.ok) {
                // Update local state to mark as paid
                setPayouts(prev => prev.map(p =>
                    p.barberId === payout.barberId
                        ? { ...p, status: 'paid' as const }
                        : p
                ))
                // Refresh data
                fetchData()
            } else {
                console.error('Failed to record payout')
            }
        } catch (error) {
            console.error('Error recording payout:', error)
        }
    }

    useEffect(() => {
        fetchData()
        // Refresh every 30 seconds
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="min-h-screen bg-gray-950 text-white pb-8">
            {/* Top Bar */}
            <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                            <Scissors className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-white">{shopName}</p>
                            <p className="text-gray-400 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg">
                            <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
                        >
                            <LogOut className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* Card 1: Today at a Glance */}
                <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-orange-100 text-sm font-medium">Today at a Glance</p>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${changePercent >= 0 ? 'bg-green-500/30 text-green-100' : 'bg-red-500/30 text-red-100'}`}>
                            {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}% vs yesterday
                        </div>
                    </div>
                    <p className="text-4xl font-black text-white mb-4">${totalRevenueToday.toLocaleString()}</p>

                    <div className="grid grid-cols-4 gap-2">
                        <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                            <p className="text-orange-100 text-[10px] uppercase">Services</p>
                            <p className="text-white font-bold">${(totalRevenueToday - totalRevenueTips).toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                            <p className="text-orange-100 text-[10px] uppercase">Tips</p>
                            <p className="text-white font-bold">${totalRevenueTips}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                            <p className="text-orange-100 text-[10px] uppercase">Clients</p>
                            <p className="text-white font-bold">{totalClients}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl px-3 py-2 text-center">
                            <p className="text-orange-100 text-[10px] uppercase">Walk-ins</p>
                            <p className="text-white font-bold">{walkInsToday}</p>
                        </div>
                    </div>
                </div>

                {/* Card 2: Who's Working Now */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-800">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            Who's Working Now
                        </h3>
                        <span className="text-gray-500 text-xs">{barbers.filter(b => b.status !== 'off').length} on floor</span>
                    </div>

                    <div className="divide-y divide-gray-800">
                        {barbers.filter(b => b.status !== 'off').map((barber) => (
                            <div key={barber.id} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                                            {barber.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${barber.status === 'on-shift' ? 'bg-green-500' : 'bg-yellow-500'
                                            }`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-white text-sm font-medium">{barber.name}</p>
                                            <span className="text-gray-600 text-xs">Chair {barber.chair}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            {barber.currentClient ? (
                                                <span className="text-purple-400">✂️ {barber.currentClient}</span>
                                            ) : barber.status === 'break' ? (
                                                <span className="text-yellow-400">☕ On Break</span>
                                            ) : (
                                                <span className="text-gray-500">Waiting for client</span>
                                            )}
                                            {barber.queueCount > 0 && (
                                                <span className="text-gray-500">• {barber.queueCount} waiting</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-400 font-bold text-sm">${barber.salesToday}</p>
                                    <p className="text-gray-500 text-xs">+${barber.tipsToday} tips</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card 3: What I Owe Today */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-green-400" />
                            What I Owe Today
                        </h3>
                        <button className="text-orange-400 text-sm font-medium">Process All</button>
                    </div>

                    <div className="flex gap-3 mb-4">
                        <div className="flex-1 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                            <p className="text-green-300 text-[10px] uppercase">Commission</p>
                            <p className="text-green-400 text-xl font-bold">${totalCommissionOwed}</p>
                        </div>
                        <div className="flex-1 bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-center">
                            <p className="text-purple-300 text-[10px] uppercase">Tips (Card)</p>
                            <p className="text-purple-400 text-xl font-bold">${totalTipsOwed}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {payouts.map((payout) => (
                            <div key={payout.barberId} className="flex items-center justify-between bg-gray-800/50 rounded-xl px-3 py-2.5">
                                <div>
                                    <p className="text-white text-sm font-medium">{payout.barberName}</p>
                                    <p className="text-gray-500 text-xs">
                                        Commission: ${payout.commission} • Tips: ${payout.tips}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-[10px] font-medium ${payout.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                        payout.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {payout.status.toUpperCase()}
                                    </span>
                                    {payout.status === 'pending' && (
                                        <button
                                            onClick={() => handleMarkAsPaid(payout)}
                                            className="p-1.5 bg-green-600 hover:bg-green-500 rounded-lg"
                                            title="Mark as Paid"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card 4: Appointments & Flow */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            Appointments & Flow
                        </h3>
                        <button className="text-orange-400 text-sm font-medium">View Schedule</button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-center">
                            <p className="text-blue-300 text-[10px] uppercase">Booked</p>
                            <p className="text-blue-400 text-2xl font-bold">{appointmentStats.booked}</p>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                            <p className="text-green-300 text-[10px] uppercase">Completed</p>
                            <p className="text-green-400 text-2xl font-bold">{appointmentStats.completed}</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
                            <p className="text-red-300 text-[10px] uppercase">No-Shows</p>
                            <p className="text-red-400 text-2xl font-bold">{appointmentStats.noShows}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1 bg-purple-500/10 rounded-lg p-2 text-center">
                            <p className="text-purple-300 text-[10px]">IN CHAIR</p>
                            <p className="text-purple-400 font-bold">{appointmentStats.inChair}</p>
                        </div>
                        <div className="flex-1 bg-yellow-500/10 rounded-lg p-2 text-center">
                            <p className="text-yellow-300 text-[10px]">ARRIVED</p>
                            <p className="text-yellow-400 font-bold">{appointmentStats.arrived}</p>
                        </div>
                        <div className="flex-1 bg-orange-500/10 rounded-lg p-2 text-center">
                            <p className="text-orange-300 text-[10px]">WALK-INS</p>
                            <p className="text-orange-400 font-bold">{appointmentStats.walkIns}</p>
                        </div>
                    </div>
                </div>

                {/* Issues to Fix */}
                {issues.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            Issues to Fix
                        </h3>

                        <div className="space-y-2">
                            {issues.map((issue) => (
                                <div key={issue.id} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${issue.type === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                                    issue.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                                        'bg-blue-500/10 border border-blue-500/30'
                                    }`}>
                                    <p className={`text-sm ${issue.type === 'critical' ? 'text-red-300' :
                                        issue.type === 'warning' ? 'text-yellow-300' :
                                            'text-blue-300'
                                        }`}>
                                        {issue.message}
                                    </p>
                                    {issue.action && (
                                        <button className="text-white text-xs font-medium bg-white/10 px-2 py-1 rounded">
                                            {issue.action}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
