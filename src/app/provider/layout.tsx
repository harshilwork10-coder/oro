'use client';

import {
    Home, Users, Ticket, Monitor, HardDrive, FileText,
    CreditCard, Settings, Plus, Bell, Search, Menu, ChevronDown,
    Building2, Package, LogOut, User
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import OroLogo from '@/components/ui/OroLogo';

// Provider sidebar items
const PROVIDER_SIDEBAR = [
    { name: 'Home', href: '/provider/home', icon: Home },
    { name: 'Clients', href: '/provider/clients', icon: Building2 },
    { name: 'Onboarding', href: '/provider/onboarding', icon: FileText },
    { name: 'Tickets', href: '/provider/tickets', icon: Ticket },
    { name: 'Devices', href: '/provider/devices', icon: HardDrive },
    { name: 'Monitoring', href: '/provider/monitoring', icon: Monitor },
    { name: 'Billing', href: '/provider/billing', icon: CreditCard },
    { name: 'System', href: '/provider/system', icon: Settings },
];

// Quick add menu items
const ADD_MENU_ITEMS = [
    { name: 'New Client', href: '/provider/clients/new', icon: Building2 },
    { name: 'New Onboarding Request', href: '/provider/onboarding/new', icon: FileText },
    { name: 'New Ticket', href: '/provider/tickets/new', icon: Ticket },
    { name: 'Add Device to Inventory', href: '/provider/devices?action=add', icon: HardDrive },
];

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [addMenuOpen, setAddMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const user = session?.user as any;

    return (
        <div className="min-h-screen bg-stone-950 flex">
            {/* Left Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full bg-stone-900 border-r border-stone-800 transition-all duration-300 z-40 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}
            >
                {/* Logo area */}
                <div className="h-14 flex items-center px-3 border-b border-stone-800">
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200 transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    {!sidebarCollapsed && (
                        <div className="ml-2">
                            <OroLogo size="sm" />
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="mt-4 px-2 space-y-1">
                    {PROVIDER_SIDEBAR.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-orange-500/20 text-orange-400 border-l-2 border-orange-500'
                                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                                    }`}
                                title={sidebarCollapsed ? item.name : undefined}
                            >
                                <item.icon size={20} />
                                {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom user section */}
                {!sidebarCollapsed && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-stone-800">
                        <div className="flex items-center gap-3 px-2 py-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {user?.name?.charAt(0) || 'P'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-stone-200 truncate">{user?.name || 'Provider'}</p>
                                <p className="text-xs text-stone-500 truncate">Platform Admin</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="w-full flex items-center gap-2 px-3 py-2 mt-2 text-sm text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </div>
                )}
            </aside>

            {/* Main content area */}
            <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
                {/* Top Bar */}
                <header className="sticky top-0 z-30 h-14 bg-stone-900/95 backdrop-blur border-b border-stone-800 flex items-center px-4 gap-4">
                    {/* Global Search */}
                    <div className="flex-1 max-w-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search client, MID, TID, ticket, terminal..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 pl-10 pr-4 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-2">
                        {/* Notifications Bell */}
                        <button className="relative p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200 transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>

                        {/* Add Button Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setAddMenuOpen(!addMenuOpen)}
                                className="flex items-center gap-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Plus size={18} />
                                New
                                <ChevronDown size={14} />
                            </button>

                            {addMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setAddMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50 py-1">
                                        {ADD_MENU_ITEMS.map((item) => (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                onClick={() => setAddMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors"
                                            >
                                                <item.icon size={16} />
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="relative">
                            <button
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200 transition-colors"
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {user?.name?.charAt(0) || 'P'}
                                </div>
                                <ChevronDown size={14} />
                            </button>

                            {profileMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-stone-800 border border-stone-700 rounded-lg shadow-xl z-50 py-1">
                                        <div className="px-4 py-2 border-b border-stone-700">
                                            <p className="text-sm font-medium text-stone-200">{user?.name}</p>
                                            <p className="text-xs text-stone-500">{user?.email}</p>
                                        </div>
                                        <Link href="/provider/system" className="flex items-center gap-2 px-4 py-2 text-sm text-stone-300 hover:bg-stone-700">
                                            <Settings size={16} />
                                            Settings
                                        </Link>
                                        <button
                                            onClick={() => signOut({ callbackUrl: '/login' })}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-stone-700"
                                        >
                                            <LogOut size={16} />
                                            Sign out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
