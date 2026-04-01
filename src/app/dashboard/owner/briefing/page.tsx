'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    Zap, AlertTriangle, Shield, CheckCircle, Clock, ArrowRight,
    MapPin, TrendingDown, DollarSign, Package, Users, Eye,
    RefreshCw, Bell, ChevronRight, Timer, Target
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Issue {
    id: string
    title: string
    summary: string
    severity: string
    status: string
    issueType: string
    category: string
    priorityScore: number
    financialImpact: number
    reasoning: string
    recommended: string
    ageHours: number
    repeatCount: number
    locationId: string
    locationName: string
    assignedToName: string | null
    dueAt: string | null
    version: number
}

interface StoreHealth {
    locationId: string
    locationName: string
    overallScore: number
    overallStatus: string
    salesHealth: number
    cashHealth: number
    laborHealth: number
    inventoryHealth: number
    complianceHealth: number
    lpHealth: number
}

interface Recommendation {
    rank: number
    action: string
    actionType: string
    ownerScope: string
    reason: string
    issueIds: string[]
}

interface BriefingData {
    topIssues: Issue[]
    storeHealth: StoreHealth[]
    recommendations: Recommendation[]
    counts: { open: number; escalated: number; totalActive: number }
    todaysPriority: Recommendation | null
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    CRITICAL: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-500', border: 'border-red-500/30' },
    HIGH: { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-500', border: 'border-orange-500/30' },
    MEDIUM: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-500', border: 'border-amber-500/30' },
    LOW: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-500', border: 'border-blue-500/30' },
}

const HEALTH_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
    GREEN: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    YELLOW: { bg: 'bg-amber-500/20', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    RED: { bg: 'bg-red-500/20', text: 'text-red-400', glow: 'shadow-red-500/20' },
}

const SNOOZE_OPTIONS = [
    { label: '1 hour', minutes: 60 },
    { label: '4 hours', minutes: 240 },
    { label: 'Tomorrow', minutes: 1440 },
]

export default function BriefingCommandCenter() {
    const { data: session } = useSession()
    const [briefing, setBriefing] = useState<BriefingData | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [lastRefresh, setLastRefresh] = useState(new Date())

    const fetchBriefing = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/owner/briefing')
            const data = await res.json()
            setBriefing(data.briefing)
            setLastRefresh(new Date())
        } catch (err) {
            console.error('Failed to fetch briefing', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBriefing()
        const interval = setInterval(fetchBriefing, 60000) // Auto-refresh every 60s
        return () => clearInterval(interval)
    }, [fetchBriefing])

