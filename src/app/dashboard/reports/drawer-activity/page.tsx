'use client'

import { useState, useEffect } from 'react'
import {
    AlertTriangle,
    DollarSign,
    Clock,
    MapPin,
    User,
    Filter,
    Download,
    RefreshCw,
    ChevronDown,
    Eye,
    X,
    Search,
    Calendar,
    TrendingUp,
    AlertCircle
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

interface LocationStats {
    locationId: string
    locationName: string
    totalOpens: number
    noSaleCount: number
    alertLevel: string | null
}

// Reason labels
const REASON_LABELS: Record<string, { label: string, icon: string }> = {
    'make_change': { label: 'Make Change', icon: '💵' },
    'verify_cash': { label: 'Verify Drawer', icon: '🔢' },
    'error_correction': { label: 'Error Correction', icon: '✏️' },
    'give_receipt': { label: 'Give Receipt', icon: '🧾' },
    'cash_drop': { label: 'Cash Drop', icon: '🔒' },
    'manager_request': { label: 'Manager Request', icon: '👔' },
    'other': { label: 'Other', icon: '📝' }
}

export default function DrawerActivityPage() {
    const [activities, setActivities] = useState<DrawerActivity[]>([])
    const [locationStats, setLocationStats] = useState<LocationStats[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [filterType, setFilterType] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedActivity, setSelectedActivity] = useState<DrawerActivity | null>(null)

    useEffect(() => {
        fetchActivities()
    }, [selectedDate, filterType])

    const fetchActivities = async () => {
        setLoading(true)
        try {
            // In production, fetch from API
            // For now, use mock data
            const mockActivities: DrawerActivity[] = [
                {
                    id: '1',
                    type: 'NO_SALE',
                    reason: 'make_change',
                    note: null,
                    amount: null,
                    timestamp: new Date().toISOString(),
                    employee: { id: '1', name: 'John Smith', email: 'john@example.com' },
                    location: { id: 'loc1', name: 'Downtown Location' },
                    alertLevel: null
                },
                {
                    id: '2',
                    type: 'NO_SALE',
                    reason: 'verify_cash',
                    note: 'Manager requested mid-shift count',
                    amount: null,
                    timestamp: new Date(Date.now() - 3600000).toISOString(),
                    employee: { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com' },
                    location: { id: 'loc1', name: 'Downtown Location' },
                    alertLevel: null
                },
                {
                    id: '3',
                    type: 'NO_SALE',
                    reason: 'error_correction',
                    note: 'Accidentally hit wrong button',
                    amount: null,
                    timestamp: new Date(Date.now() - 7200000).toISOString(),
                    employee: { id: '1', name: 'John Smith', email: 'john@example.com' },
                    location: { id: 'loc2', name: 'Mall Location' },
                    alertLevel: 'WARNING'
                },
                {
                    id: '4',
                    type: 'NO_SALE',
                    reason: 'make_change',
                    note: null,
                    amount: null,
                    timestamp: new Date(Date.now() - 10800000).toISOString(),
                    employee: { id: '3', name: 'Mike Davis', email: 'mike@example.com' },
                    location: { id: 'loc2', name: 'Mall Location' },
                    alertLevel: null
                },
                {
                    id: '5',
                    type: 'SALE_OPEN',
                    reason: null,
                    note: null,
                    amount: 45.00,
                    timestamp: new Date(Date.now() - 14400000).toISOString(),
                    employee: { id: '1', name: 'John Smith', email: 'john@example.com' },
                    location: { id: 'loc1', name: 'Downtown Location' },
                    alertLevel: null
                }
            ]

            // Calculate location stats
            const stats: Record<string, LocationStats> = {}
            mockActivities.forEach(a => {
                const locId = a.location?.id || 'unknown'
                const locName = a.location?.name || 'Unknown'
                if (!stats[locId]) {
                    stats[locId] = { locationId: locId, locationName: locName, totalOpens: 0, noSaleCount: 0, alertLevel: null }
                }
                stats[locId].totalOpens++
                if (a.type === 'NO_SALE') stats[locId].noSaleCount++
                if (a.alertLevel) stats[locId].alertLevel = a.alertLevel
            })

            setActivities(mockActivities)
            setLocationStats(Object.values(stats))
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

            {/* Location Stats */}
            {locationStats.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-white mb-4">Activity by Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {locationStats.map(stat => (
                            <div
                                key={stat.locationId}
                                className={`glass-panel p-4 rounded-xl ${stat.alertLevel ? 'border-l-4 border-red-500' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-stone-400" />
                                        <span className="font-medium text-white">{stat.locationName}</span>
                                    </div>
                                    {stat.alertLevel && (
                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded">
                                            {stat.alertLevel}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-4">
                                    <div>
                                        <p className="text-xs text-stone-500">Total Opens</p>
                                        <p className="font-bold text-white">{stat.totalOpens}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500">No-Sales</p>
                                        <p className={`font-bold ${stat.noSaleCount > 5 ? 'text-amber-400' : 'text-stone-300'}`}>
                                            {stat.noSaleCount}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500">No-Sale %</p>
                                        <p className={`font-bold ${(stat.noSaleCount / stat.totalOpens * 100) > 30 ? 'text-red-400' : 'text-stone-300'}`}>
                                            {((stat.noSaleCount / stat.totalOpens) * 100).toFixed(0)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                                <td colSpan={7} className="p-8 text-center text-stone-500">
                                    No drawer activity found
                                </td>
                            </tr>
                        ) : (
                            filteredActivities.map(activity => (
                                <tr
                                    key={activity.id}
                                    className={`border-t border-stone-800 hover:bg-stone-800/30 transition-colors cursor-pointer ${activity.alertLevel ? 'bg-red-500/5' : ''
                                        }`}
                                    onClick={() => setSelectedActivity(activity)}
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
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 bg-stone-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                {activity.employee.name.charAt(0)}
                                            </div>
                                            <span className="text-white">{activity.employee.name}</span>
                                        </div>
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
                                    <td className="p-4">
                                        {activity.reason && REASON_LABELS[activity.reason] ? (
                                            <span className="flex items-center gap-2 text-stone-300">
                                                <span>{REASON_LABELS[activity.reason].icon}</span>
                                                {REASON_LABELS[activity.reason].label}
                                            </span>
                                        ) : (
                                            <span className="text-stone-500">-</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {activity.note ? (
                                            <span className="text-stone-400 text-sm truncate max-w-[150px] block">
                                                {activity.note}
                                            </span>
                                        ) : (
                                            <span className="text-stone-600">-</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {activity.alertLevel && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${activity.alertLevel === 'CRITICAL'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                <AlertCircle className="h-3 w-3" />
                                                {activity.alertLevel}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Activity Detail Modal */}
            {selectedActivity && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-lg bg-stone-900 rounded-2xl border border-stone-700 overflow-hidden">
                        <div className="p-4 border-b border-stone-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Drawer Activity Details</h3>
                            <button onClick={() => setSelectedActivity(null)} className="p-2 hover:bg-stone-800 rounded-lg text-stone-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Type</p>
                                    <span className={`px-3 py-1 rounded text-sm font-medium ${selectedActivity.type === 'NO_SALE'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                        {selectedActivity.type}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Time</p>
                                    <p className="text-white">{new Date(selectedActivity.timestamp).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Employee</p>
                                    <p className="text-white">{selectedActivity.employee.name}</p>
                                    <p className="text-xs text-stone-500">{selectedActivity.employee.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Location</p>
                                    <p className="text-white">{selectedActivity.location?.name || 'Unknown'}</p>
                                </div>
                            </div>
                            {selectedActivity.reason && (
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Reason</p>
                                    <p className="text-white flex items-center gap-2">
                                        {REASON_LABELS[selectedActivity.reason]?.icon}
                                        {REASON_LABELS[selectedActivity.reason]?.label || selectedActivity.reason}
                                    </p>
                                </div>
                            )}
                            {selectedActivity.note && (
                                <div>
                                    <p className="text-xs text-stone-500 mb-1">Note</p>
                                    <p className="text-stone-300 bg-stone-800 p-3 rounded-lg">{selectedActivity.note}</p>
                                </div>
                            )}
                            {selectedActivity.alertLevel && (
                                <div className={`p-4 rounded-lg ${selectedActivity.alertLevel === 'CRITICAL' ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className={`h-5 w-5 ${selectedActivity.alertLevel === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`} />
                                        <span className={`font-medium ${selectedActivity.alertLevel === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>
                                            {selectedActivity.alertLevel} Alert
                                        </span>
                                    </div>
                                    <p className="text-sm text-stone-400 mt-2">
                                        This activity triggered an alert due to unusual no-sale patterns.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
