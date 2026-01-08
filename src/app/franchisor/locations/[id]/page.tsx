'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import {
    ChevronLeft, MapPin, HardDrive, Ticket, AlertTriangle,
    FileText, Wifi, WifiOff, Copy, MessageSquare
} from 'lucide-react';

type LocationTab = 'overview' | 'devices' | 'tickets' | 'compliance' | 'notes';

const MOCK_LOCATION = {
    id: 'loc_1',
    name: 'Metro Downtown',
    franchisee: 'Metro Holdings LLC',
    franchiseeId: 'fr_1',
    address: '123 Main St, Austin, TX 78701',
    status: 'active',
    devices: [
        { id: 'd_1', type: 'Terminal', model: 'PAX A920', serial: 'PAX123456', status: 'online', lastHeartbeat: '2m ago' },
        { id: 'd_2', type: 'Terminal', model: 'PAX A920', serial: 'PAX789012', status: 'offline', lastHeartbeat: '4h ago' },
        { id: 'd_3', type: 'Station', model: 'Register 1', serial: 'REG-001', status: 'online', lastHeartbeat: '1m ago' },
    ],
    tickets: [
        { id: 'TK-001', priority: 'P2', category: 'Device', subject: 'Terminal offline', status: 'open', updated: '1h ago' },
    ],
};

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        active: 'bg-emerald-500/20 text-emerald-400',
        onboarding: 'bg-amber-500/20 text-amber-400',
        suspended: 'bg-red-500/20 text-red-400',
        online: 'bg-emerald-500/20 text-emerald-400',
        offline: 'bg-red-500/20 text-red-400',
        open: 'bg-blue-500/20 text-blue-400',
        waiting: 'bg-amber-500/20 text-amber-400',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || colors.active}`}>
            {status}
        </span>
    );
}

export default function LocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState<LocationTab>('overview');
    const location = MOCK_LOCATION;

    const tabs: { id: LocationTab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
        { id: 'overview', label: 'Overview', icon: MapPin },
        { id: 'devices', label: 'Devices', icon: HardDrive },
        { id: 'tickets', label: 'Tickets', icon: Ticket },
        { id: 'compliance', label: 'Compliance', icon: AlertTriangle },
        { id: 'notes', label: 'Notes', icon: FileText },
    ];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <Link
                    href="/franchisor/locations"
                    className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ChevronLeft size={20} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{location.name}</h1>
                        <StatusBadge status={location.status} />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)]">
                        <Link href={`/franchisor/franchisees/${location.franchiseeId}`} className="hover:text-[var(--primary)]">
                            {location.franchisee}
                        </Link>
                        {' • '}{location.address}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
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

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl border border-[var(--border)]">
                            <p className="text-sm text-[var(--text-secondary)]">Status</p>
                            <p className="text-xl font-bold text-emerald-400 mt-1 capitalize">{location.status}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-[var(--border)]">
                            <p className="text-sm text-[var(--text-secondary)]">Devices</p>
                            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{location.devices.length}</p>
                        </div>
                        <div className="p-4 rounded-xl border border-[var(--border)]">
                            <p className="text-sm text-[var(--text-secondary)]">Open Tickets</p>
                            <p className="text-xl font-bold text-amber-400 mt-1">{location.tickets.length}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'devices' && (
                <div className="space-y-4">
                    {/* Important notice */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-400">
                            ℹ️ Devices are assigned by Provider. To request changes, use "Request Device Change" below.
                        </p>
                    </div>

                    <div className="glass-panel rounded-xl border border-[var(--border)]">
                        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                            <h3 className="font-semibold text-[var(--text-primary)]">Devices</h3>
                            <Link
                                href="/franchisor/support?action=device-change"
                                className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors"
                            >
                                <MessageSquare size={14} />
                                Request Device Change
                            </Link>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)]">
                                    <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Type</th>
                                    <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Model</th>
                                    <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Serial</th>
                                    <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                                    <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Last Heartbeat</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {location.devices.map((device) => (
                                    <tr key={device.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">{device.type}</td>
                                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{device.model}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">{device.serial}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${device.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                }`}>
                                                {device.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                                                {device.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{device.lastHeartbeat}</td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => copyToClipboard(device.serial)}
                                                className="p-1.5 hover:bg-[var(--surface-active)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                title="Copy serial"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {location.devices.length === 0 && (
                            <div className="p-8 text-center">
                                <HardDrive size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                                <p className="text-[var(--text-secondary)]">No devices assigned yet</p>
                                <p className="text-xs text-[var(--text-muted)] mt-2">Devices will appear here after Provider assigns them</p>
                            </div>
                        )}
                    </div>
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
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Category</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Subject</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                                <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {location.tickets.map((ticket) => (
                                <tr key={ticket.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                    <td className="px-4 py-3 font-mono text-xs">{ticket.id}</td>
                                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white">{ticket.priority}</span></td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{ticket.category}</td>
                                    <td className="px-4 py-3 text-[var(--text-primary)]">{ticket.subject}</td>
                                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{ticket.updated}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(activeTab === 'compliance' || activeTab === 'notes') && (
                <div className="glass-panel rounded-xl border border-[var(--border)] p-8 text-center">
                    <FileText size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{tabs.find(t => t.id === activeTab)?.label}</h3>
                    <p className="text-[var(--text-secondary)] mt-2">Coming soon</p>
                </div>
            )}
        </div>
    );
}