    const handleAction = async (issueId: string, action: string, extra?: any) => {
        setActionLoading(issueId)
        try {
            const issue = briefing?.topIssues.find(i => i.id === issueId)
            await fetch(`/api/owner/issues/${issueId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    expectedVersion: issue?.version,
                    ...extra,
                }),
            })
            await fetchBriefing() // Refresh after action
        } catch (err) {
            console.error('Action failed', err)
        } finally {
            setActionLoading(null)
        }
    }

    const formatAge = (hours: number): string => {
        if (hours < 1) return `${Math.round(hours * 60)}m`
        if (hours < 24) return `${Math.round(hours)}h`
        return `${Math.round(hours / 24)}d`
    }

    if (loading && !briefing) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="flex items-center gap-3 text-stone-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading command center...</span>
                </div>
            </div>
        )
    }

    const priority = briefing?.todaysPriority

    return (
        <div className="min-h-screen bg-stone-950 text-white">
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <Zap className="h-7 w-7 text-amber-400" />
                            Morning Briefing
                        </h1>
                        <p className="text-stone-400 text-sm mt-1">
                            Last updated {lastRefresh.toLocaleTimeString()} ·{' '}
                            <button onClick={fetchBriefing} className="text-amber-400 hover:underline">
                                Refresh
                            </button>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-2 text-sm">
                            <span className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                                {briefing?.counts.escalated || 0} escalated
                            </span>
                            <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                {briefing?.counts.open || 0} open
                            </span>
                            <span className="px-3 py-1.5 rounded-full bg-stone-700/50 text-stone-300">
                                {briefing?.counts.totalActive || 0} total
                            </span>
                        </div>
                    </div>
                </div>

                {/* Today's Priority Banner */}
                {priority && (
                    <div className="bg-gradient-to-r from-amber-900/40 via-amber-800/20 to-transparent border border-amber-500/30 rounded-2xl p-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-amber-500/20">
                                    <Target className="h-6 w-6 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-amber-400/70 font-medium uppercase tracking-wider mb-1">
                                        Today's Priority
                                    </p>
                                    <p className="text-xl font-bold text-white">{priority.action}</p>
                                    <p className="text-stone-400 text-sm mt-1">{priority.reason}</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/owner/exceptions"
                                className="px-4 py-2 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-400 transition-colors text-sm"
                            >
                                View Exceptions →
                            </Link>
                        </div>
                    </div>
                )}

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Top Issues (2/3 width) */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-400" />
                                Top Issues
                            </h2>
                            <Link
                                href="/dashboard/owner/exceptions"
                                className="text-sm text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                            >
                                View all <ArrowRight className="h-3 w-3" />
                            </Link>
                        </div>

                        {briefing?.topIssues.length === 0 ? (
                            <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-8 text-center">
                                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                                <p className="text-lg font-semibold">All clear!</p>
                                <p className="text-stone-400 text-sm">No active issues across your stores</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {briefing?.topIssues.slice(0, 5).map((issue) => {
                                    const sev = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.MEDIUM
                                    const isActioning = actionLoading === issue.id

                                    return (
                                        <div
                                            key={issue.id}
                                            className={`bg-stone-900/60 border ${sev.border} rounded-2xl p-5 hover:bg-stone-900/80 transition-all`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    {/* Header row */}
                                                    <div className="flex items-center gap-2 mb-1.5">
                                                        <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
                                                            {issue.severity}
                                                        </span>
                                                        <span className="text-xs text-stone-500">·</span>
                                                        <span className="text-xs text-stone-400 flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {issue.locationName}
                                                        </span>
                                                        <span className="text-xs text-stone-500">·</span>
                                                        <span className="text-xs text-stone-500 flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {formatAge(issue.ageHours)} ago
                                                        </span>
                                                        {issue.repeatCount > 1 && (
                                                            <>
                                                                <span className="text-xs text-stone-500">·</span>
                                                                <span className="text-xs text-orange-400">
                                                                    {issue.repeatCount}x recurring
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className="font-semibold text-white truncate">{issue.title}</h3>

                                                    {/* Why row */}
                                                    {issue.reasoning && (
                                                        <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                                                            <Eye className="h-3 w-3 text-stone-500 flex-shrink-0" />
                                                            <span className="italic">{issue.reasoning}</span>
                                                        </p>
                                                    )}

                                                    {/* Recommended action */}
                                                    {issue.recommended && (
                                                        <p className="text-xs text-amber-400/80 mt-1.5 flex items-center gap-1">
                                                            <ChevronRight className="h-3 w-3 flex-shrink-0" />
                                                            Next: {issue.recommended}
                                                        </p>
                                                    )}

                                                    {/* Assigned badge */}
                                                    {issue.assignedToName && (
                                                        <p className="text-xs text-blue-400 mt-1.5 flex items-center gap-1">
                                                            <Users className="h-3 w-3" />
                                                            Assigned to {issue.assignedToName}
                                                            {issue.dueAt && (
                                                                <span className="text-stone-500 ml-1">
                                                                    · Due {new Date(issue.dueAt).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Financial impact badge */}
                                                {issue.financialImpact > 0 && (
                                                    <div className="text-right flex-shrink-0">
                                                        <span className="text-xs text-stone-500">at risk</span>
                                                        <p className={`text-sm font-bold ${sev.text}`}>
                                                            {formatCurrency(issue.financialImpact)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-800/60">
                                                {issue.status === 'OPEN' && (
                                                    <button
                                                        onClick={() => handleAction(issue.id, 'ACKNOWLEDGE')}
                                                        disabled={isActioning}
                                                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors disabled:opacity-50"
                                                    >
                                                        Acknowledge
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleAction(issue.id, 'RESOLVE', {
                                                        resolvedReason: 'ROOT_CAUSE_FIXED',
                                                        note: 'Resolved from command center'
                                                    })}
                                                    disabled={isActioning}
                                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-colors disabled:opacity-50"
                                                >
                                                    Resolve
                                                </button>
                                                {SNOOZE_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.minutes}
                                                        onClick={() => handleAction(issue.id, 'SNOOZE', {
                                                            snoozeDurationMin: opt.minutes
                                                        })}
                                                        disabled={isActioning}
                                                        className="px-3 py-1.5 text-xs rounded-lg bg-stone-800/50 hover:bg-stone-800 text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-50"
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                                <Link
                                                    href={`/dashboard/owner/issues/${issue.id}`}
                                                    className="ml-auto px-3 py-1.5 text-xs text-stone-500 hover:text-amber-400 transition-colors"
                                                >
                                                    Details →
                                                </Link>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right sidebar: Health + Recommendations */}
                    <div className="space-y-6">
                        {/* Store Health Cards */}
                        <div>
                            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                <Shield className="h-5 w-5 text-blue-400" />
                                Store Health
                            </h2>
                            <div className="space-y-3">
                                {briefing?.storeHealth.map((store) => {
                                    const health = HEALTH_COLORS[store.overallStatus] || HEALTH_COLORS.GREEN
                                    return (
                                        <div
                                            key={store.locationId}
                                            className={`bg-stone-900/60 border border-stone-800 rounded-xl p-4 hover:border-stone-700 transition-all`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="font-medium text-sm truncate">{store.locationName}</span>
                                                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold ${health.bg} ${health.text}`}>
                                                    <span className={`w-2 h-2 rounded-full ${store.overallStatus === 'GREEN' ? 'bg-emerald-500' : store.overallStatus === 'YELLOW' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                    {store.overallScore}
                                                </div>
                                            </div>
                                            {/* Mini health bars */}
                                            <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                                                {[
                                                    { label: 'Sales', score: store.salesHealth },
                                                    { label: 'Cash', score: store.cashHealth },
                                                    { label: 'Staff', score: store.laborHealth },
                                                    { label: 'Stock', score: store.inventoryHealth },
                                                    { label: 'Comply', score: store.complianceHealth },
                                                    { label: 'LP', score: store.lpHealth },
                                                ].map(item => (
                                                    <div key={item.label} className="flex items-center gap-1">
                                                        <span className="text-stone-500 w-8">{item.label}</span>
                                                        <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${
                                                                    item.score >= 70 ? 'bg-emerald-500' :
                                                                        item.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${item.score}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Recommendations */}
                        {briefing?.recommendations && briefing.recommendations.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <Target className="h-5 w-5 text-amber-400" />
                                    Recommended Actions
                                </h2>
                                <div className="space-y-2">
                                    {briefing.recommendations.map((rec) => (
                                        <div
                                            key={rec.rank}
                                            className="bg-stone-900/60 border border-stone-800 rounded-xl p-3.5 hover:border-amber-500/30 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex-shrink-0 mt-0.5">
                                                    {rec.rank}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-white group-hover:text-amber-400 transition-colors">
                                                        {rec.action}
                                                    </p>
                                                    <p className="text-xs text-stone-500 mt-0.5 truncate">{rec.reason}</p>
                                                    <span className={`inline-block text-xs mt-1.5 px-2 py-0.5 rounded-full ${
                                                        rec.ownerScope === 'OWNER'
                                                            ? 'bg-purple-500/20 text-purple-400'
                                                            : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                        {rec.ownerScope === 'OWNER' ? 'Owner action' : 'Can delegate'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
