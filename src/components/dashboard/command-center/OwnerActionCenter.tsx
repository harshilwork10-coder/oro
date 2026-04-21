'use client'

import Link from 'next/link'
import {
    ShoppingCart, DollarSign, AlertCircle, FileText,
    Package, Shield, ArrowRightLeft, CreditCard,
    ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface OwnerAction {
    id: string
    label: string
    description: string
    icon: LucideIcon
    href: string
    badge?: number | string
    badgeColor?: string    // Tailwind bg class
    priority: 'high' | 'normal'
}

interface OwnerActionCenterProps {
    pendingExceptions?: number
    pendingTransfers?: number
    cashVarianceAlert?: boolean
    onRunZReport?: () => void
}

export default function OwnerActionCenter({
    pendingExceptions = 0,
    pendingTransfers = 0,
    cashVarianceAlert = false,
    onRunZReport,
}: OwnerActionCenterProps) {
    const actions: OwnerAction[] = [
        {
            id: 'open-pos',
            label: 'Open POS',
            description: 'Ring up a sale now',
            icon: ShoppingCart,
            href: '/owner/pos',
            priority: 'high',
        },
        {
            id: 'exceptions',
            label: 'Review Exceptions',
            description: pendingExceptions > 0 ? `${pendingExceptions} need attention` : 'All clear',
            icon: AlertCircle,
            href: '/owner/store-health',
            badge: pendingExceptions > 0 ? pendingExceptions : undefined,
            badgeColor: 'bg-red-500/20 text-red-400 border-red-500/25',
            priority: 'high',
        },
        {
            id: 'cash-drop',
            label: 'Cash Drop / Close',
            description: cashVarianceAlert ? '⚠ Variance detected' : 'Manage cash drawer',
            icon: DollarSign,
            href: '/dashboard/owner/cash',
            badge: cashVarianceAlert ? '!' : undefined,
            badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/25',
            priority: 'high',
        },
        {
            id: 'z-report',
            label: 'Run Z-Report',
            description: 'End-of-day settlement',
            icon: FileText,
            href: '/dashboard/owner/tax-report',
            priority: 'normal',
        },
        {
            id: 'transfers',
            label: 'Approve Transfers',
            description: pendingTransfers > 0 ? `${pendingTransfers} pending` : 'No pending transfers',
            icon: ArrowRightLeft,
            href: '/dashboard/owner/transfers',
            badge: pendingTransfers > 0 ? pendingTransfers : undefined,
            badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/25',
            priority: 'normal',
        },
        {
            id: 'lp-audit',
            label: 'LP Audit Log',
            description: 'Voids, refunds, overrides',
            icon: Shield,
            href: '/dashboard/owner/lp-audit',
            priority: 'normal',
        },
    ]

    const highPriority = actions.filter((a) => a.priority === 'high')
    const normalPriority = actions.filter((a) => a.priority === 'normal')

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <CreditCard className="h-4 w-4 text-[var(--theme-accent)]" />
                    <h3 className="font-bold text-white text-sm">Action Center</h3>
                </div>
            </div>

            {/* High priority actions */}
            <div className="divide-y divide-white/[0.04]">
                {highPriority.map((action) => (
                    <Link key={action.id} href={action.href}>
                        <div className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.04] transition-colors group cursor-pointer">
                            <div className="w-9 h-9 rounded-xl bg-[var(--theme-accent-muted)] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                                <action.icon className="h-4.5 w-4.5 text-[var(--theme-accent)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-semibold text-white text-sm">{action.label}</span>
                                <p className="text-[11px] text-stone-500 mt-0.5">{action.description}</p>
                            </div>
                            {action.badge !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${action.badgeColor}`}>
                                    {action.badge}
                                </span>
                            )}
                            <ChevronRight className="h-4 w-4 text-stone-600 group-hover:text-[var(--theme-accent)] transition-colors flex-shrink-0" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Divider */}
            <div className="px-5 py-2 bg-white/[0.02]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">More Actions</span>
            </div>

            {/* Normal priority actions */}
            <div className="divide-y divide-white/[0.04]">
                {normalPriority.map((action) => (
                    <Link key={action.id} href={action.href}>
                        <div className="flex items-center gap-3.5 px-5 py-3 hover:bg-white/[0.04] transition-colors group cursor-pointer">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                                <action.icon className="h-4 w-4 text-stone-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-medium text-stone-300 text-sm">{action.label}</span>
                                <p className="text-[11px] text-stone-600 mt-0.5">{action.description}</p>
                            </div>
                            {action.badge !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${action.badgeColor}`}>
                                    {action.badge}
                                </span>
                            )}
                            <ChevronRight className="h-3.5 w-3.5 text-stone-700 group-hover:text-stone-400 transition-colors flex-shrink-0" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
