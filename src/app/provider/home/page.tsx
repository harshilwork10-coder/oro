'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    FileText, AlertTriangle, Package, Truck, Wifi, WifiOff, TrendingDown,
    Ticket, DollarSign, Clock, RefreshCw, ChevronRight, User, Building2
} from 'lucide-react';

type TabType = 'overview' | 'support' | 'ops';

// KPI Card Component
function KpiCard({
    title,
    value,
    subtitle,
    icon: Icon,
    variant = 'default',
    href,
    trend
}: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    variant?: 'default' | 'warning' | 'danger' | 'success';
    href?: string;
    trend?: { value: number; label: string };
}) {
    const variantClasses = {
        default: 'border-stone-700 hover:border-stone-600',
        warning: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50',
        danger: 'border-red-500/30 bg-red-500/5 hover:border-red-500/50',
        success: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50',
    };

    const iconClasses = {
        default: 'text-stone-400',
        warning: 'text-amber-500',
        danger: 'text-red-500',
        success: 'text-emerald-500',
    };

    const content = (
        <div className={`p-4 rounded-xl border bg-stone-900/50 transition-all hover:scale-[1.02] ${variantClasses[variant]}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-stone-400">{title}</p>
                    <p className="text-2xl font-bold text-stone-100 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-stone-500 mt-1">{subtitle}</p>}
                    {trend && (
                        <p className={`text-xs mt-1 ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
                        </p>
                    )}
                </div>
                <Icon size={24} className={iconClasses[variant]} />
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return content;
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        submitted: 'bg-blue-500/20 text-blue-400',
        'in-review': 'bg-purple-500/20 text-purple-400',
        'waiting-docs': 'bg-amber-500/20 text-amber-400',
        approved: 'bg-emerald-500/20 text-emerald-400',
        open: 'bg-blue-500/20 text-blue-400',
        urgent: 'bg-red-500/20 text-red-400',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || 'bg-stone-700 text-stone-300'}`}>{status.replace('-', ' ')}</span>;
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
    const colors: Record<string, string> = {
        P1: 'bg-red-500 text-white',
        P2: 'bg-orange-500 text-white',
        P3: 'bg-amber-500 text-white',
        P4: 'bg-blue-500 text-white',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[priority] || 'bg-stone-600 text-stone-200'}`}>{priority}</span>;
}

