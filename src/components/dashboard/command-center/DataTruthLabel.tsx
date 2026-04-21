'use client'

import { Clock, Database, CheckCircle2 } from 'lucide-react'

export interface DataTruthMeta {
    queriedAt: string        // ISO-8601
    freshness: 'live' | 'cached' | 'stale'
    source: string           // e.g. 'primary_db', 'redis_cache'
    businessDayCutoff: string // e.g. 'midnight America/Chicago'
    note?: string
}

interface DataTruthLabelProps {
    meta?: DataTruthMeta | null
    compact?: boolean
}

const freshnessConfig = {
    live: {
        dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]',
        label: 'Live',
        color: 'text-emerald-400',
        icon: CheckCircle2,
    },
    cached: {
        dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
        label: 'Cached',
        color: 'text-amber-400',
        icon: Database,
    },
    stale: {
        dot: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]',
        label: 'Stale',
        color: 'text-red-400',
        icon: Clock,
    },
}

function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const secs = Math.floor(diff / 1000)
    if (secs < 10) return 'just now'
    if (secs < 60) return `${secs}s ago`
    const mins = Math.floor(secs / 60)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ago`
}

/**
 * DataTruthLabel
 * Renders a small pill showing data source freshness at the right edge
 * of KPI strips or section headers.  Designed to satisfy audit/reporting
 * requirements: every number on screen should be traceable to a query time.
 */
export default function DataTruthLabel({ meta, compact = false }: DataTruthLabelProps) {
    if (!meta) return null

    const cfg = freshnessConfig[meta.freshness] || freshnessConfig.live
    const Icon = cfg.icon

    if (compact) {
        return (
            <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${cfg.color}`}
                title={`Source: ${meta.source} · Cutoff: ${meta.businessDayCutoff}${meta.note ? ` · ${meta.note}` : ''}`}
            >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
            </span>
        )
    }

    return (
        <div
            className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-lg"
            title={meta.note || ''}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            <Icon className={`h-3 w-3 ${cfg.color}`} />
            <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
            <span className="text-[11px] text-stone-600">·</span>
            <span className="text-[11px] text-stone-500">
                {formatRelativeTime(meta.queriedAt)}
            </span>
        </div>
    )
}
