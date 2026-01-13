'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
    DollarSign,
    Clock,
    User,
    Users,
    ChevronRight,
    Search,
    Plus,
    LogOut,
    Coffee,
    Play,
    Check,
    X,
    AlertTriangle,
    Scissors,
    Phone,
    Calendar,
    RefreshCw
} from 'lucide-react'

// Types
interface Earnings {
    commission: number
    tips: number
    tipsCash: number
    tipsCard: number
    services: number
    clients: number
    pending: number
    weekTotal: number
    monthTotal: number
}

interface NextClient {
    id: string
    name: string
    service: string
    time: string
    timeUntil: string
    isNew: boolean
    phone?: string
    notes?: string
}

interface QueueItem {
    id: string
    time: string
    clientName: string
    service: string
    status: 'booked' | 'arrived' | 'in-chair' | 'done' | 'no-show'
}

interface RecentClient {
    id: string
    name: string
    lastVisit: string
    usualService: string
    phone?: string
}

export default function BarberDashboard() {
    const { data: session } = useSession()
    const [shiftStatus, setShiftStatus] = useState<'off' | 'on' | 'break'>('off')
    const [clockInTime, setClockInTime] = useState<string | null>(null)
    const [hoursToday, setHoursToday] = useState(0)

    // Price editing state
    const [editingPrices, setEditingPrices] = useState(false)
    const [savingPrices, setSavingPrices] = useState(false)
    const [canSetPrices, setCanSetPrices] = useState(false)
    const [loadingPrices, setLoadingPrices] = useState(true)
    const [myPrices, setMyPrices] = useState<{
        id: string
        name: string
        defaultPrice: number
        myPrice: number | null
    }[]>([])

    // Fetch real services from API on mount
    useEffect(() => {
        const fetchMyPrices = async () => {
            try {
                const res = await fetch('/api/barber/my-prices')
                if (res.ok) {
                    const data = await res.json()
                    setCanSetPrices(data.canSetPrices || false)
                    setMyPrices(data.services || [])
                }
            } catch (error) {
                console.error('Error fetching prices:', error)
            } finally {
                setLoadingPrices(false)
            }
        }
        fetchMyPrices()
    }, [])

    const handlePriceChange = (serviceId: string, value: string) => {
        setMyPrices(prev => prev.map(p =>
            p.id === serviceId
                ? { ...p, myPrice: value === '' ? null : parseFloat(value) }
                : p
        ))
    }

    const savePrices = async () => {
        setSavingPrices(true)
        try {
            // Save each price override
            for (const price of myPrices) {
                await fetch('/api/barber/my-prices', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serviceId: price.id,
                        price: price.myPrice
                    })
                })
            }
            setEditingPrices(false)
        } catch (error) {
            console.error('Error saving prices:', error)
        } finally {
            setSavingPrices(false)
        }
    }

    // Demo data
    const earnings: Earnings = {
        commission: 180,
        tips: 45,
        tipsCash: 25,
        tipsCard: 20,
        services: 6,
        clients: 5,
        pending: 40,
        weekTotal: 890,
        monthTotal: 3420
    }

    const nextClient: NextClient | null = {
        id: '1',
        name: 'Marcus Johnson',
        service: 'Low Fade + Beard',
        time: '2:30 PM',
        timeUntil: '12 min',
        isNew: false,
        phone: '(555) 123-4567',
        notes: 'Likes it short on sides, #2 guard'
    }

    const todayQueue: QueueItem[] = [
        { id: '1', time: '10:00 AM', clientName: 'Chris Williams', service: 'Haircut', status: 'done' },
        { id: '2', time: '10:45 AM', clientName: 'James Brown', service: 'Fade + Lineup', status: 'done' },
        { id: '3', time: '11:30 AM', clientName: 'Mike Davis', service: 'Beard Trim', status: 'done' },
        { id: '4', time: '12:15 PM', clientName: 'Walk-in', service: 'Haircut', status: 'done' },
        { id: '5', time: '1:00 PM', clientName: 'Anthony Garcia', service: 'Full Service', status: 'done' },
        { id: '6', time: '2:30 PM', clientName: 'Marcus Johnson', service: 'Low Fade + Beard', status: 'booked' },
        { id: '7', time: '3:15 PM', clientName: 'Derek Thompson', service: 'Haircut', status: 'booked' },
    ]

    const recentClients: RecentClient[] = [
        { id: '1', name: 'Chris Williams', lastVisit: '2 weeks ago', usualService: 'Low Fade', phone: '(555) 111-2222' },
        { id: '2', name: 'James Brown', lastVisit: '3 weeks ago', usualService: 'High Top Fade', phone: '(555) 333-4444' },
        { id: '3', name: 'Mike Davis', lastVisit: '1 week ago', usualService: 'Beard Trim Only', phone: '(555) 555-6666' },
    ]

    const handleClockIn = () => {
        setShiftStatus('on')
        setClockInTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
    }

    const handleClockOut = () => {
        setShiftStatus('off')
        setClockInTime(null)
    }

    const handleBreak = () => {
        setShiftStatus(shiftStatus === 'break' ? 'on' : 'break')
    }

    const barberName = session?.user?.name || 'Barber'
    const takeHome = earnings.commission + earnings.tips

    const statusColors = {
        'booked': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'arrived': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        'in-chair': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        'done': 'bg-green-500/20 text-green-400 border-green-500/30',
        'no-show': 'bg-red-500/20 text-red-400 border-red-500/30',
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white pb-24">
            {/* Top Bar */}
            <div className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold">
                            {barberName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                            <p className="font-semibold text-white">{barberName}</p>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${shiftStatus === 'on' ? 'bg-green-500/20 text-green-400' :
                                shiftStatus === 'break' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-gray-700 text-gray-400'
                                }`}>
                                {shiftStatus === 'on' && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
                                {shiftStatus === 'on' ? `On Shift since ${clockInTime}` :
                                    shiftStatus === 'break' ? 'On Break' : 'Off Shift'}
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                        {shiftStatus === 'off' ? (
                            <button
                                onClick={handleClockIn}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-semibold text-sm flex items-center gap-2"
                            >
                                <Play className="w-4 h-4" /> Clock In
                            </button>
                        ) : (
                            <button
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-400 rounded-xl font-semibold text-sm flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Walk-in
                            </button>
                        )}
                        <button
                            onClick={() => signOut({ callbackUrl: '/staff-login' })}
                            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
                        >
                            <LogOut className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* Card 1: Today's Earnings */}
                <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-green-100 text-sm font-medium">Today's Earnings</p>
                        <span className="text-green-100/70 text-xs">Tap for details →</span>
                    </div>
                    <p className="text-4xl font-black text-white mb-4">${takeHome.toFixed(2)}</p>

                    <div className="flex gap-2 mb-3">
                        <div className="flex-1 bg-white/10 rounded-xl px-3 py-2">
                            <p className="text-green-100 text-[10px] uppercase">Commission</p>
                            <p className="text-white font-bold">${earnings.commission}</p>
                        </div>
                        <div className="flex-1 bg-white/10 rounded-xl px-3 py-2">
                            <p className="text-green-100 text-[10px] uppercase">Tips</p>
                            <p className="text-white font-bold">${earnings.tips}</p>
                        </div>
                        <div className="flex-1 bg-white/10 rounded-xl px-3 py-2">
                            <p className="text-green-100 text-[10px] uppercase">Clients</p>
                            <p className="text-white font-bold">{earnings.clients}</p>
                        </div>
                    </div>

                    {earnings.pending > 0 && (
                        <p className="text-green-200/80 text-xs">
                            Pending: ${earnings.pending} (completed, not yet paid)
                        </p>
                    )}
                </div>

                {/* Card 2: Who's Next */}
                {nextClient ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                Who's Next
                            </h3>
                            <span className="text-blue-400 text-sm font-medium">in {nextClient.timeUntil}</span>
                        </div>

                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                    {nextClient.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-white font-semibold">{nextClient.name}</p>
                                        {nextClient.isNew ? (
                                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded font-medium">NEW</span>
                                        ) : (
                                            <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 text-[10px] rounded font-medium">RETURNING</span>
                                        )}
                                    </div>
                                    <p className="text-gray-400 text-sm">{nextClient.service}</p>
                                    <p className="text-gray-500 text-xs">{nextClient.time}</p>
                                </div>
                            </div>
                        </div>

                        {nextClient.notes && (
                            <div className="bg-gray-800/50 rounded-lg px-3 py-2 mb-4">
                                <p className="text-gray-400 text-xs">📝 {nextClient.notes}</p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-xl">
                                Arrived
                            </button>
                            <button className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl">
                                Start
                            </button>
                            <button className="py-3 px-4 bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                        <p className="text-gray-400 mb-3">No clients scheduled</p>
                        <button className="px-6 py-3 bg-orange-500 hover:bg-orange-400 rounded-xl font-semibold">
                            + Add Walk-in
                        </button>
                    </div>
                )}

                {/* Today's Queue */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-800">
                        <h3 className="text-sm font-semibold text-white">Today's Queue</h3>
                        <span className="text-gray-500 text-xs">{todayQueue.length} clients</span>
                    </div>
                    <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
                        {todayQueue.map((item) => (
                            <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50">
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-500 text-xs w-16">{item.time}</span>
                                    <div>
                                        <p className="text-white text-sm">{item.clientName}</p>
                                        <p className="text-gray-500 text-xs">{item.service}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-medium border ${statusColors[item.status]}`}>
                                    {item.status.replace('-', ' ').toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Clients */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-400" />
                            My Clients
                        </h3>
                        <button className="text-orange-400 text-sm">View All</button>
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search client name or phone..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    <p className="text-gray-500 text-xs mb-2">Recent Clients</p>
                    <div className="space-y-2">
                        {recentClients.map((client) => (
                            <div key={client.id} className="flex items-center justify-between bg-gray-800/50 rounded-xl px-3 py-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-medium">
                                        {client.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="text-white text-sm">{client.name}</p>
                                        <p className="text-gray-500 text-xs">Usually: {client.usualService} • {client.lastVisit}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Shift Card */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-400" />
                            My Shift
                        </h3>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-4">
                        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                            <p className="text-gray-500 text-[10px]">TODAY</p>
                            <p className="text-white font-bold">6h 30m</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                            <p className="text-gray-500 text-[10px]">THIS WEEK</p>
                            <p className="text-white font-bold">32h</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                            <p className="text-gray-500 text-[10px]">CUTS TODAY</p>
                            <p className="text-white font-bold">{earnings.services}</p>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                            <p className="text-gray-500 text-[10px]">AVG TICKET</p>
                            <p className="text-white font-bold">${(takeHome / earnings.clients).toFixed(0)}</p>
                        </div>
                    </div>

                    {shiftStatus !== 'off' && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleBreak}
                                className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 ${shiftStatus === 'break'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    }`}
                            >
                                <Coffee className="w-4 h-4" />
                                {shiftStatus === 'break' ? 'End Break' : 'Take Break'}
                            </button>
                            <button
                                onClick={handleClockOut}
                                className="flex-1 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-semibold flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Clock Out
                            </button>
                        </div>
                    )}
                </div>

                {/* My Prices - Booth Renter / Commission Barber */}
                {loadingPrices ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : canSetPrices && myPrices.length > 0 ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                My Prices
                            </h3>
                            <button
                                onClick={() => setEditingPrices(!editingPrices)}
                                className={`text-sm font-medium ${editingPrices ? 'text-green-400' : 'text-orange-400'}`}
                            >
                                {editingPrices ? 'Done Editing' : 'Edit Prices'}
                            </button>
                        </div>

                        <p className="text-gray-500 text-xs mb-3">
                            {editingPrices
                                ? 'Tap a price to edit. Leave blank to use shop default.'
                                : 'These are YOUR prices. When you do a service, POS uses your prices.'}
                        </p>

                        <div className="space-y-2">
                            {myPrices.map((item) => (
                                <div key={item.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                                    <div>
                                        <p className="text-white text-sm">{item.name}</p>
                                        <p className="text-gray-500 text-xs">Shop default: ${item.defaultPrice}</p>
                                    </div>
                                    {editingPrices ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">$</span>
                                            <input
                                                type="number"
                                                value={item.myPrice ?? ''}
                                                onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                                placeholder={String(item.defaultPrice)}
                                                className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-right text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-right">
                                            <p className={`font-bold ${item.myPrice ? 'text-green-400' : 'text-gray-400'}`}>
                                                ${item.myPrice ?? item.defaultPrice}
                                            </p>
                                            {item.myPrice && item.myPrice > item.defaultPrice && (
                                                <p className="text-green-400 text-xs">+${item.myPrice - item.defaultPrice}</p>
                                            )}
                                            {!item.myPrice && (
                                                <p className="text-gray-500 text-xs">Using default</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {editingPrices && (
                            <button
                                onClick={savePrices}
                                disabled={savingPrices}
                                className="w-full mt-3 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-semibold flex items-center justify-center gap-2"
                            >
                                {savingPrices ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Save My Prices
                                    </>
                                )}
                            </button>
                        )}

                        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-300 text-xs">
                                💡 <strong>How it works:</strong> When you start a service at the POS, it automatically uses YOUR prices based on who's doing the cut.
                            </p>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Alerts */}
            {shiftStatus === 'on' && (
                <div className="fixed bottom-20 left-4 right-4 space-y-2">
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                        <p className="text-yellow-200 text-sm">You're running 15 mins behind schedule</p>
                    </div>
                </div>
            )}
        </div>
    )
}
