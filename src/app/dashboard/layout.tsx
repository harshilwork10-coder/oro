'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Menu } from 'lucide-react'
import Sidebar from "@/components/layout/Sidebar"
import MobileHeader from "@/components/layout/MobileHeader"
import SessionGuard from "@/components/security/SessionGuard"
import AccountSelector from "@/components/layout/AccountSelector"
import LocationToggle from "@/components/dashboard/LocationToggle"
import PWAInstallPrompt from "@/components/pwa/PWAInstallPrompt"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const pathname = usePathname()
    const { data: session } = useSession()
    const user = session?.user as any

    // Listen for toggleSidebar event from POS header
    useEffect(() => {
        const handleToggleSidebar = () => setSidebarOpen(true)
        window.addEventListener('toggleSidebar', handleToggleSidebar)
        return () => window.removeEventListener('toggleSidebar', handleToggleSidebar)
    }, [])

    // POS pages get full screen experience
    const isPOS = pathname.startsWith('/dashboard/pos')
    const isEmployee = user?.role === 'EMPLOYEE'

    // RETAIL industry employees NEVER see sidebar - they only use POS
    const isRetailEmployee = isEmployee && user?.industryType === 'RETAIL'

    // Hide sidebar completely for: POS pages OR retail employees
    const hideSidebar = isPOS || isRetailEmployee

    // Show account selector for Provider and Support Staff
    const showAccountSelector = user?.role === 'PROVIDER' || user?.role === 'SUPPORT_STAFF'

    return (
        <SessionGuard>
            <div className="flex h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/20 via-stone-950 to-stone-950 text-stone-100">

                {/* Sidebar - Hidden for: POS pages, retail employees */}
                {!hideSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
                {hideSidebar && sidebarOpen && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

                <div className="flex flex-1 flex-col overflow-hidden relative">
                    {/* Ambient Background Glow */}
                    <div className="absolute top-0 left-0 w-full h-96 bg-orange-500/5 blur-[100px] pointer-events-none" />

                    {/* MobileHeader - hide for POS pages, retail employees, and when sidebar is open */}
                    {!hideSidebar && !sidebarOpen && <MobileHeader onMenuClick={() => setSidebarOpen(true)} />}

                    {/* Account Selector Bar - For Provider/Support to select which account to work on */}
                    {/* Hide on /dashboard/provider page - that's the admin overview */}
                    {showAccountSelector && !isPOS && !pathname.startsWith('/dashboard/provider') && (
                        <div className="relative z-20 px-4 py-3 border-b border-stone-800/50 bg-stone-900/50 backdrop-blur-sm">
                            <AccountSelector />
                        </div>
                    )}

                    {/* Location Toggle Bar - For employees to switch their current working location */}
                    {!showAccountSelector && !isPOS && (
                        <div className="relative z-20 px-4 py-2 border-b border-stone-800/50 bg-stone-900/30 backdrop-blur-sm flex justify-end">
                            <LocationToggle />
                        </div>
                    )}

                    {/* Floating Menu Button removed for Salon POS - it's now integrated into the POS header */}

                    <main className={`flex-1 overflow-y-auto relative z-10 ${hideSidebar ? 'overflow-hidden' : ''}`}>
                        {children}
                    </main>
                </div>

                {/* PWA Install Prompt - shows for employees on first login */}
                {isEmployee && <PWAInstallPrompt />}
            </div>
        </SessionGuard>
    )
}

