'use client'

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface TabConfig {
    id: string
    label: string
    icon?: LucideIcon
    badge?: number
    content: React.ReactNode
}

interface WorkspaceTabsProps {
    tabs: TabConfig[]
    defaultTab?: string
}

export default function WorkspaceTabs({ tabs, defaultTab }: WorkspaceTabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
    const activeConfig = tabs.find(t => t.id === activeTab)

    return (
        <div className="bg-stone-900/50 backdrop-blur-md border border-white/[0.06] rounded-2xl overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center gap-0.5 px-4 pt-3 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
                {tabs.map(tab => {
                    const isActive = tab.id === activeTab
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                                transition-colors whitespace-nowrap
                                ${isActive
                                    ? 'text-[var(--theme-accent)]'
                                    : 'text-stone-500 hover:text-stone-300'}
                            `}
                        >
                            {tab.icon && <tab.icon className="h-4 w-4" />}
                            {tab.label}
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className={`
                                    ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                                    ${isActive
                                        ? 'bg-[var(--theme-accent-muted)] text-[var(--theme-accent)]'
                                        : 'bg-stone-800 text-stone-400'}
                                `}>
                                    {tab.badge}
                                </span>
                            )}
                            {/* Active indicator bar */}
                            {isActive && (
                                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--theme-accent)]" />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="p-5">
                {activeConfig?.content}
            </div>
        </div>
    )
}
