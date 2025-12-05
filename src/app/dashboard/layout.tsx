'use client'

import { useState } from 'react'
import Sidebar from "@/components/layout/Sidebar"
import MobileHeader from "@/components/layout/MobileHeader"
import SessionGuard from "@/components/security/SessionGuard"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <SessionGuard>
            <div className="flex h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/20 via-stone-950 to-stone-950 text-stone-100">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="flex flex-1 flex-col overflow-hidden relative">
                    {/* Ambient Background Glow */}
                    <div className="absolute top-0 left-0 w-full h-96 bg-orange-500/5 blur-[100px] pointer-events-none" />

                    <MobileHeader onMenuClick={() => setSidebarOpen(true)} />

                    <main className="flex-1 overflow-y-auto relative z-10">
                        {children}
                    </main>
                </div>
            </div>
        </SessionGuard>
    )
}
