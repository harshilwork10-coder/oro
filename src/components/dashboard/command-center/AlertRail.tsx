'use client'

import { AlertTriangle, Eye, CheckCircle, ChevronRight } from 'lucide-react'

export interface ExceptionItem {
    id: string
    type: string
    severity: 'CRITICAL' | 'WARNING' | 'INFO'
    title: string
    description: string
    locationName: string
    createdAt: string
    actionLabel?: string
    onAction?: () => void
}

interface AlertRailProps {
    exceptions: ExceptionItem[]
    maxVisible?: number
    onViewAll?: () => void
    emptyTitle?: string
    emptySubtitle?: string
}

const severityConfig = {
    CRITICAL: {
        border: 'border-red-500/25',
        bg: 'bg-red-500/[0.06]',
        hoverBg: 'hover:bg-red-500/[0.12]',
        dotColor: 'bg-red-500',
        dotShadow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
        iconColor: 'text-red-400',
    },
    WARNING: {
        border: 'border-amber-500/25',
        bg: 'bg-amber-500/[0.06]',
        hoverBg: 'hover:bg-amber-500/[0.12]',
        dotColor: 'bg-amber-500',
        dotShadow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
        iconColor: 'text-amber-400',
    },
    INFO: {
        border: 'border-blue-500/25',
        bg: 'bg-blue-500/[0.06]',
        hoverBg: 'hover:bg-blue-500/[0.12]',
        dotColor: 'bg-blue-500',
        dotShadow: 'shadow-[0_0_6px_rgba(59,130,246,0.4)]',
        iconColor: 'text-blue-400',
    },
}

function timeAgo(dateStr: string): string {
    const now = new Date()
    const then = new Date(dateStr)
    const diffMs = now.getTime() - then.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return `${Math.floor(diffHrs / 24)}d ago`
}

export default function AlertRail({
    exceptions,
    maxVisible = 5,
    onViewAll,
    emptyTitle = 'All clear',
    emptySubtitle = 'No exceptions or alerts detected',
}: AlertRailProps) {
    const visible = exceptions.slice(0, maxVisible)
    const criticalCount = exceptions.filter(e => e.severity === 'CRITICAL').length
    const warningCount = exceptions.filter(e => e.severity === 'WARNING').length

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">Alerts & Exceptions</h3>
                    {exceptions.length > 0 && (
                        <div className="flex gap-1.5 ml-1">
                            {criticalCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/20">
                                    {criticalCount} critical
                                </span>
                            )}
                            {warningCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">
                                    {warningCount} warning
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {onViewAll && exceptions.length > 0 && (
                    <button
                        onClick={onViewAll}
                        className="text-xs font-medium text-[var(--theme-accent)] hover:text-[var(--theme-accent-light)] flex items-center gap-1 transition-colors"
                    >
                        View All <ChevronRight className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto max-h-[360px] scrollbar-hide">
                {visible.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                            <CheckCircle className="h-7 w-7 text-emerald-500" />
                        </div>
                        <p className="font-semibold text-stone-300 text-sm">{emptyTitle}</p>
                        <p className="text-xs text-stone-500 mt-1">{emptySubtitle}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {visible.map(ex => {
                            const sev = severityConfig[ex.severity]
                            return (
                                <div
                                    key={ex.id}
                                    className={`flex items-start gap-3.5 px-5 py-3.5 transition-colors cursor-pointer ${sev.hoverBg}`}
                                >
                                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${sev.dotColor} ${sev.dotShadow}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-semibold text-white text-sm leading-snug">{ex.title}</p>
                                            <span className="text-[11px] text-stone-500 whitespace-nowrap flex-shrink-0">
                                                {timeAgo(ex.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{ex.description}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[11px] font-medium text-stone-500 bg-stone-800/80 px-2 py-0.5 rounded">
                                                {ex.locationName}
                                            </span>
                                            {ex.actionLabel && ex.onAction && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); ex.onAction?.() }}
                                                    className="text-[11px] font-semibold text-[var(--theme-accent)] hover:underline flex items-center gap-0.5"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    {ex.actionLabel}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
