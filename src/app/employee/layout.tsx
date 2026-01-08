'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ShoppingCart, Calendar, Clock, User, LogOut, Menu, X,
    Store, Scissors, HelpCircle, CheckCircle
} from 'lucide-react';

// Mock employee data - would come from auth in real app
const MOCK_EMPLOYEE = {
    id: 'emp_1',
    name: 'Emma Wilson',
    role: 'Stylist',
    businessType: 'salon' as const, // retail | salon | both
    shiftActive: true,
    shiftStart: '9:00 AM',
};

function getNavItems(businessType: 'retail' | 'salon' | 'both') {
    const common = [
        { name: 'POS', href: '/employee/pos', icon: ShoppingCart },
        { name: 'Time Clock', href: '/employee/time-clock', icon: Clock },
        { name: 'Help', href: '/employee/help', icon: HelpCircle },
    ];

    if (businessType === 'salon' || businessType === 'both') {
        return [
            { name: 'Check-In', href: '/employee/check-in', icon: CheckCircle },
            { name: 'Appointments', href: '/employee/appointments', icon: Calendar },
            ...common,
        ];
    }

    return common;
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const employee = MOCK_EMPLOYEE;

    const navItems = getNavItems(employee.businessType);

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Top Bar - Minimal */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-[var(--surface)] border-b border-[var(--border)] z-50 flex items-center px-4">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] mr-3 lg:hidden"
                >
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>

                <div className="flex items-center gap-2">
                    {employee.businessType === 'salon' ? (
                        <Scissors size={24} className="text-[var(--primary)]" />
                    ) : (
                        <Store size={24} className="text-[var(--primary)]" />
                    )}
                    <span className="font-bold text-lg text-[var(--text-primary)]">OroNext</span>
                </div>

                {/* Shift Status */}
                <div className="flex-1 flex justify-center">
                    {employee.shiftActive ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <Clock size={14} className="text-emerald-400" />
                            <span className="text-sm text-emerald-400">On Shift since {employee.shiftStart}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-hover)]">
                            <Clock size={14} className="text-[var(--text-muted)]" />
                            <span className="text-sm text-[var(--text-muted)]">Not clocked in</span>
                        </div>
                    )}
                </div>

                {/* Employee Info */}
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{employee.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{employee.role}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                </div>
            </header>

            {/* Sidebar - Minimal (only on larger screens or when toggled) */}
            <aside className={`fixed left-0 top-14 bottom-0 bg-[var(--surface)] border-r border-[var(--border)] z-40 transition-all duration-300 ${sidebarOpen ? 'w-48' : 'w-0 lg:w-16 overflow-hidden'
                }`}>
                <nav className="p-2 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href);

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-[var(--primary)] text-white'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span className={sidebarOpen ? '' : 'lg:hidden'}>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-[var(--border)]">
                    <Link
                        href="/login"
                        className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-red-400 transition-colors"
                    >
                        <LogOut size={20} />
                        <span className={sidebarOpen ? '' : 'lg:hidden'}>Logout</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`pt-14 min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-48' : 'ml-0 lg:ml-16'
                }`}>
                <div className="p-4 lg:p-6">
                    {children}
                </div>
            </main>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}

