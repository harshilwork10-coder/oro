'use client';

import {
    Bell, Search, ChevronDown, LogOut, Shield, Crown,
    LayoutDashboard, Users, MapPin, Rocket, DollarSign,
    Briefcase, BarChart3, Settings, Headphones, Package,
    Download
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { HQ_ROLES, type HQRole } from '@/lib/hqRole';

// ═══════════════════════════════════════════════════════
// NAVIGATION ITEMS — All core franchisor management pages
// ═══════════════════════════════════════════════════════

const NAV_ITEMS = [
    { name: 'Home', href: '/franchisor/home', icon: LayoutDashboard },
    { name: 'Franchisees', href: '/franchisor/franchisees', icon: Users },
    { name: 'Locations', href: '/franchisor/locations', icon: MapPin },
    { name: 'Requests', href: '/franchisor/requests', icon: Package },
    { name: 'Rollout', href: '/franchisor/rollout', icon: Rocket },
    { name: 'Royalties', href: '/franchisor/royalties', icon: DollarSign },
    { name: 'Catalog', href: '/franchisor/catalog', icon: Briefcase },
    { name: 'Reports', href: '/franchisor/reports', icon: BarChart3 },
    { name: 'Settings', href: '/franchisor/settings', icon: Settings },
];

export default function FranchisorLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // HQ sub-role for nav gating
    const [hqRole, setHqRole] = useState<HQRole>('OWNER');

    useEffect(() => {
        fetch('/api/franchisor/my-role')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.hqRole) setHqRole(data.hqRole as HQRole); })
            .catch(() => { /* remain at OWNER default */ });
    }, []);

    const user = session?.user as any;
    const roleDef = HQ_ROLES[hqRole];

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* ═══ Top Utility Bar ═══ */}
            <header className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur-lg border-b border-[var(--border)]">
                {/* Row 1: Brand + Search + Profile */}
                <div className="h-14 flex items-center px-6 gap-4">
                    {/* Brand Title */}
                    <Link href="/franchisor/home" className="flex items-center gap-2.5 mr-4 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                            <Crown className="h-4 w-4 text-violet-400" />
                        </div>
                        <span className="font-bold text-base bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] bg-clip-text text-transparent hidden sm:inline">
                            Brand HQ
                        </span>
                    </Link>

                    {/* Global Search */}
                    <form
                        className="flex-1 max-w-xl"
                        onSubmit={e => {
                            e.preventDefault();
                            const q = searchQuery.trim();
                            if (!q) return;
                            // If on franchisees page, dispatch search; else navigate with search param
                            if (pathname.includes('/franchisees')) {
                                window.dispatchEvent(new CustomEvent('hq-search', { detail: q }));
                            } else {
                                router.push(`/franchisor/franchisees?search=${encodeURIComponent(q)}`);
                            }
                        }}
                    >
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text"
                                placeholder="Search franchisees, locations, alerts…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-transparent transition-all"
                            />
                        </div>
                    </form>

                    <div className="flex items-center gap-2">
                        {/* Notifications */}
                        <button className="relative p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--primary)] rounded-full"></span>
                        </button>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-violet-700 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {user?.name?.charAt(0) || 'F'}
                                </div>
                                <ChevronDown size={12} />
                            </button>

                            {profileMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 py-1">
                                        <div className="px-4 py-3 border-b border-[var(--border)]">
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name || 'Brand Owner'}</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{user?.email}</p>
                                            <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-xs font-bold ${roleDef?.badgeStyle || 'bg-[var(--surface-hover)] text-[var(--text-muted)]'}`}>
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
                </div>

                {/* Row 2: Navigation Strip — All core franchisor management pages */}
                <nav className="px-6 border-t border-[var(--border)]/50">
                    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide -mb-px">
                        {NAV_ITEMS.map(item => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href || 
                                (item.href !== '/franchisor/home' && pathname.startsWith(item.href));
                            
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap
                                        transition-all duration-200 border-b-2
                                        ${isActive
                                            ? 'text-violet-400 border-violet-500 bg-violet-500/[0.04]'
                                            : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:border-[var(--border)]'
                                        }
                                    `}
                                >
                                    <Icon size={14} className={isActive ? 'text-violet-400' : ''} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </header>

            {/* Full-Width Content — no sidebar margin */}
            <main>
                {children}
            </main>
        </div>
    );
}
