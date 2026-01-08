'use client';

import {
    Home, Users, MapPin, Package, BarChart3, Ticket, FileText,
    Plus, Bell, Search, Menu, ChevronDown, Building2, HardDrive, User, LogOut, Settings
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

// Franchisor sidebar items (8 items as specified)
const FRANCHISOR_SIDEBAR = [
    { name: 'Home', href: '/franchisor/home', icon: Home },
    { name: 'Franchisees', href: '/franchisor/franchisees', icon: Users },
    { name: 'Locations', href: '/franchisor/locations', icon: MapPin },
    { name: 'Brand Catalog', href: '/franchisor/catalog', icon: Package },
    { name: 'Reports', href: '/franchisor/reports', icon: BarChart3 },
    { name: 'Support', href: '/franchisor/support', icon: Ticket },
    { name: 'Requests', href: '/franchisor/requests', icon: FileText },
    { name: 'Users', href: '/franchisor/users', icon: User },
];

// Quick add menu items (Franchisor-allowed actions only)
const NEW_MENU_ITEMS = [
    { name: 'New Ticket', href: '/franchisor/support?action=new', icon: Ticket },
    { name: 'New Onboarding Request', href: '/franchisor/requests/new', icon: FileText },
    { name: 'Request Device Change', href: '/franchisor/support?action=device-change', icon: HardDrive },
];

export default function FranchisorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [newMenuOpen, setNewMenuOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const user = session?.user as any;

    return (
        <div className="min-h-screen bg-[var(--background)] flex">
            {/* Left Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-300 z-40 ${sidebarCollapsed ? 'w-16' : 'w-56'
                    }`}
            >
                {/* Logo area */}
                <div className="h-14 flex items-center px-4 border-b border-[var(--border)]">
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    {!sidebarCollapsed && (
                        <span className="ml-3 font-bold text-lg bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent">
                            Brand HQ
                        </span>
                    )}
                </div>

                {/* Navigation */}
                <nav className="mt-4 px-2 space-y-1">
                    {FRANCHISOR_SIDEBAR.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-[var(--primary)]/20 text-[var(--primary)] border-l-2 border-[var(--primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                                    }`}
                                title={sidebarCollapsed ? item.name : undefined}
                            >
                                <item.icon size={20} />
                                {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section at bottom */}
                {!sidebarCollapsed && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[var(--border)]">
                        <div className="flex items-center gap-3 px-2 py-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {user?.name?.charAt(0) || 'F'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name || 'Franchisor'}</p>
                                <p className="text-xs text-[var(--text-muted)] truncate">Brand Owner</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="w-full flex items-center gap-2 px-3 py-2 mt-2 text-sm text-[var(--text-secondary)] hover:text-red-400 hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
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
                <header className="sticky top-0 z-30 h-14 bg-[var(--surface)]/95 backdrop-blur border-b border-[var(--border)] flex items-center px-4 gap-4">
                    {/* Global Search */}
                    <div className="flex-1 max-w-xl">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                            <input
                                type="text"
                                placeholder="Search franchisee, location, ticket, city..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-2">
                        {/* Notifications Bell */}
                        <button className="relative p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--primary)] rounded-full"></span>
                        </button>

                        {/* + New Button Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setNewMenuOpen(!newMenuOpen)}
                                className="flex items-center gap-1 px-3 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Plus size={18} />
                                New
                                <ChevronDown size={14} />
                            </button>

                            {newMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setNewMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-50 py-1">
                                        {NEW_MENU_ITEMS.map((item) => (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                onClick={() => setNewMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors"
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
                        <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <div className="w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center text-white text-sm font-medium">
                                F
                            </div>
                            <ChevronDown size={14} />
                        </button>
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

