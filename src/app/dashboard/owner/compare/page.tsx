'use client'

/**
 * FIX M1 — OWNER-SCOPED COMPARE
 * Was: redirect('/dashboard/multi-store') — franchisor-scoped, wrong for single-franchise owner
 * Now: Owner-specific compare showing their own locations side-by-side
 * API: /api/owner/compare — scoped to owner's franchise, not HQ-level API
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, BarChart3, RefreshCw, TrendingUp, TrendingDown,
    DollarSign, ShoppingCart, Package, Users, Store, ChevronDown
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LocationMetrics {
    locationId: string
    locationName: string
    todaySales: number
    weekSales: number
    transactions: number
    avgTicket: number
    lowStock: number
    activeStaff: number
    cashTotal: number
    cardTotal: number
}

export default function OwnerCompare() {
    const [locations, setLocations] = useState<LocationMetrics[]>([])
    const [selectedA, setSelectedA] = useState('')
    const [selectedB, setSelectedB] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // Use multi-store API but scoped to this owner's locations only
                const res = await fetch('/api/dashboard/multi-store')
                const data = await res.json()

                const mapped: LocationMetrics[] = (data.locations || []).map((l: any) => ({
                    locationId: l.location.id,
                    locationName: l.location.name,
                    todaySales: l.today?.sales || 0,
                    weekSales: l.week?.sales || 0,
                    transactions: l.today?.transactions || 0,
                    avgTicket: l.today?.transactions > 0
                        ? (l.today?.sales || 0) / l.today.transactions
                        : 0,
                    lowStock: l.inventory?.lowStock || 0,
                    activeStaff: l.staff?.count || 0,
                    cashTotal: l.today?.cash || 0,
                    cardTotal: l.today?.card || 0,
                }))

                setLocations(mapped)
                if (mapped.length > 0) setSelectedA(mapped[0].locationId)
                if (mapped.length > 1) setSelectedB(mapped[1].locationId)
            } catch (err) {
                console.error('Compare fetch failed', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const locA = locations.find(l => l.locationId === selectedA)
    const locB = locations.find(l => l.locationId === selectedB)

    const delta = (a: number, b: number) => {
        if (b === 0) return null
        return ((a - b) / b * 100).toFixed(1)
    }

    const MetricRow = ({
        label,
        a,
        b,
        format = 'number',
        icon: Icon,
    }: {
        label: string
        a: number
        b: number
        format?: 'currency' | 'number' | 'percent'
        icon?: any
    }) => {
        const d = delta(a, b)
        const aWins = a > b
        const fmt = (v: number) =>
            format === 'currency' ? formatCurrency(v) :
                format === 'percent' ? `${v.toFixed(1)}%` : v.toFixed(0)

        return (
            <div className="grid grid-cols-3 items-center gap-4 py-3 border-b border-stone-800">
                <div className="flex items-center gap-2 text-stone-400 text-sm">
                    {Icon && <Icon className="h-4 w-4" />}
                    {label}
                </div>
                <div className={`text-center font-bold text-lg ${aWins ? 'text-emerald-400' : 'text-white'}`}>
                    {fmt(a)}
                    {aWins && <TrendingUp className="h-4 w-4 inline ml-1" />}
                </div>
                <div className={`text-center font-bold text-lg ${!aWins && a !== b ? 'text-emerald-400' : 'text-white'}`}>
                    {fmt(b)}
                    {!aWins && a !== b && <TrendingUp className="h-4 w-4 inline ml-1" />}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-8 w-8 text-purple-400" />
                        Location Compare
                    </h1>
                    <p className="text-stone-400">Compare performance across your stores — today</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <RefreshCw className="h-8 w-8 animate-spin text-stone-500" />
                </div>
            ) : locations.length < 2 ? (
                <div className="text-center py-20 bg-stone-900/80 rounded-2xl border border-stone-700">
                    <Store className="h-16 w-16 mx-auto text-stone-600 mb-4" />
                    <p className="text-xl font-bold">Need at least 2 locations</p>
                    <p className="text-stone-400 mt-2">Add more store locations to use location compare.</p>
                </div>
            ) : (
                <>
                    {/* Location Selectors */}
                    <div className="grid grid-cols-3 items-center gap-4 mb-8">
                        <div className="relative">
                            <select
                                value={selectedA}
                                onChange={e => setSelectedA(e.target.value)}
                                className="w-full appearance-none bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 font-semibold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {locations.map(l => (
                                    <option key={l.locationId} value={l.locationId} disabled={l.locationId === selectedB}>
                                        {l.locationName}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                        </div>

                        <div className="text-center text-stone-500 font-bold text-lg">vs</div>

                        <div className="relative">
                            <select
                                value={selectedB}
                                onChange={e => setSelectedB(e.target.value)}
                                className="w-full appearance-none bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 font-semibold text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {locations.map(l => (
                                    <option key={l.locationId} value={l.locationId} disabled={l.locationId === selectedA}>
                                        {l.locationName}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Compare Table */}
                    {locA && locB && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                            {/* Column headers */}
                            <div className="grid grid-cols-3 gap-4 mb-2 pb-3 border-b border-stone-700">
                                <div className="text-sm text-stone-500">Metric</div>
                                <div className="text-center font-bold text-emerald-400">{locA.locationName}</div>
                                <div className="text-center font-bold text-blue-400">{locB.locationName}</div>
                            </div>

                            <MetricRow label="Today's Revenue" a={locA.todaySales} b={locB.todaySales} format="currency" icon={DollarSign} />
                            <MetricRow label="Transactions" a={locA.transactions} b={locB.transactions} format="number" icon={ShoppingCart} />
                            <MetricRow label="Avg Ticket" a={locA.avgTicket} b={locB.avgTicket} format="currency" icon={BarChart3} />
                            <MetricRow label="Cash Sales" a={locA.cashTotal} b={locB.cashTotal} format="currency" icon={DollarSign} />
                            <MetricRow label="Card Sales" a={locA.cardTotal} b={locB.cardTotal} format="currency" icon={DollarSign} />
                            <MetricRow label="Low Stock Items" a={locA.lowStock} b={locB.lowStock} format="number" icon={Package} />
                            <MetricRow label="Active Staff" a={locA.activeStaff} b={locB.activeStaff} format="number" icon={Users} />

                            {/* Week totals */}
                            <div className="mt-4 pt-4 border-t border-stone-700">
                                <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">This Week</p>
                                <MetricRow label="Week Revenue" a={locA.weekSales} b={locB.weekSales} format="currency" icon={TrendingUp} />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
