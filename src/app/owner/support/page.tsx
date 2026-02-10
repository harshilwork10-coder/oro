'use client';

import { useState } from 'react';
import {
    Headphones, MessageSquare, Phone, Mail, Plus,
    Clock, CheckCircle, AlertCircle, ExternalLink, Send
} from 'lucide-react';

const MOCK_TICKETS = [
    { id: 'TKT-001', subject: 'POS not connecting to printer', status: 'open', priority: 'high', created: '2 hours ago', lastUpdate: '30 min ago' },
    { id: 'TKT-002', subject: 'Need help setting up dual pricing', status: 'in-progress', priority: 'medium', created: '1 day ago', lastUpdate: '3 hours ago' },
    { id: 'TKT-003', subject: 'Employee PIN not working', status: 'resolved', priority: 'low', created: '3 days ago', lastUpdate: '2 days ago' },
    { id: 'TKT-004', subject: 'Request for additional POS terminal', status: 'open', priority: 'medium', created: '5 days ago', lastUpdate: '4 days ago' },
];

const FAQ_ITEMS = [
    { q: 'How do I reset an employee PIN?', a: 'Go to Employees → Select employee → Reset PIN' },
    { q: 'How do I enable dual pricing?', a: 'Contact your provider to enable this feature in Account Configs' },
    { q: 'How do I pair a new POS terminal?', a: 'Go to Settings → Stations → Add Station and use the pairing code' },
    { q: 'How do I change my theme?', a: 'Go to Settings → Appearance and select a theme' },
];

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        open: 'bg-amber-500/20 text-amber-400',
        'in-progress': 'bg-blue-500/20 text-blue-400',
        resolved: 'bg-emerald-500/20 text-emerald-400',
        closed: 'bg-[var(--surface-hover)] text-[var(--text-muted)]',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${styles[status]}`}>
            {status.replace('-', ' ')}
        </span>
    );
}

function PriorityDot({ priority }: { priority: string }) {
    const colors: Record<string, string> = {
        high: 'bg-red-400',
        medium: 'bg-amber-400',
        low: 'bg-blue-400',
    };
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[priority]}`} />;
}

export default function SupportPage() {
    const [activeTab, setActiveTab] = useState<'tickets' | 'faq'>('tickets');

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Support</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Get help with your POS system</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                    <Plus size={16} />
                    New Ticket
                </button>
            </div>

            {/* Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Phone size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)]">(855) ORO-HELP</p>
                        <p className="text-xs text-[var(--text-muted)]">Mon–Fri 9AM–6PM EST</p>
                    </div>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Mail size={20} className="text-blue-400" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)]">support@oro9.com</p>
                        <p className="text-xs text-[var(--text-muted)]">24h response guaranteed</p>
                    </div>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <MessageSquare size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <p className="font-medium text-[var(--text-primary)]">Live Chat</p>
                        <p className="text-xs text-emerald-400">● Available now</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)] mb-6 w-fit">
                {(['tickets', 'faq'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${activeTab === tab
                            ? 'bg-[var(--primary)] text-white'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {tab === 'faq' ? 'FAQ' : 'My Tickets'}
                    </button>
                ))}
            </div>

            {activeTab === 'tickets' && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Ticket</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Subject</th>
                                <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Priority</th>
                                <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Status</th>
                                <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Last Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_TICKETS.map((ticket) => (
                                <tr key={ticket.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)] cursor-pointer">
                                    <td className="px-4 py-3 font-mono text-[var(--primary)] text-xs">{ticket.id}</td>
                                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{ticket.subject}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <PriorityDot priority={ticket.priority} />
                                            <span className="text-xs text-[var(--text-muted)] capitalize">{ticket.priority}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center"><StatusBadge status={ticket.status} /></td>
                                    <td className="px-4 py-3 text-center text-[var(--text-muted)]">{ticket.lastUpdate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'faq' && (
                <div className="space-y-3">
                    {FAQ_ITEMS.map((item, i) => (
                        <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                            <h3 className="font-medium text-[var(--text-primary)] mb-1">{item.q}</h3>
                            <p className="text-sm text-[var(--text-muted)]">{item.a}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
