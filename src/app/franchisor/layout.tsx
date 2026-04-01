'use client';

import {
    Home, Users, MapPin, BarChart3, Settings,
    Bell, Search, Menu, ChevronDown, LogOut,
    Briefcase, UserCog, AlertTriangle, DollarSign, Shield,
    ArrowRightLeft, ShieldCheck, GitBranch
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { HQ_ROLES, type HQRole } from '@/lib/hqRole';

// Full nav definition — role gating filters this list per-user on mount
const ALL_SIDEBAR_ITEMS = [
    { name: 'Home',          href: '/franchisor/home',              icon: Home,            badge: false },
    { name: 'Exceptions',    href: '/franchisor/exceptions',        icon: AlertTriangle,   badge: true  },
    { name: 'Franchisees',   href: '/franchisor/franchisees',       icon: Users,           badge: false },
    { name: 'Locations',     href: '/franchisor/locations',         icon: MapPin,          badge: false },
    { name: 'Brand Catalog', href: '/franchisor/catalog',           icon: Briefcase,       badge: false },
    { name: 'Reports',       href: '/franchisor/reports',           icon: BarChart3,       badge: false },
    { name: 'Compare',       href: '/franchisor/compare',           icon: ArrowRightLeft,  badge: false },
    { name: 'Compliance',    href: '/franchisor/catalog/compliance',icon: ShieldCheck,     badge: false },
    { name: 'Royalties',     href: '/franchisor/royalties',         icon: DollarSign,      badge: false },
    { name: 'Rollout',       href: '/franchisor/rollout',           icon: GitBranch,       badge: false },
    { name: 'Users',         href: '/franchisor/users',             icon: UserCog,         badge: false },
    { name: 'Settings',      href: '/franchisor/settings',          icon: Settings,        badge: false },
];

export default function FranchisorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [exceptionCount, setExceptionCount] = useState(0);

    // HQ sub-role for nav gating
    const [hqRole, setHqRole] = useState<HQRole>('OWNER'); // Defaults to full access until resolved

    // Resolve caller's HQ role for nav gating
    useEffect(() => {
        fetch('/api/franchisor/my-role')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.hqRole) setHqRole(data.hqRole as HQRole); })
            .catch(() => { /* remain at OWNER default */ });
    }, []);

    // Fetch exception count for nav badge — refreshes every 60s
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch('/api/franchisor/portfolio/exceptions');
                if (res.ok) {
                    const data = await res.json();
                    setExceptionCount(data.summary?.total || 0);
                }
            } catch { /* silently ignore */ }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 60_000);
        return () => clearInterval(interval);
    }, []);

    const user = session?.user as any;
    const roleDef = HQ_ROLES[hqRole];

    // Filter nav by role allowed paths
    const visibleNav = ALL_SIDEBAR_ITEMS.filter(item =>
        roleDef?.allowedPaths.some((allowed: string) => item.href.startsWith(allowed))
    );

    return (
        <div className="min-h-screen bg-[var(--background)] flex">
            {/* Left Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-300 z-40 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}
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
                    {visibleNav.map(item => {
                        const isActive = pathname.startsWith(item.href);
                        const showBadge = item.badge && exceptionCount > 0;
                        const isExceptions = item.href === '/franchisor/exceptions';
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ${
                                    isActive
                                        ? isExceptions && exceptionCount > 0
                                            ? 'bg-red-500/20 text-red-400 border-l-2 border-red-400'
                                            : 'bg-[var(--primary)]/20 text-[var(--primary)] border-l-2 border-[var(--primary)]'
                                        : isExceptions && exceptionCount > 0
                                            ? 'text-red-400 hover:bg-red-500/10'
                                            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                                }`}
                                title={sidebarCollapsed ? item.name : undefined}
                            >
                                <item.icon size={20} />
                                {!sidebarCollapsed && (
                                    <span className="text-sm font-medium flex-1">{item.name}</span>
                                )}
                                {showBadge && (
                                    <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white ${sidebarCollapsed ? 'absolute -top-1 -right-1' : ''}`}>
                                        {exceptionCount > 99 ? '99+' : exceptionCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* HQ Role chip + user at bottom */}
                {!sidebarCollapsed && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[var(--border)]">
                        {/* HQ Role indicator */}
                        <div className="px-2 pb-2">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${roleDef?.badgeStyle || 'bg-[var(--surface-hover)] text-[var(--text-muted)]'}`}>
                                <Shield size={10} />
                                {roleDef?.label || hqRole}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 px-2 py-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {user?.name?.charAt(0) || 'F'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.name || 'Franchisor'}</p>
                                <p className="text-xs text-[var(--text-muted)] truncate">{user?.email || ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-sm text-[var(--text-secondary)] hover:text-red-400 hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
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
                    <form
                        className="flex-1 max-w-xl"
                        onSubmit={e => {
                            e.preventDefault();
                            const q = searchQuery.trim();
                            if (!q) return;
                            router.push(`/franchisor/franchisees?search=${encodeURIComponent(q)}`);
                        }}
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                            <input
                                type="text"
                                placeholder="Search franchisee or location... (press Enter)"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                            />
                        </div>
                    </form>

                    <div className="flex items-center gap-2">
                        <button className="relative p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--primary)] rounded-full"></span>
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <div className="w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    {user?.name?.charAt(0) || 'F'}
                                </div>
                                <ChevronDown size={14} />
                            </button>

                            {profileMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 py-1">
                                        <div className="px-4 py-3 border-b border-[var(--border)]">
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name || 'Brand Owner'}</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{user?.email}</p>
                                            <span className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded text-xs font-bold ${roleDef?.badgeStyle || ''}`}>
                                                <Shield size={9} />
                                                {roleDef?.label || hqRole}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => signOut({ callbackUrl: '/login' })}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-[var(--surface-hover)] transition-colors"
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
