'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Search, Plus, FileText, ChevronRight, Clock, Users, MapPin, HardDrive
} from 'lucide-react';

type RequestTab = 'all' | 'submitted' | 'in-review' | 'waiting-docs' | 'approved' | 'shipped' | 'active' | 'rejected';

const MOCK_REQUESTS = [
    { id: 'req_1', type: 'New Franchisee', franchisee: 'Corner Store LLC', locations: 2, hardware: '2 terminals, 2 stations', status: 'submitted', updated: '2h ago', agent: null },
    { id: 'req_2', type: 'Add Location', franchisee: 'Metro Holdings LLC', locations: 1, hardware: '1 terminal, 1 station', status: 'in-review', updated: '1d ago', agent: 'John D.' },
    { id: 'req_3', type: 'Device Change', franchisee: 'Bella Salon Group', locations: 1, hardware: 'Replace terminal', status: 'approved', updated: '3d ago', agent: 'Sarah M.' },
    { id: 'req_4', type: 'New Franchisee', franchisee: 'Quick Mart Inc', locations: 3, hardware: '3 terminals, 3 stations', status: 'waiting-docs', updated: '4d ago', agent: 'John D.' },
    { id: 'req_5', type: 'Add Location', franchisee: 'Fresh Mart Inc', locations: 1, hardware: '1 terminal', status: 'shipped', updated: '5d ago', agent: 'Sarah M.' },
];

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

function RequestTypeBadge({ type }: { type: string }) {
    const config: Record<string, { icon: React.ComponentType<{ size?: number }>; color: string }> = {
        'New Franchisee': { icon: Users, color: 'bg-blue-500/20 text-blue-400' },
        'Add Location': { icon: MapPin, color: 'bg-emerald-500/20 text-emerald-400' },
        'Device Change': { icon: HardDrive, color: 'bg-purple-500/20 text-purple-400' },
    };
    const { icon: Icon, color } = config[type] || { icon: FileText, color: 'bg-stone-500/20 text-stone-400' };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            <Icon size={12} />
            {type}
        </span>
    );
}

export default function RequestsPage() {
    const [activeTab, setActiveTab] = useState<RequestTab>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const tabs: { id: RequestTab; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'submitted', label: 'Submitted' },
        { id: 'in-review', label: 'In Review' },
        { id: 'waiting-docs', label: 'Waiting Docs' },
        { id: 'approved', label: 'Approved' },
        { id: 'shipped', label: 'Shipped' },
        { id: 'active', label: 'Active' },
        { id: 'rejected', label: 'Rejected' },
    ];

    const filteredRequests = MOCK_REQUESTS.filter(req => {
        if (activeTab !== 'all' && req.status !== activeTab) return false;
        if (searchQuery && !req.franchisee.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Requests</h1>
                <Link
                    href="/franchisor/requests/new"
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus size={16} />
                    New Request
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border)] overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {tab.label}
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
                            placeholder="Search requests..."
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
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Request Type</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Franchisee</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Locations</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Hardware</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Updated</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Provider Assigned</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.map((request) => (
                            <tr key={request.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer">
                                <td className="px-4 py-3"><RequestTypeBadge type={request.type} /></td>
                                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{request.franchisee}</td>
                                <td className="px-4 py-3 text-center text-[var(--text-secondary)]">{request.locations}</td>
                                <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{request.hardware}</td>
                                <td className="px-4 py-3"><RequestStatusBadge status={request.status} /></td>
                                <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{request.updated}</td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">{request.agent || '—'}</td>
                                <td className="px-4 py-3"><ChevronRight size={16} className="text-[var(--text-muted)]" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

