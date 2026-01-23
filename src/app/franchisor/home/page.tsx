'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Users, MapPin, Ticket, FileText, Wifi, AlertTriangle,
    ChevronRight, RefreshCw, Clock, CheckCircle, Loader2, DollarSign, Calendar
} from 'lucide-react';

type HomeTab = 'overview' | 'alerts';

interface DashboardStats {
    totalFranchisees: number;
    totalLocations: number;
    locationsActive: number;
    locationsPending: number;
    appointmentsBooked: number;
    appointmentsCompleted: number;
    appointmentsNoShow: number;
    walkIns: number;
    totalVisits: number;
    uniqueCustomers: number;
    revenue: number;
    noShowRate: number;
    alerts: Array<{ locationId: string; locationName: string; type: string; message: string }>;
}

function KpiCard({
    title,
    value,
    icon: Icon,
    variant = 'default',
    href,
    subtitle,
}: {
    title: string;
    value: number | string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    variant?: 'default' | 'warning' | 'danger' | 'success';
    href?: string;
    subtitle?: string;
}) {
    const variantClasses = {
        default: 'border-[var(--border)] hover:border-[var(--primary)]/50',
        warning: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50',
        danger: 'border-red-500/30 bg-red-500/5 hover:border-red-500/50',
        success: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50',
    };
    const iconClasses = {
        default: 'text-[var(--text-secondary)]',
        warning: 'text-amber-500',
        danger: 'text-red-500',
        success: 'text-emerald-500',
    };

    const content = (
        <div className={`glass-panel p-4 rounded-xl border transition-all hover:scale-[1.02] ${variantClasses[variant]}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-[var(--text-secondary)]">{title}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
                </div>
                <Icon size={24} className={iconClasses[variant]} />
            </div>
        </div>
    );

    return href ? <Link href={href}>{content}</Link> : content;
}

export default function FranchisorHomePage() {
    const [activeTab, setActiveTab] = useState<HomeTab>('overview');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchData() {
        setLoading(true);
        try {
            const res = await fetch('/api/franchisor/reports/command-center');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        }
        setLoading(false);
    }

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brand HQ Dashboard</h1>
                <button
                    onClick={() => fetchData()}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
                {(['overview', 'alerts'] as HomeTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab
                            ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {tab}
                        {tab === 'alerts' && stats?.alerts && stats.alerts.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                {stats.alerts.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && stats && (
                <>
                    {/* Row 1: Overview Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <KpiCard
                            title="Total Franchisees"
                            value={stats.totalFranchisees}
                            icon={Users}
                            href="/franchisor/franchisees"
                        />
                        <KpiCard
                            title="Total Locations"
                            value={stats.totalLocations}
                            icon={MapPin}
                            href="/franchisor/locations"
                            subtitle={`${stats.locationsActive} active, ${stats.locationsPending} pending`}
                        />
                        <KpiCard
                            title="Today's Revenue"
                            value={`$${(stats.revenue ?? 0).toLocaleString()}`}
                            icon={DollarSign}
                            variant="success"
                        />
                        <KpiCard
                            title="Unique Customers"
                            value={stats.uniqueCustomers ?? 0}
                            icon={Users}
                        />
                    </div>

                    {/* Row 2: Appointment Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <KpiCard
                            title="Appointments Booked"
                            value={stats.appointmentsBooked ?? 0}
                            icon={Calendar}
                        />
                        <KpiCard
                            title="Completed"
                            value={stats.appointmentsCompleted ?? 0}
                            icon={CheckCircle}
                            variant="success"
                        />
                        <KpiCard
                            title="Walk-ins"
                            value={stats.walkIns ?? 0}
                            icon={Users}
                        />
                        <KpiCard
                            title="No-Show Rate"
                            value={`${stats.noShowRate ?? 0}%`}
                            icon={AlertTriangle}
                            variant={(stats.noShowRate ?? 0) > 10 ? 'danger' : (stats.noShowRate ?? 0) > 5 ? 'warning' : 'default'}
                        />
                    </div>

                    {/* Alerts Panel */}
                    {stats.alerts && stats.alerts.length > 0 && (
                        <div className="glass-panel rounded-xl border border-red-500/30 bg-red-500/5 mb-6">
                            <div className="p-4 border-b border-red-500/20 flex items-center gap-2">
                                <AlertTriangle size={20} className="text-red-400" />
                                <h3 className="font-semibold text-red-400">Location Alerts ({stats.alerts.length})</h3>
                            </div>
                            <div className="divide-y divide-red-500/10">
                                {stats.alerts.slice(0, 5).map((alert, idx) => (
                                    <Link
                                        key={idx}
                                        href={`/franchisor/locations/${alert.locationId}`}
                                        className="block px-4 py-3 hover:bg-red-500/5 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{alert.locationName}</p>
                                                <p className="text-sm text-red-400">{alert.message}</p>
                                            </div>
                                            <ChevronRight size={16} className="text-[var(--text-muted)]" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Links */}
                    <div className="grid grid-cols-3 gap-4">
                        <Link
                            href="/franchisor/reports"
                            className="glass-panel p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all"
                        >
                            <h4 className="font-semibold text-[var(--text-primary)]">View Reports</h4>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Command Center, Leaderboard, Retention</p>
                        </Link>
                        <Link
                            href="/franchisor/locations"
                            className="glass-panel p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all"
                        >
                            <h4 className="font-semibold text-[var(--text-primary)]">Manage Locations</h4>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Add locations, check go-live status</p>
                        </Link>
                        <Link
                            href="/franchisor/franchisees"
                            className="glass-panel p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/50 transition-all"
                        >
                            <h4 className="font-semibold text-[var(--text-primary)]">Manage Franchisees</h4>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Add new franchisee LLCs</p>
                        </Link>
                    </div>
                </>
            )}

            {activeTab === 'alerts' && (
                <div className="glass-panel rounded-xl border border-[var(--border)]">
                    {stats?.alerts && stats.alerts.length > 0 ? (
                        <div className="divide-y divide-[var(--border)]">
                            {stats.alerts.map((alert, idx) => (
                                <Link
                                    key={idx}
                                    href={`/franchisor/locations/${alert.locationId}`}
                                    className="block px-4 py-4 hover:bg-[var(--surface-hover)] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={20} className={
                                            alert.type === 'no_activity' ? 'text-red-400' :
                                                alert.type === 'high_no_show' ? 'text-amber-400' : 'text-[var(--text-muted)]'
                                        } />
                                        <div className="flex-1">
                                            <p className="font-medium text-[var(--text-primary)]">{alert.locationName}</p>
                                            <p className="text-sm text-[var(--text-secondary)]">{alert.message}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-[var(--text-muted)]" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">All Clear!</h3>
                            <p className="text-[var(--text-secondary)] mt-2">No alerts at this time</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
