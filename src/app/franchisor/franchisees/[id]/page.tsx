'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, Users, MapPin, Ticket, FileText,
    AlertTriangle, Plus, MoreHorizontal, Store, Scissors, LayoutGrid
} from 'lucide-react';

type FranchiseeTab = 'overview' | 'locations' | 'tickets' | 'compliance' | 'requests' | 'notes';

const MOCK_FRANCHISEE = {
    id: 'fr_1',
    name: 'Metro Holdings LLC',
    type: 'retail',
    status: 'active',
    locationCount: 3,
    openTickets: 2,
    complianceStatus: 'ok',
    pendingRequests: 0,
    locations: [
        { id: 'loc_1', name: 'Downtown', city: 'Austin', state: 'TX', status: 'active', offlineDevices: 1, openTickets: 1 },
        { id: 'loc_2', name: 'North Austin', city: 'Austin', state: 'TX', status: 'active', offlineDevices: 0, openTickets: 1 },
        { id: 'loc_3', name: 'South Lamar', city: 'Austin', state: 'TX', status: 'active', offlineDevices: 0, openTickets: 0 },
    ],
    tickets: [
        { id: 'TK-001', priority: 'P2', location: 'Downtown', category: 'Device', subject: 'Terminal offline', status: 'open', updated: '1h ago' },
        { id: 'TK-002', priority: 'P3', location: 'North Austin', category: 'POS', subject: 'Receipt printer issue', status: 'waiting', updated: '3h ago' },
    ],
};

function TypeBadge({ type }: { type: string }) {
    const config: Record<string, { icon: React.ComponentType<{ size?: number }>; color: string; label: string }> = {
        retail: { icon: Store, color: 'bg-blue-500/20 text-blue-400', label: 'Retail' },
        salon: { icon: Scissors, color: 'bg-pink-500/20 text-pink-400', label: 'Salon' },
        both: { icon: LayoutGrid, color: 'bg-purple-500/20 text-purple-400', label: 'Both' },
    };
    const { icon: Icon, color, label } = config[type] || config.retail;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            <Icon size={12} />
            {label}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        active: 'bg-emerald-500/20 text-emerald-400',
        onboarding: 'bg-amber-500/20 text-amber-400',
        suspended: 'bg-red-500/20 text-red-400',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || colors.active}`}>
            {status}
        </span>
    );
}

function KpiCard({ title, value, variant = 'default' }: { title: string; value: string | number; variant?: 'default' | 'warning' | 'success' }) {
    const variantClasses = {
        default: 'border-[var(--border)]',
        warning: 'border-amber-500/30 bg-amber-500/5',
        success: 'border-emerald-500/30 bg-emerald-500/5',
    };
    return (
        <div className={`p-4 rounded-xl border ${variantClasses[variant]}`}>
            <p className="text-sm text-[var(--text-secondary)]">{title}</p>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
        </div>
    );
}

export default function FranchiseeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState<FranchiseeTab>('overview');
    const franchisee = MOCK_FRANCHISEE;

    const tabs: { id: FranchiseeTab; label: string }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'locations', label: 'Locations' },
        { id: 'tickets', label: 'Tickets' },
        { id: 'compliance', label: 'Compliance' },
        { id: 'requests', label: 'Requests' },
        { id: 'notes', label: 'Notes' },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <Link
                    href="/franchisor/franchisees"
                    className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ChevronLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{franchisee.name}</h1>
                        <StatusBadge status={franchisee.status} />
                        <TypeBadge type={franchisee.type} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                        <KpiCard title="Locations" value={franchisee.locationCount} />
                        <KpiCard title="Open Tickets" value={franchisee.openTickets} variant={franchisee.openTickets > 0 ? 'warning' : 'default'} />
                        <KpiCard title="Compliance" value="OK" variant="success" />
                        <KpiCard title="Pending Requests" value={franchisee.pendingRequests} />
                    </div>
                </div>
            )}

            {activeTab === 'locations' && (
                <div className="glass-panel rounded-xl border border-[var(--border)]">
                    <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                        <h3 className="font-semibold text-[var(--text-primary)]">Locations</h3>
                        <Link
                            href="/franchisor/requests/new?type=location"
                            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-sm hover:bg-[var(--primary-dark)]"
                        >
                            <Plus size={14} />
                            Add Location Request
                        </Link>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)]">
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Name</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">City/State</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                                <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Offline</th>
                                <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Tickets</th>
                            </tr>
                        </thead>
                        <tbody>
                            {franchisee.locations.map((loc) => (
                                <tr key={loc.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                    <td className="px-4 py-3">
                                        <Link href={`/franchisor/locations/${loc.id}`} className="font-medium text-[var(--text-primary)] hover:text-[var(--primary)]">
                                            {loc.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{loc.city}, {loc.state}</td>
                                    <td className="px-4 py-3"><StatusBadge status={loc.status} /></td>
                                    <td className="px-4 py-3 text-center">{loc.offlineDevices > 0 ? <span className="text-red-400">{loc.offlineDevices}</span> : '0'}</td>
                                    <td className="px-4 py-3 text-center">{loc.openTickets > 0 ? <span className="text-amber-400">{loc.openTickets}</span> : '0'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'tickets' && (
                <div className="glass-panel rounded-xl border border-[var(--border)]">
                    <div className="p-4 border-b border-[var(--border)]">
                        <h3 className="font-semibold text-[var(--text-primary)]">Tickets</h3>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)]">
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">ID</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Priority</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Location</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Subject</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {franchisee.tickets.map((ticket) => (
                                <tr key={ticket.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                    <td className="px-4 py-3 font-mono text-xs">{ticket.id}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white">{ticket.priority}</span></td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{ticket.location}</td>
                                    <td className="px-4 py-3 text-[var(--text-primary)]">{ticket.subject}</td>
                                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{ticket.updated}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(activeTab === 'compliance' || activeTab === 'requests' || activeTab === 'notes') && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                    <FileText size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{tabs.find(t => t.id === activeTab)?.label}</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Coming soon</p>
                </div>
            )}
        </div>
    );
}
