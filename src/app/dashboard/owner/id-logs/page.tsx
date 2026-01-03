'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Shield, RefreshCw, Scan, AlertTriangle,
    CheckCircle, User, Store, Wine, Cigarette
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface IDLog {
    id: string
    transactionId: string
    timestamp: string
    employee: string
    employeeId: string | null
    location: string
    locationId: string | null
    type: 'SCANNED' | 'OVERRIDE'
    itemCount: number
    items: { name: string, isAlcohol: boolean, isTobacco: boolean, minimumAge: number }[]
    total: number
}

interface EmployeeStat {
    name: string
    scanned: number
    override: number
    overrideRate: string
}

export default function IDLogsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [logs, setLogs] = useState<IDLog[]>([])
    const [stats, setStats] = useState<any>(null)
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])
    const [selectedLocation, setSelectedLocation] = useState('all')
    const [selectedType, setSelectedType] = useState('all')
    const [selectedDays, setSelectedDays] = useState(7)

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('locationId', selectedLocation)
            params.set('type', selectedType)
            params.set('days', selectedDays.toString())

            const res = await fetch(`/api/owner/id-logs?${params}`)
            const data = await res.json()

            setLogs(data.logs || [])
            setStats(data.stats || null)
            setLocations(data.locations || [])
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [selectedLocation, selectedType, selectedDays])

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
                            <Scan className="h-8 w-8 text-indigo-500" />
                            ID Verification Logs
                        </h1>
                        <p className="text-stone-400">Track age verification on alcohol & tobacco sales</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-900/30 border border-emerald-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm text-stone-400">ID Scanned</span>
                    </div>
                    <p className="text-3xl font-bold">{stats?.scanned || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-600/30 to-amber-900/30 border border-amber-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        <span className="text-sm text-stone-400">Overrides</span>
                    </div>
                    <p className="text-3xl font-bold">{stats?.overrides || 0}</p>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-stone-400">Total Checks</span>
                    </div>
                    <p className="text-3xl font-bold">{stats?.totalChecks || 0}</p>
                </div>

                <div className={`rounded-2xl p-5 border ${parseFloat(stats?.overrideRate || '0') > 20
                        ? 'bg-red-500/20 border-red-500/30'
                        : 'bg-stone-900/80 border-stone-700'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`h-5 w-5 ${parseFloat(stats?.overrideRate || '0') > 20 ? 'text-red-400' : 'text-stone-400'}`} />
                        <span className="text-sm text-stone-400">Override Rate</span>
                    </div>
                    <p className={`text-3xl font-bold ${parseFloat(stats?.overrideRate || '0') > 20 ? 'text-red-400' : ''}`}>
                        {stats?.overrideRate || '0'}%
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6 flex-wrap">
                <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2"
                >
                    <option value="all">All Locations</option>
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>

                <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2"
                >
                    <option value="all">All Types</option>
                    <option value="scanned">Scanned</option>
                    <option value="override">Override</option>
                </select>

                <select
                    value={selectedDays}
                    onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                    className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2"
                >
                    <option value={7}>Last 7 Days</option>
                    <option value={14}>Last 14 Days</option>
                    <option value={30}>Last 30 Days</option>
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee Leaderboard */}
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-amber-400" />
                        Override by Employee
                    </h3>

                    {(stats?.byEmployee || []).length === 0 ? (
                        <div className="text-center py-8 text-stone-500">
                            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No data</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(stats?.byEmployee || []).slice(0, 10).map((emp: EmployeeStat, i: number) => (
                                <div key={emp.name} className={`p-3 rounded-xl ${parseFloat(emp.overrideRate) > 30 ? 'bg-red-500/10 border border-red-500/30' :
                                        parseFloat(emp.overrideRate) > 15 ? 'bg-amber-500/10 border border-amber-500/30' :
                                            'bg-stone-800'
                                    }`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">{emp.name}</span>
                                        <span className={`text-sm font-bold ${parseFloat(emp.overrideRate) > 30 ? 'text-red-400' :
                                                parseFloat(emp.overrideRate) > 15 ? 'text-amber-400' :
                                                    'text-emerald-400'
                                            }`}>
                                            {emp.overrideRate}% override
                                        </span>
                                    </div>
                                    <div className="text-xs text-stone-500 mt-1">
                                        {emp.scanned} scanned, {emp.override} overrides
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Logs */}
                <div className="lg:col-span-2 bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Scan className="h-5 w-5 text-indigo-400" />
                        Recent Checks ({logs.length})
                    </h3>

                    {logs.length === 0 ? (
                        <div className="text-center py-16 text-stone-500">
                            <Scan className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-xl">No ID checks found</p>
                            <p className="text-sm">Try extending the date range</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {logs.map(log => (
                                <div
                                    key={log.id}
                                    className={`p-4 rounded-xl border ${log.type === 'OVERRIDE'
                                            ? 'bg-amber-500/10 border-amber-500/30'
                                            : 'bg-stone-800 border-stone-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {log.type === 'SCANNED' ? (
                                                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                                                )}
                                                <span className={`text-sm font-bold ${log.type === 'SCANNED' ? 'text-emerald-400' : 'text-amber-400'
                                                    }`}>
                                                    {log.type}
                                                </span>
                                                <span className="text-stone-500">•</span>
                                                <span className="text-sm text-stone-400">{log.employee}</span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
                                                <span className="flex items-center gap-1">
                                                    <Store className="h-3 w-3" />
                                                    {log.location}
                                                </span>
                                                <span>
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-emerald-400 font-medium">
                                            {formatCurrency(log.total)}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {log.items.map((item, i) => (
                                            <span
                                                key={i}
                                                className="flex items-center gap-1 text-xs px-2 py-1 bg-stone-700 rounded"
                                            >
                                                {item.isAlcohol && <Wine className="h-3 w-3 text-purple-400" />}
                                                {item.isTobacco && <Cigarette className="h-3 w-3 text-amber-400" />}
                                                {item.name}
                                                <span className="text-stone-500">({item.minimumAge}+)</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

