'use client';

import { useState } from 'react';
import { Plus, Ticket, AlertTriangle, BookOpen, ChevronRight, Search, Clock } from 'lucide-react';

type SupportTab = 'tickets' | 'escalations' | 'kb';

const MOCK_TICKETS = [
    { id: 'TK-101', priority: 'P2', sla: '4h', franchisee: 'Metro Holdings', location: 'Downtown', category: 'Device', status: 'open', updated: '1h ago' },
    { id: 'TK-102', priority: 'P3', sla: '8h', franchisee: 'Bella Salon', location: 'Main St', category: 'Appointments', status: 'waiting', updated: '3h ago' },
    { id: 'TK-103', priority: 'P1', sla: '2h', franchisee: 'Quick Stop', location: 'Hwy 5', category: 'Settlement', status: 'escalated', updated: '30m ago' },
];

function PriorityBadge({ priority }: { priority: string }) {
    const colors: Record<string, string> = {
        P1: 'bg-red-500 text-white',
        P2: 'bg-amber-500 text-white',
        P3: 'bg-blue-500 text-white',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[priority] || colors.P3}`}>
            {priority}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        open: 'bg-blue-500/20 text-blue-400',
        waiting: 'bg-amber-500/20 text-amber-400',
        escalated: 'bg-red-500/20 text-red-400',
        closed: 'bg-emerald-500/20 text-emerald-400',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || colors.open}`}>
            {status}
        </span>
    );
}

export default function SupportPage() {
    const [activeTab, setActiveTab] = useState<SupportTab>('tickets');
    const [searchQuery, setSearchQuery] = useState('');

    const tabs: { id: SupportTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
        { id: 'tickets', label: 'Tickets', icon: Ticket },
        { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
        { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Support</h1>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                    <Plus size={16} />
                    Create Ticket
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 max-w-sm relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                    <input
                        type="text"
                        placeholder="Search tickets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                </div>
            </div>

            {activeTab === 'tickets' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Priority</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">SLA</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Franchisee</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Location</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Category</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Updated</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_TICKETS.map((ticket) => (
                                <tr key={ticket.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer">
                                    <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                                    <td className="px-4 py-3 font-mono text-xs text-amber-400">{ticket.sla}</td>
                                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{ticket.franchisee}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{ticket.location}</td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{ticket.category}</td>
                                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{ticket.updated}</td>
                                    <td className="px-4 py-3"><ChevronRight size={16} className="text-[var(--text-muted)]" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab !== 'tickets' && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                    {activeTab === 'escalations' ? (
                        <AlertTriangle size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    ) : (
                        <BookOpen size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    )}
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{tabs.find(t => t.id === activeTab)?.label}</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Coming soon</p>
                </div>
            )}
        </div>
    );
}

