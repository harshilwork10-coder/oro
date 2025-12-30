'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Users, MapPin, Ticket, FileText, Wifi, AlertTriangle,
    ChevronRight, RefreshCw, Clock, CheckCircle
} from 'lucide-react';

type HomeTab = 'overview' | 'alerts' | 'activity';

const MOCK_STATS = {
    totalFranchisees: 12,
    totalLocations: 28,
    openTickets: 5,
    pendingRequests: 3,
    offlineLocations: 2,
    highTicketLocations: 3,
    complianceExceptions: 4,
    recentlyActivated: 2,
};

const MOCK_NEEDS_ATTENTION = [
    { id: 1, location: 'Metro Downtown', franchisee: 'Metro Holdings', badges: ['offline', 'tickets'] },
    { id: 2, location: 'Quick Stop Hwy 5', franchisee: 'Quick Stop LLC', badges: ['compliance'] },
    { id: 3, location: 'Fresh Mart Plaza', franchisee: 'Fresh Mart Inc', badges: ['onboarding'] },
];

const MOCK_REQUESTS = [
    { id: 1, type: 'New Franchisee', name: 'Corner Store LLC', status: 'submitted', updated: '2h ago' },
    { id: 2, type: 'Add Location', name: 'Metro Holdings', status: 'in-review', updated: '1d ago' },
    { id: 3, type: 'Device Change', name: 'Bella Salon', status: 'approved', updated: '3d ago' },
];

function KpiCard({
    title,
    value,
    icon: Icon,
    variant = 'default',
    href,
}: {
    title: string;
    value: number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    variant?: 'default' | 'warning' | 'danger' | 'success';
    href?: string;
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
                </div>
                <Icon size={24} className={iconClasses[variant]} />
            </div>
        </div>
    );

    return href ? <Link href={href}>{content}</Link> : content;
}

function LocationBadge({ type }: { type: string }) {
    const badges: Record<string, { color: string; label: string }> = {
        offline: { color: 'bg-red-500/20 text-red-400', label: 'Offline' },
        tickets: { color: 'bg-amber-500/20 text-amber-400', label: 'Tickets' },
        compliance: { color: 'bg-purple-500/20 text-purple-400', label: 'Compliance' },
        onboarding: { color: 'bg-blue-500/20 text-blue-400', label: 'Onboarding' },
    };
    const config = badges[type] || { color: 'bg-stone-500/20 text-stone-400', label: type };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
}

function RequestStatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        submitted: 'bg-blue-500/20 text-blue-400',
        'in-review': 'bg-amber-500/20 text-amber-400',
        'waiting-docs': 'bg-orange-500/20 text-orange-400',
        approved: 'bg-emerald-500/20 text-emerald-400',
        shipped: 'bg-purple-500/20 text-purple-400',
        active: 'bg-green-500/20 text-green-400',
        rejected: 'bg-red-500/20 text-red-400',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || colors.submitted}`}>
            {status.replace('-', ' ')}
        </span>
    );
}

export default function FranchisorHomePage() {
    const [activeTab, setActiveTab] = useState<HomeTab>('overview');

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Brand HQ Dashboard</h1>
                <button className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors">
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
                {(['overview', 'alerts', 'activity'] as HomeTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab
                                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <>
                    {/* Row 1: Overview Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <KpiCard title="Total Franchisees" value={MOCK_STATS.totalFranchisees} icon={Users} href="/franchisor/franchisees" />
                        <KpiCard title="Total Locations" value={MOCK_STATS.totalLocations} icon={MapPin} href="/franchisor/locations" />
                        <KpiCard title="Open Tickets" value={MOCK_STATS.openTickets} icon={Ticket} variant={MOCK_STATS.openTickets > 0 ? 'warning' : 'default'} href="/franchisor/support" />
                        <KpiCard title="Pending Requests" value={MOCK_STATS.pendingRequests} icon={FileText} href="/franchisor/requests" />
                    </div>

                    {/* Row 2: Operational Cards */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <KpiCard title="Locations Offline" value={MOCK_STATS.offlineLocations} icon={Wifi} variant={MOCK_STATS.offlineLocations > 0 ? 'danger' : 'default'} />
                        <KpiCard title="High Ticket Volume" value={MOCK_STATS.highTicketLocations} icon={AlertTriangle} variant={MOCK_STATS.highTicketLocations > 0 ? 'warning' : 'default'} />
                        <KpiCard title="Compliance Issues" value={MOCK_STATS.complianceExceptions} icon={AlertTriangle} variant={MOCK_STATS.complianceExceptions > 0 ? 'warning' : 'default'} />
                        <KpiCard title="Recently Activated" value={MOCK_STATS.recentlyActivated} icon={CheckCircle} variant="success" />
                    </div>

                    {/* Row 3: Main Panels */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Needs Attention */}
                        <div className="glass-panel rounded-xl border border-[var(--border)]">
                            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                                <h3 className="font-semibold text-[var(--text-primary)]">Needs Attention</h3>
                                <Link href="/franchisor/locations?filter=issues" className="text-sm text-[var(--primary)] hover:underline">View all</Link>
                            </div>
                            <div className="divide-y divide-[var(--border)]">
                                {MOCK_NEEDS_ATTENTION.map((item) => (
                                    <div key={item.id} className="px-4 py-3 hover:bg-[var(--surface-hover)] cursor-pointer transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{item.location}</p>
                                                <p className="text-sm text-[var(--text-muted)]">{item.franchisee}</p>
                                            </div>
                                            <ChevronRight size={16} className="text-[var(--text-muted)]" />
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            {item.badges.map((badge) => (
                                                <LocationBadge key={badge} type={badge} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Requests */}
                        <div className="glass-panel rounded-xl border border-[var(--border)]">
                            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                                <h3 className="font-semibold text-[var(--text-primary)]">Recent Requests</h3>
                                <Link href="/franchisor/requests" className="text-sm text-[var(--primary)] hover:underline">View all</Link>
                            </div>
                            <div className="divide-y divide-[var(--border)]">
                                {MOCK_REQUESTS.map((request) => (
                                    <div key={request.id} className="px-4 py-3 hover:bg-[var(--surface-hover)] cursor-pointer transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{request.type}</p>
                                                <p className="text-sm text-[var(--text-muted)]">{request.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <RequestStatusBadge status={request.status} />
                                                <span className="text-xs text-[var(--text-muted)]">{request.updated}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'alerts' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                    <AlertTriangle size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Alerts</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Real-time alerts will appear here</p>
                </div>
            )}

            {activeTab === 'activity' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                    <Clock size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Activity</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Recent activity will appear here</p>
                </div>
            )}
        </div>
    );
}

