'use client'

import type { ReactNode } from 'react'

interface DashboardShellProps {
    header: ReactNode
    kpiStrip: ReactNode
    alertRail?: ReactNode
    quickActions?: ReactNode
    workspace: ReactNode
    trendFooter?: ReactNode
}

/**
 * DashboardShell — shared layout for all 4 role-based command centers.
 *
 * Zones:
 * A: Command Header
 * B: KPI Summary Strip
 * C: Alert Rail (left 60%)
 * D: Quick Actions (right 40%)
 * E: Primary Workspace (tabs)
 * F: Trend Footer (optional)
 */
export default function DashboardShell({
    header,
    kpiStrip,
    alertRail,
    quickActions,
    workspace,
    trendFooter,
}: DashboardShellProps) {
    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-8%] right-[-4%] w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
                 style={{ backgroundColor: 'var(--theme-accent-muted)' }} />
            <div className="absolute bottom-[-8%] left-[-4%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none opacity-50"
                 style={{ backgroundColor: 'var(--theme-accent-muted)' }} />

            <div className="relative z-10 p-6 space-y-6 max-w-[1600px] mx-auto">
                {/* Zone A: Command Header */}
                {header}

                {/* Zone B: KPI Strip */}
                {kpiStrip}

                {/* Zone C + D: Alert Rail + Quick Actions */}
                {(alertRail || quickActions) && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {alertRail && (
                            <div className={quickActions ? 'lg:col-span-3' : 'lg:col-span-5'}>
                                {alertRail}
                            </div>
                        )}
                        {quickActions && (
                            <div className={alertRail ? 'lg:col-span-2' : 'lg:col-span-5'}>
                                {quickActions}
                            </div>
                        )}
                    </div>
                )}

                {/* Zone E: Primary Workspace */}
                {workspace}

                {/* Zone F: Trend Footer (optional) */}
                {trendFooter}
            </div>
        </div>
    )
}
