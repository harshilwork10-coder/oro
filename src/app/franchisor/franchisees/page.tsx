'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Search, Filter, Plus, Users, ChevronRight,
    Store, Scissors, LayoutGrid, MapPin, Ticket
} from 'lucide-react';

type FranchiseeTab = 'all' | 'needs-attention' | 'onboarding' | 'suspended';

const MOCK_FRANCHISEES = [
    { id: 'fr_1', name: 'Metro Holdings LLC', type: 'retail', locations: 3, status: 'active', openTickets: 2, pendingRequests: 0, lastActivity: '1h ago' },
    { id: 'fr_2', name: 'Bella Salon Group', type: 'salon', locations: 2, status: 'active', openTickets: 1, pendingRequests: 1, lastActivity: '2h ago' },
    { id: 'fr_3', name: 'Quick Stop LLC', type: 'retail', locations: 1, status: 'onboarding', openTickets: 0, pendingRequests: 1, lastActivity: '3h ago' },
    { id: 'fr_4', name: 'Fresh Mart Inc', type: 'retail', locations: 4, status: 'active', openTickets: 0, pendingRequests: 0, lastActivity: '1d ago' },
    { id: 'fr_5', name: 'Style Studio', type: 'both', locations: 2, status: 'active', openTickets: 1, pendingRequests: 0, lastActivity: '5h ago' },
];

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

export default function FranchiseesPage() {
    const [activeTab, setActiveTab] = useState<FranchiseeTab>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFranchisees = MOCK_FRANCHISEES.filter(f => {
        if (activeTab === 'needs-attention') return f.openTickets > 0 || f.pendingRequests > 0;
        if (activeTab !== 'all' && f.status !== activeTab) return false;
        if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Franchisees</h1>
                <Link
                    href="/franchisor/requests/new?type=franchisee"
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    New Franchisee Request
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
                {(['all', 'needs-attention', 'onboarding', 'suspended'] as FranchiseeTab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab
                                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {tab.replace('-', ' ')}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="Search franchisees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Franchisee Name</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Type</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Locations</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Open Tickets</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Pending Requests</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Last Activity</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFranchisees.map((franchisee) => (
                            <tr key={franchisee.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer">
                                <td className="px-4 py-3">
                                    <Link href={`/franchisor/franchisees/${franchisee.id}`} className="flex items-center gap-2 hover:text-[var(--primary)]">
                                        <Users size={16} className="text-[var(--text-muted)]" />
                                        <span className="font-medium text-[var(--text-primary)]">{franchisee.name}</span>
                                    </Link>
                                </td>
                                <td className="px-4 py-3"><TypeBadge type={franchisee.type} /></td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                                        <MapPin size={12} />
                                        {franchisee.locations}
                                    </span>
                                </td>
                                <td className="px-4 py-3"><StatusBadge status={franchisee.status} /></td>
                                <td className="px-4 py-3 text-center">
                                    {franchisee.openTickets > 0 ? (
                                        <span className="text-amber-400 font-medium">{franchisee.openTickets}</span>
                                    ) : (
                                        <span className="text-[var(--text-muted)]">0</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {franchisee.pendingRequests > 0 ? (
                                        <span className="text-blue-400 font-medium">{franchisee.pendingRequests}</span>
                                    ) : (
                                        <span className="text-[var(--text-muted)]">0</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{franchisee.lastActivity}</td>
                                <td className="px-4 py-3"><ChevronRight size={16} className="text-[var(--text-muted)]" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

