'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Search, MapPin, ChevronRight, Wifi, Ticket, AlertTriangle
} from 'lucide-react';

type LocationTab = 'list' | 'issues';

const MOCK_LOCATIONS = [
    { id: 'loc_1', name: 'Metro Downtown', franchisee: 'Metro Holdings LLC', city: 'Austin', state: 'TX', status: 'active', offlineDevices: 1, openTickets: 2, compliance: false },
    { id: 'loc_2', name: 'Metro North', franchisee: 'Metro Holdings LLC', city: 'Austin', state: 'TX', status: 'active', offlineDevices: 0, openTickets: 0, compliance: true },
    { id: 'loc_3', name: 'Bella Main St', franchisee: 'Bella Salon Group', city: 'Dallas', state: 'TX', status: 'active', offlineDevices: 0, openTickets: 1, compliance: true },
    { id: 'loc_4', name: 'Quick Stop Hwy 5', franchisee: 'Quick Stop LLC', city: 'Houston', state: 'TX', status: 'onboarding', offlineDevices: 0, openTickets: 0, compliance: true },
    { id: 'loc_5', name: 'Fresh Mart Plaza', franchisee: 'Fresh Mart Inc', city: 'San Antonio', state: 'TX', status: 'active', offlineDevices: 0, openTickets: 0, compliance: false },
];

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

export default function LocationsPage() {
    const [activeTab, setActiveTab] = useState<LocationTab>('list');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredLocations = MOCK_LOCATIONS.filter(loc => {
        if (activeTab === 'issues') return loc.offlineDevices > 0 || loc.openTickets > 0 || !loc.compliance;
        if (searchQuery && !loc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Locations</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
                {(['list', 'issues'] as LocationTab[]).map((tab) => (
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

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="Search locations..."
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
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Location Name</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Franchisee</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">City/State</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Offline</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Tickets</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Compliance</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLocations.map((location) => (
                            <tr key={location.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer">
                                <td className="px-4 py-3">
                                    <Link href={`/franchisor/locations/${location.id}`} className="flex items-center gap-2 hover:text-[var(--primary)]">
                                        <MapPin size={16} className="text-[var(--text-muted)]" />
                                        <span className="font-medium text-[var(--text-primary)]">{location.name}</span>
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">{location.franchisee}</td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">{location.city}, {location.state}</td>
                                <td className="px-4 py-3"><StatusBadge status={location.status} /></td>
                                <td className="px-4 py-3 text-center">
                                    {location.offlineDevices > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-red-400">
                                            <Wifi size={14} />
                                            {location.offlineDevices}
                                        </span>
                                    ) : (
                                        <span className="text-[var(--text-muted)]">0</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {location.openTickets > 0 ? (
                                        <span className="inline-flex items-center gap-1 text-amber-400">
                                            <Ticket size={14} />
                                            {location.openTickets}
                                        </span>
                                    ) : (
                                        <span className="text-[var(--text-muted)]">0</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {location.compliance ? (
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">OK</span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">Issue</span>
                                    )}
                                </td>
                                <td className="px-4 py-3"><ChevronRight size={16} className="text-[var(--text-muted)]" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

