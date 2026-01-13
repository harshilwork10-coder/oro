'use client'

import { useState, useEffect } from 'react'
import {
    DollarSign,
    Clock,
    MapPin,
    RefreshCw,
    Download,
    Search,
    Calendar,
} from 'lucide-react'

interface DrawerActivity {
    id: string
    type: string
    reason: string | null
    note: string | null
    amount: number | null
    timestamp: string
    employee: {
        id: string
        name: string
        email: string
    }
    location?: {
        id: string
        name: string
    }
    alertLevel: string | null
}

export default function DrawerActivityPage() {
    const [activities, setActivities] = useState<DrawerActivity[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [filterType, setFilterType] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchActivities()
    }, [selectedDate, filterType])

    const fetchActivities = async () => {
        setLoading(true)
        try {
            // Real API integration pending
            // const res = await fetch(`/api/reports/drawer-activity?date=${selectedDate}`)
            // const data = await res.json()
            // setActivities(data.activities)
            setActivities([])
        } catch (error) {
            console.error('Failed to fetch activities:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredActivities = activities.filter(a => {
        if (filterType !== 'all' && a.type !== filterType) return false
        if (searchTerm) {
            const search = searchTerm.toLowerCase()
            return (
                a.employee.name.toLowerCase().includes(search) ||
                a.location?.name.toLowerCase().includes(search) ||
                a.reason?.toLowerCase().includes(search)
            )
        }
        return true
    })

    const summary = {
        totalOpens: activities.length,
        noSaleCount: activities.filter(a => a.type === 'NO_SALE').length,
        saleOpens: activities.filter(a => a.type === 'SALE_OPEN').length,
        alerts: activities.filter(a => a.alertLevel).length
    }

    return (
        <div className="p-4 md:p-8 bg-stone-950 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-orange-500" />
                        Drawer Activity Monitor
                    </h1>
                    <p className="text-stone-400 mt-2">Track all drawer opens across locations • Detect fraud patterns</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <button
                        onClick={fetchActivities}
                        className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>
                    <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-white flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-sm text-stone-400">Total Drawer Opens</p>
                    <p className="text-2xl font-bold text-white">{summary.totalOpens}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-amber-500">
                    <p className="text-sm text-stone-400">No-Sale Opens</p>
                    <p className="text-2xl font-bold text-amber-400">{summary.noSaleCount}</p>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <p className="text-sm text-stone-400">Sale Opens</p>
                    <p className="text-2xl font-bold text-emerald-400">{summary.saleOpens}</p>
                </div>
                <div className={`glass-panel p-4 rounded-xl ${summary.alerts > 0 ? 'border-l-4 border-red-500' : ''}`}>
                    <p className="text-sm text-stone-400">Alerts</p>
                    <p className={`text-2xl font-bold ${summary.alerts > 0 ? 'text-red-400' : 'text-stone-500'}`}>
                        {summary.alerts}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-panel p-4 rounded-xl mb-6 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by employee, location, reason..."
                        className="w-full pl-10 pr-4 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder:text-stone-500"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'all' ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterType('NO_SALE')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'NO_SALE' ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                            }`}
                    >
                        No-Sales Only
                    </button>
                    <button
                        onClick={() => setFilterType('SALE_OPEN')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filterType === 'SALE_OPEN' ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                            }`}
                    >
                        Sales Only
                    </button>
                </div>
            </div>

            {/* Activity Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-stone-800/50 text-stone-400 text-sm">
                            <th className="text-left p-4">Time</th>
                            <th className="text-left p-4">Employee</th>
                            <th className="text-left p-4">Location</th>
                            <th className="text-left p-4">Type</th>
                            <th className="text-left p-4">Reason</th>
                            <th className="text-left p-4">Note</th>
                            <th className="text-center p-4">Alert</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-stone-500">
                                    Loading...
                                </td>
                            </tr>
                        ) : filteredActivities.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center">
                                    <DollarSign className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                                    <p className="text-stone-400 font-medium">No Drawer Activity</p>
                                    <p className="text-stone-500 text-sm mt-1">
                                        Drawer activity will appear here when transactions occur.
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filteredActivities.map(activity => (
                                <tr
                                    key={activity.id}
                                    className={`border-t border-stone-800 hover:bg-stone-800/30 transition-colors ${activity.alertLevel ? 'bg-red-500/5' : ''}`}
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-stone-500" />
                                            <span className="text-white">
                                                {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-white">{activity.employee.name}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-stone-300">{activity.location?.name || '-'}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${activity.type === 'NO_SALE'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                            {activity.type === 'NO_SALE' ? '⚠️ No-Sale' : '✅ Sale'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-stone-400">{activity.reason || '-'}</td>
                                    <td className="p-4 text-stone-400">{activity.note || '-'}</td>
                                    <td className="p-4 text-center text-stone-500">-</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

