'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, AlertTriangle, AlertCircle, Info, RefreshCw,
    CheckCircle, Eye, X, Store, Clock, Filter
} from 'lucide-react'

interface Exception {
    id: string
    type: string
    severity: string
    title: string
    description: string
    status: string
    locationId: string
    locationName: string
    createdAt: string
    stored: boolean
}

export default function ExceptionsCenter() {
    const { data: session } = useSession()
    const [exceptions, setExceptions] = useState<Exception[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'WARNING' | 'INFO'>('all')
    const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0, total: 0 })
    const [selectedLocation, setSelectedLocation] = useState('all')
    const [locations, setLocations] = useState<{ id: string, name: string }[]>([])

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (selectedLocation !== 'all') params.set('locationId', selectedLocation)

            const res = await fetch(`/api/owner/exceptions?${params}`)
            const data = await res.json()

            setExceptions(data.exceptions || [])
            setCounts(data.counts || { critical: 0, warning: 0, info: 0, total: 0 })

            // Extract unique locations
            const uniqueLocations = new Map()
            data.exceptions?.forEach((ex: Exception) => {
                if (!uniqueLocations.has(ex.locationId)) {
                    uniqueLocations.set(ex.locationId, { id: ex.locationId, name: ex.locationName })
                }
            })
            setLocations(Array.from(uniqueLocations.values()))
        } catch (error) {
            console.error('Failed to fetch exceptions:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
        return () => clearInterval(interval)
    }, [selectedLocation])

    const handleAcknowledge = async (exceptionId: string) => {
        try {
            await fetch('/api/owner/exceptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exceptionId, action: 'ACKNOWLEDGE' })
            })
            fetchData()
        } catch (error) {
            console.error('Failed to acknowledge:', error)
        }
    }

    const handleResolve = async (exceptionId: string, note?: string) => {
        try {
            await fetch('/api/owner/exceptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exceptionId, action: 'RESOLVE', note })
            })
            fetchData()
        } catch (error) {
            console.error('Failed to resolve:', error)
        }
    }

    const filteredExceptions = filter === 'all'
        ? exceptions
        : exceptions.filter(ex => ex.severity === filter)

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return <AlertTriangle className="h-5 w-5 text-red-400" />
            case 'WARNING': return <AlertCircle className="h-5 w-5 text-amber-400" />
            default: return <Info className="h-5 w-5 text-blue-400" />
        }
    }

    const getSeverityClass = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'bg-red-500/10 border-red-500/30'
            case 'WARNING': return 'bg-amber-500/10 border-amber-500/30'
            default: return 'bg-blue-500/10 border-blue-500/30'
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
                            <AlertTriangle className="h-8 w-8 text-amber-500" />
                            Exceptions Center
                        </h1>
                        <p className="text-stone-400">All alerts and issues across your stores</p>
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
                <button
                    onClick={() => setFilter('all')}
                    className={`rounded-2xl p-4 border transition-all ${filter === 'all' ? 'bg-orange-500/20 border-orange-500' : 'bg-stone-900/80 border-stone-700 hover:border-stone-500'
                        }`}
                >
                    <p className="text-sm text-stone-400">All</p>
                    <p className="text-3xl font-bold">{counts.total}</p>
                </button>
                <button
                    onClick={() => setFilter('CRITICAL')}
                    className={`rounded-2xl p-4 border transition-all ${filter === 'CRITICAL' ? 'bg-red-500/20 border-red-500' : 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                        }`}
                >
                    <p className="text-sm text-red-400">Critical</p>
                    <p className="text-3xl font-bold text-red-400">{counts.critical}</p>
                </button>
                <button
                    onClick={() => setFilter('WARNING')}
                    className={`rounded-2xl p-4 border transition-all ${filter === 'WARNING' ? 'bg-amber-500/20 border-amber-500' : 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50'
                        }`}
                >
                    <p className="text-sm text-amber-400">Warning</p>
                    <p className="text-3xl font-bold text-amber-400">{counts.warning}</p>
                </button>
                <button
                    onClick={() => setFilter('INFO')}
                    className={`rounded-2xl p-4 border transition-all ${filter === 'INFO' ? 'bg-blue-500/20 border-blue-500' : 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50'
                        }`}
                >
                    <p className="text-sm text-blue-400">Info</p>
                    <p className="text-3xl font-bold text-blue-400">{counts.info}</p>
                </button>
            </div>

            {/* Location Filter */}
            {locations.length > 1 && (
                <div className="flex items-center gap-3 mb-6">
                    <Filter className="h-5 w-5 text-stone-500" />
                    <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="all">All Locations</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Exceptions List */}
            {loading && exceptions.length === 0 ? (
                <div className="text-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-stone-500 mb-4" />
                    <p className="text-stone-400">Loading exceptions...</p>
                </div>
            ) : filteredExceptions.length === 0 ? (
                <div className="text-center py-16 bg-stone-900/80 rounded-2xl border border-stone-700">
                    <CheckCircle className="h-16 w-16 mx-auto text-emerald-500 mb-4" />
                    <p className="text-xl font-bold text-emerald-400">All Clear!</p>
                    <p className="text-stone-400 mt-2">No {filter !== 'all' ? filter.toLowerCase() : ''} exceptions found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredExceptions.map(ex => (
                        <div
                            key={ex.id}
                            className={`rounded-2xl p-5 border transition-all ${getSeverityClass(ex.severity)}`}
                        >
                            <div className="flex items-start gap-4">
                                <div className="pt-1">
                                    {getSeverityIcon(ex.severity)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg">{ex.title}</h3>
                                            <p className="text-stone-400 text-sm mt-1">{ex.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full ${ex.severity === 'CRITICAL' ? 'bg-red-500/30 text-red-300' :
                                                    ex.severity === 'WARNING' ? 'bg-amber-500/30 text-amber-300' :
                                                        'bg-blue-500/30 text-blue-300'
                                                }`}>
                                                {ex.severity}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-3 text-sm text-stone-500">
                                        <span className="flex items-center gap-1">
                                            <Store className="h-4 w-4" />
                                            {ex.locationName}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-4 w-4" />
                                            {new Date(ex.createdAt).toLocaleTimeString()}
                                        </span>
                                        <span className="px-2 py-0.5 bg-stone-700 rounded text-xs">
                                            {ex.type.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    {ex.stored && ex.status !== 'RESOLVED' && (
                                        <div className="flex gap-2 mt-4">
                                            {ex.status !== 'ACKNOWLEDGED' && (
                                                <button
                                                    onClick={() => handleAcknowledge(ex.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    Acknowledge
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleResolve(ex.id)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                                Resolve
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
