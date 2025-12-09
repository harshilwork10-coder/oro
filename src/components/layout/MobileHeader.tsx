'use client'

import { Menu, Bell } from 'lucide-react'
import { useSession } from 'next-auth/react'
import TrinexLogo from '@/components/ui/TrinexLogo'

interface MobileHeaderProps {
    onMenuClick: () => void
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
    const { data: session } = useSession()

    return (
        <header className="flex h-16 items-center justify-between border-b border-stone-800 bg-stone-950/80 backdrop-blur-md px-4 lg:hidden sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="rounded-md p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
                >
                    <span className="sr-only">Open sidebar</span>
                    <Menu className="h-6 w-6" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2">
                    {/* Using BreadLogo logic here if needed, or keeping simple text for mobile */}
                    <span className="text-lg font-bold text-stone-100">Trinex AI</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button className="text-stone-400 hover:text-stone-100">
                    <span className="sr-only">View notifications</span>
                    <Bell className="h-6 w-6" />
                </button>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-semibold text-xs shadow-lg shadow-orange-900/20">
                    {session?.user?.name?.charAt(0).toUpperCase()}
                </div>
            </div>
        </header>
    )
}
