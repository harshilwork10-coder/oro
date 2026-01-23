'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Search, MapPin, ChevronRight, Loader2, Building2, Store, Monitor,
    Clock, CheckCircle, AlertCircle, Play
} from 'lucide-react';

interface ProvisioningTask {
    id: string;
    locationId: string;
    locationName: string;
    locationAddress: string | null;
    locationStatus: string;
    stationCount: number;
    franchisorId: string;
    franchisorName: string;
    franchiseeId: string;
    franchiseeName: string;
    requestedDevicesCount: number | null;
    notes: string | null;
    status: string;
    assignedToUserId: string | null;
    createdAt: string;
    updatedAt: string;
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
        OPEN: {
            bg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
            icon: <AlertCircle size={12} />,
            label: 'Open'
        },
        IN_PROGRESS: {
            bg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
            icon: <Play size={12} />,
            label: 'In Progress'
        },
        DONE: {
            bg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
            icon: <CheckCircle size={12} />,
            label: 'Done'
        },
    };
    const config = colors[status] || colors.OPEN;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bg}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

type TabFilter = 'all' | 'OPEN' | 'IN_PROGRESS' | 'DONE';

export default function ProvisioningQueuePage() {
    const [tasks, setTasks] = useState<ProvisioningTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabFilter>('all');

    useEffect(() => {
        fetchTasks();
    }, []);

    async function fetchTasks() {
        try {
            const res = await fetch('/api/provider/provisioning-tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredTasks = tasks.filter(task => {
        if (activeTab !== 'all' && task.status !== activeTab) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                task.locationName.toLowerCase().includes(query) ||
                task.franchisorName.toLowerCase().includes(query) ||
                task.franchiseeName.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const openCount = tasks.filter(t => t.status === 'OPEN').length;
    const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-stone-100">Provisioning Queue</h1>
                    <p className="text-stone-500 text-sm mt-1">
                        Locations waiting for device setup and pairing
                    </p>
                </div>
                {openCount > 0 && (
                    <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg px-4 py-2">
                        <span className="text-amber-400 font-medium">{openCount} new</span>
                        <span className="text-stone-500 ml-1">location{openCount !== 1 ? 's' : ''} pending</span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-stone-800">
                {[
                    { key: 'all', label: 'All', count: tasks.length },
                    { key: 'OPEN', label: 'Open', count: openCount },
                    { key: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
                    { key: 'DONE', label: 'Done', count: tasks.filter(t => t.status === 'DONE').length },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as TabFilter)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key
                                ? 'text-amber-400 border-b-2 border-amber-400'
                                : 'text-stone-500 hover:text-stone-300'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-xs bg-stone-800">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search by location, brand, or LLC..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-800 border border-stone-700 rounded-lg py-2 pl-9 pr-4 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {filteredTasks.length === 0 && (
                <div className="text-center py-12 bg-stone-900/50 border border-stone-800 rounded-xl">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-stone-300 mb-2">All Caught Up!</h3>
                    <p className="text-stone-500">
                        {activeTab === 'all'
                            ? 'No provisioning tasks yet. They appear when HQ adds locations.'
                            : `No ${activeTab.toLowerCase().replace('_', ' ')} tasks.`
                        }
                    </p>
                </div>
            )}

            {/* Task Cards */}
            {filteredTasks.length > 0 && (
                <div className="space-y-3">
                    {filteredTasks.map((task) => (
                        <Link
                            key={task.id}
                            href={`/provider/provisioning/${task.id}`}
                            className="block bg-stone-900/50 border border-stone-800 rounded-xl p-4 hover:border-stone-700 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Store className="h-5 w-5 text-amber-400" />
                                        <span className="font-medium text-stone-100">{task.locationName}</span>
                                        <StatusBadge status={task.status} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-stone-400">
                                            <Building2 size={14} className="text-stone-600" />
                                            <span className="truncate">{task.franchisorName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-stone-400">
                                            <Store size={14} className="text-stone-600" />
                                            <span className="truncate">{task.franchiseeName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-stone-400">
                                            <MapPin size={14} className="text-stone-600" />
                                            <span className="truncate">{task.locationAddress || '—'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 mt-3 text-xs">
                                        {task.requestedDevicesCount && (
                                            <div className="flex items-center gap-1 text-stone-500">
                                                <Monitor size={12} />
                                                <span>{task.requestedDevicesCount} device{task.requestedDevicesCount !== 1 ? 's' : ''} requested</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-stone-500">
                                            <Monitor size={12} />
                                            <span>{task.stationCount} station{task.stationCount !== 1 ? 's' : ''} created</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-stone-500">
                                            <Clock size={12} />
                                            <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {task.notes && (
                                        <div className="mt-2 px-2 py-1 bg-stone-800/50 rounded text-xs text-stone-400 italic">
                                            "{task.notes}"
                                        </div>
                                    )}
                                </div>

                                <ChevronRight className="h-5 w-5 text-stone-600 ml-4" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
