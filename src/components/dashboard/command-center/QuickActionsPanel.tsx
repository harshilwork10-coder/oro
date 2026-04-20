'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export interface QuickAction {
    label: string
    sublabel?: string
    icon: LucideIcon
    href?: string
    onClick?: () => void
    color?: string  // Tailwind bg class like 'bg-violet-500/20'
    iconColor?: string  // Tailwind text class
}

interface QuickActionsPanelProps {
    title?: string
    actions: QuickAction[]
    columns?: 2 | 3
}

export default function QuickActionsPanel({
    title = 'Quick Actions',
    actions,
    columns = 2,
}: QuickActionsPanelProps) {
    const gridClass = columns === 3 ? 'grid-cols-3' : 'grid-cols-2'

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 className="font-bold text-white text-sm">{title}</h3>
            </div>
            <div className={`grid ${gridClass} gap-2.5 p-4 flex-1`}>
                {actions.map((action, i) => {
                    const inner = (
                        <div className="p-3.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-all group flex flex-col items-center text-center cursor-pointer">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform ${action.color || 'bg-white/[0.06]'}`}>
                                <action.icon className={`h-5 w-5 ${action.iconColor || 'text-stone-400'}`} />
                            </div>
                            <span className="text-xs font-bold text-white leading-tight">{action.label}</span>
                            {action.sublabel && (
                                <span className="text-[10px] text-stone-500 mt-0.5 leading-tight">{action.sublabel}</span>
                            )}
                        </div>
                    )

                    if (action.href) {
                        return <Link key={i} href={action.href}>{inner}</Link>
                    }
                    return (
                        <div key={i} onClick={action.onClick}>
                            {inner}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
