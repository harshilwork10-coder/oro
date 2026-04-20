'use client'

import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type KpiVariant = 'default' | 'warning' | 'danger' | 'success' | 'accent'

export interface KpiCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon: LucideIcon
    variant?: KpiVariant
    href?: string
    trend?: { value: number; label: string }
    pulse?: boolean
}

const variantStyles: Record<KpiVariant, { border: string; bg: string; iconBg: string; iconColor: string }> = {
    default: {
        border: 'border-white/[0.06] hover:border-white/[0.12]',
        bg: '',
        iconBg: 'bg-white/[0.06]',
        iconColor: 'text-stone-400',
    },
    warning: {
        border: 'border-amber-500/20 hover:border-amber-500/40',
        bg: 'bg-amber-500/[0.03]',
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-400',
    },
    danger: {
        border: 'border-red-500/20 hover:border-red-500/40',
        bg: 'bg-red-500/[0.03]',
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-400',
    },
    success: {
        border: 'border-emerald-500/20 hover:border-emerald-500/40',
        bg: 'bg-emerald-500/[0.03]',
        iconBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-400',
    },
    accent: {
        border: 'border-[var(--theme-accent)]/20 hover:border-[var(--theme-accent)]/40',
        bg: '',
        iconBg: 'bg-[var(--theme-accent-muted)]',
        iconColor: 'text-[var(--theme-accent)]',
    },
}

export default function KpiCard({
    title,
    value,
    subtitle,
    icon: Icon,
    variant = 'default',
    href,
    trend,
    pulse,
}: KpiCardProps) {
    const s = variantStyles[variant]

    const content = (
        <div
            className={`
                relative overflow-hidden rounded-2xl border p-5
                bg-stone-900/50 backdrop-blur-md
                transition-all duration-200 hover:scale-[1.015]
                group cursor-pointer
                ${s.border} ${s.bg}
            `}
        >
            {/* Ambient glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                 style={{ background: 'radial-gradient(ellipse at center, var(--theme-accent-muted) 0%, transparent 70%)' }} />

            <div className="relative flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</p>
                    <p className="text-3xl font-black text-white mt-1.5 tracking-tight">{value}</p>
                    {subtitle && <p className="text-xs text-stone-500 mt-1.5">{subtitle}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trend.value >= 0
                                ? <TrendingUp className="h-3.5 w-3.5" />
                                : <TrendingDown className="h-3.5 w-3.5" />}
                            <span>{trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}% {trend.label}</span>
                        </div>
                    )}
                </div>
                <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${s.iconBg} group-hover:scale-110 transition-transform`}>
                    {pulse && <span className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-pulse top-3 right-3" />}
                    <Icon className={`h-5 w-5 ${s.iconColor}`} />
                </div>
            </div>
        </div>
    )

    if (href) {
        return <Link href={href}>{content}</Link>
    }
    return content
}