export default function ProviderHomePage() {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [loading, setLoading] = useState(true);
    // All stats start at 0 - will be populated from API
    const [stats, setStats] = useState({
        onboardingPending: 0,
        docsMissing: 0,
        hardwareToAssign: 0,
        shipmentsToSend: 0,
        offlineDevices: 0,
        highDeclineLocations: 0,
        openTickets: 0,
        slaAtRisk: 0,
        billingPastDue: 0,
    });

    // Empty queues - will be populated from API
    const [onboardingQueue, setOnboardingQueue] = useState<{ id: string; type: string; client: string; status: string; age: string; agent: string | null }[]>([]);
    const [ticketQueue, setTicketQueue] = useState<{ id: string; priority: string; client: string; location: string; category: string; status: string; sla: string }[]>([]);

    useEffect(() => {
        // TODO: Fetch from /api/provider/dashboard
        setLoading(false);
    }, []);

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Provider Dashboard</h1>
                    <p className="text-sm text-stone-400 mt-1">Welcome back! Here's what needs attention.</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-2 text-sm text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors">
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-stone-800">
                {(['overview', 'support', 'ops'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab
                            ? 'text-orange-400 border-b-2 border-orange-500'
                            : 'text-stone-400 hover:text-stone-200'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <>
                    {/* Row 1: Onboarding KPIs */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <KpiCard
                            title="Onboarding Pending"
                            value={stats.onboardingPending}
                            icon={FileText}
                            href="/provider/onboarding?status=pending"
                            trend={{ value: 12, label: 'this week' }}
                        />
                        <KpiCard
                            title="Docs Missing"
                            value={stats.docsMissing}
                            icon={AlertTriangle}
                            variant="warning"
                            href="/provider/onboarding?status=waiting-docs"
                        />
                        <KpiCard
                            title="Hardware To Assign"
                            value={stats.hardwareToAssign}
                            icon={Package}
                            variant="warning"
                            href="/provider/onboarding?filter=needs-devices"
                        />
                        <KpiCard
                            title="Shipments To Send"
                            value={stats.shipmentsToSend}
                            icon={Truck}
                            href="/provider/onboarding?tab=shipping"
                        />
                    </div>

                    {/* Row 2: Operations KPIs */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <KpiCard
                            title="Offline Devices"
                            value={stats.offlineDevices}
                            icon={WifiOff}
                            variant={stats.offlineDevices > 0 ? 'danger' : 'success'}
                            href="/provider/devices?filter=offline"
                        />
                        <KpiCard
                            title="High Decline Locations"
                            value={stats.highDeclineLocations}
                            icon={TrendingDown}
                            variant={stats.highDeclineLocations > 0 ? 'danger' : 'success'}
                            href="/provider/monitoring?tab=payments"
                        />
                        <KpiCard
                            title="Open Tickets"
                            value={stats.openTickets}
                            subtitle={`${stats.slaAtRisk} SLA at risk`}
                            icon={Ticket}
                            variant={stats.slaAtRisk > 0 ? 'warning' : 'default'}
                            href="/provider/tickets?status=open"
                        />
                        <KpiCard
                            title="Billing Past Due"
                            value={stats.billingPastDue}
                            icon={DollarSign}
                            variant={stats.billingPastDue > 0 ? 'danger' : 'success'}
                            href="/provider/billing?filter=past-due"
                        />
                    </div>

                    {/* Main Panels */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Onboarding Queue Preview */}
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800">
                            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                                <h2 className="font-semibold text-stone-100">Onboarding Queue</h2>
                                <Link href="/provider/onboarding" className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1">
                                    View all <ChevronRight size={14} />
                                </Link>
                            </div>
                            {onboardingQueue.length === 0 ? (
                                <div className="p-8 text-center">
                                    <FileText size={32} className="mx-auto text-stone-600 mb-2" />
                                    <p className="text-stone-400 text-sm">No onboarding requests</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-stone-800">
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Request</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Type</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Client</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Status</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Age</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Agent</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {onboardingQueue.map((req) => (
                                                <tr key={req.id} className="border-b border-stone-800/50 hover:bg-stone-800/30 cursor-pointer">
                                                    <td className="px-4 py-2">
                                                        <Link href={`/provider/onboarding/${req.id}`} className="font-mono text-orange-400 hover:underline text-xs">
                                                            {req.id}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-2 text-stone-300">{req.type}</td>
                                                    <td className="px-4 py-2 text-stone-100 font-medium">{req.client}</td>
                                                    <td className="px-4 py-2"><StatusBadge status={req.status} /></td>
                                                    <td className="px-4 py-2 text-stone-400 flex items-center gap-1">
                                                        <Clock size={12} />{req.age}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        {req.agent ? (
                                                            <span className="flex items-center gap-1 text-stone-300">
                                                                <User size={12} />{req.agent}
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-400 text-xs">Unassigned</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Ticket Queue Preview */}
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800">
                            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                                <h2 className="font-semibold text-stone-100">Ticket Queue</h2>
                                <Link href="/provider/tickets" className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1">
                                    View all <ChevronRight size={14} />
                                </Link>
                            </div>
                            {ticketQueue.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Ticket size={32} className="mx-auto text-stone-600 mb-2" />
                                    <p className="text-stone-400 text-sm">No open tickets</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-stone-800">
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Priority</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Client</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Location</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Category</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">Status</th>
                                                <th className="px-4 py-2 text-left text-stone-500 font-medium">SLA</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ticketQueue.map((ticket) => (
                                                <tr key={ticket.id} className="border-b border-stone-800/50 hover:bg-stone-800/30 cursor-pointer">
                                                    <td className="px-4 py-2"><PriorityBadge priority={ticket.priority} /></td>
                                                    <td className="px-4 py-2 text-stone-100 font-medium">{ticket.client}</td>
                                                    <td className="px-4 py-2 text-stone-300">{ticket.location}</td>
                                                    <td className="px-4 py-2 text-stone-400">{ticket.category}</td>
                                                    <td className="px-4 py-2"><StatusBadge status={ticket.status} /></td>
                                                    <td className="px-4 py-2 text-amber-400 font-mono text-xs">{ticket.sla}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'support' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-8 text-center">
                    <Ticket size={48} className="mx-auto text-stone-600 mb-4" />
                    <h2 className="text-lg font-semibold text-stone-100">Support Queue</h2>
                    <p className="text-stone-400 mt-2">Detailed support ticket management coming in this view</p>
                    <Link href="/provider/tickets" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors">
                        Go to Tickets <ChevronRight size={16} />
                    </Link>
                </div>
            )}

            {activeTab === 'ops' && (
                <div className="bg-stone-900/50 rounded-xl border border-stone-800 p-8 text-center">
                    <Wifi size={48} className="mx-auto text-stone-600 mb-4" />
                    <h2 className="text-lg font-semibold text-stone-100">Operations Overview</h2>
                    <p className="text-stone-400 mt-2">Device health and payment monitoring in this view</p>
                    <Link href="/provider/monitoring" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm transition-colors">
                        Go to Monitoring <ChevronRight size={16} />
                    </Link>
                </div>
            )}
        </div>
    );
}
