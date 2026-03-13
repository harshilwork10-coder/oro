'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    DollarSign, AlertTriangle, Wallet, Package,
    MapPin, RefreshCw, ChevronRight, ArrowLeft
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BriefingData {
    topIssues: any[]
    storeHealth: any[]
    recommendations: any[]
    counts: { open: number; escalated: number; totalActive: number }
    todaysPriority: any | null
}

export default function MobileBriefing() {
    const [briefing, setBriefing] = useState<BriefingData | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchBriefing = useCallback(async () => {
        try {
            const res = await fetch('/api/owner/briefing')
            const data = await res.json()
            setBriefing(data.briefing)
        } catch (err) {
            console.error('Failed to fetch briefing', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchBriefing() }, [fetchBriefing])

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-stone-500 animate-spin" />
            </div>
        )
    }

    const totalSales = briefing?.storeHealth.reduce((s, h) => s, 0) || 0
    const topIssue = briefing?.topIssues?.[0]
    const cashAlert = briefing?.topIssues.find(i => i.category === 'CASH')
    const stockAlert = briefing?.topIssues.find(i => i.category === 'INVENTORY')
    const visitRec = briefing?.recommendations?.[0]

    // Find worst health store
    const worstStore = briefing?.storeHealth
        ?.sort((a, b) => a.overallScore - b.overallScore)?.[0]

    return (
        <div className="min-h-screen bg-stone-950 text-white pb-8">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 flex items-center justify-between">
                <Link href="/dashboard/owner/briefing" className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="text-sm">Full View</span>
                </Link>
                <button onClick={fetchBriefing} className="text-stone-500 hover:text-amber-400 transition-colors">
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            <div className="px-4 mb-6">
                <h1 className="text-xl font-bold">Quick Brief</h1>
                <p className="text-stone-500 text-xs">5 things to know right now</p>
            </div>

            <div className="px-4 space-y-3">
                {/* Card 1: Sales Snapshot */}
                <div className="bg-gradient-to-br from-emerald-900/40 to-stone-900/80 border border-emerald-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs text-stone-400 uppercase tracking-wider">Today's Sales</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <p className="text-2xl font-bold">{briefing?.storeHealth.length || 0} stores active</p>
                        <span className="text-xs text-stone-500">
                            {briefing?.counts.totalActive || 0} issues
                        </span>
                    </div>
                    {/* Mini store status */}
                    <div className="flex gap-2 mt-3">
                        {briefing?.storeHealth.map(s => (
                            <div
                                key={s.locationId}
                                className={`flex-1 h-1.5 rounded-full ${
                                    s.overallStatus === 'GREEN' ? 'bg-emerald-500' :
                                        s.overallStatus === 'YELLOW' ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                title={`${s.locationName}: ${s.overallScore}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Card 2: Top Issue */}
                {topIssue ? (
                    <Link
                        href={`/dashboard/owner/briefing`}
                        className="block bg-gradient-to-br from-red-900/30 to-stone-900/80 border border-red-500/20 rounded-2xl p-5 hover:border-red-500/40 transition-all"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                            <span className="text-xs text-stone-400 uppercase tracking-wider">Biggest Exception</span>
                        </div>
                        <p className="font-semibold truncate">{topIssue.title}</p>
                        <p className="text-xs text-stone-400 mt-1 truncate">{topIssue.reasoning}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-red-400">
                            <span>View details</span>
                            <ChevronRight className="h-3 w-3" />
                        </div>
                    </Link>
                ) : (
                    <div className="bg-stone-900/60 border border-emerald-500/20 rounded-2xl p-5">
                        <p className="text-emerald-400 font-medium">✓ No exceptions</p>
                        <p className="text-xs text-stone-500">All stores running smoothly</p>
                    </div>
                )}

                {/* Card 3: Cash Alert */}
                {cashAlert ? (
                    <div className="bg-gradient-to-br from-amber-900/30 to-stone-900/80 border border-amber-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="h-4 w-4 text-amber-400" />
                            <span className="text-xs text-stone-400 uppercase tracking-wider">Cash Alert</span>
                        </div>
                        <p className="font-semibold truncate">{cashAlert.title}</p>
                        {cashAlert.financialImpact > 0 && (
                            <p className="text-amber-400 font-bold mt-1">{formatCurrency(cashAlert.financialImpact)} at risk</p>
                        )}
                    </div>
                ) : (
                    <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="h-4 w-4 text-stone-500" />
                            <span className="text-xs text-stone-400 uppercase tracking-wider">Cash</span>
                        </div>
                        <p className="text-emerald-400 text-sm">✓ No cash issues</p>
                    </div>
                )}

                {/* Card 4: Stock Emergency */}
                {stockAlert ? (
                    <div className="bg-gradient-to-br from-purple-900/30 to-stone-900/80 border border-purple-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="h-4 w-4 text-purple-400" />
                            <span className="text-xs text-stone-400 uppercase tracking-wider">Stock Emergency</span>
                        </div>
                        <p className="font-semibold truncate">{stockAlert.title}</p>
                        <p className="text-xs text-stone-400 mt-1">{stockAlert.recommended}</p>
                    </div>
                ) : (
                    <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <Package className="h-4 w-4 text-stone-500" />
                            <span className="text-xs text-stone-400 uppercase tracking-wider">Inventory</span>
                        </div>
                        <p className="text-emerald-400 text-sm">✓ Stock levels OK</p>
                    </div>
                )}

                {/* Card 5: Recommended Visit */}
                {visitRec ? (
                    <div className="bg-gradient-to-br from-blue-900/30 to-stone-900/80 border border-blue-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-blue-400" />
                            <span className="text-xs text-stone-400 uppercase tracking-wider">Recommended</span>
                        </div>
                        <p className="font-semibold">{visitRec.action}</p>
                        <p className="text-xs text-stone-400 mt-1">{visitRec.reason}</p>
                    </div>
                ) : (
                    <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-stone-500" />
                            <span className="text-xs text-stone-400 uppercase tracking-wider">Store Visit</span>
                        </div>
                        <p className="text-emerald-400 text-sm">✓ No visit needed today</p>
                    </div>
                )}
            </div>
        </div>
    )
}
