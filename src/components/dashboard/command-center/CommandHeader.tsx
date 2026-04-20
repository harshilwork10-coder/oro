'use client'

import { RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CommandHeaderProps {
    title: string
    subtitle?: string
    icon?: LucideIcon
    roleBadge?: string
    roleBadgeColor?: string
    onRefresh?: () => void
    refreshing?: boolean
    children?: React.ReactNode  // right-side actions
}

export default function CommandHeader({
    title,
    subtitle,
    icon: Icon,
    roleBadge,
    roleBadgeColor = 'bg-[var(--theme-accent-muted)] text-[var(--theme-accent)] border-[var(--theme-accent)]/20',
    onRefresh,
    refreshing,
    children,
}: CommandHeaderProps) {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-accent-muted)] border border-[var(--theme-accent)]/20 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-[var(--theme-accent)]" />
                    </div>
                )}
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
                        {roleBadge && (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${roleBadgeColor}`}>
                                {roleBadge}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
                        <span className="text-xs text-stone-600">•</span>
                        <span className="text-xs text-stone-600">{dateStr} · {timeStr}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {children}
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 rounded-xl border border-white/[0.06] transition-all text-sm font-medium"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                )}
            </div>
        </div>
    )
}
