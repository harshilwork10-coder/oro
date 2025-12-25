'use client';

import { useState } from 'react';
import {
    Search, Plus, Calendar, Clock, User, MoreHorizontal,
    ChevronLeft, ChevronRight, Filter
} from 'lucide-react';

type ViewMode = 'day' | 'week';

const MOCK_APPOINTMENTS = [
    { id: 1, time: '9:00 AM', duration: 60, client: 'Sarah Miller', service: 'Haircut & Color', stylist: 'Emma', status: 'confirmed' },
    { id: 2, time: '10:00 AM', duration: 30, client: 'John Davis', service: 'Men\'s Cut', stylist: 'Alex', status: 'checked-in' },
    { id: 3, time: '10:30 AM', duration: 45, client: 'Lisa Kim', service: 'Manicure', stylist: 'Maria', status: 'in-progress' },
    { id: 4, time: '11:30 AM', duration: 60, client: 'Mike Thompson', service: 'Beard Trim + Haircut', stylist: 'Emma', status: 'confirmed' },
    { id: 5, time: '1:00 PM', duration: 90, client: 'Anna Lee', service: 'Full Highlights', stylist: 'Alex', status: 'confirmed' },
    { id: 6, time: '2:30 PM', duration: 30, client: 'Walk-in', service: 'Quick Trim', stylist: 'Maria', status: 'scheduled' },
];

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        scheduled: 'bg-blue-500/20 text-blue-400',
        confirmed: 'bg-emerald-500/20 text-emerald-400',
        'checked-in': 'bg-purple-500/20 text-purple-400',
        'in-progress': 'bg-amber-500/20 text-amber-400',
        completed: 'bg-gray-500/20 text-gray-400',
        cancelled: 'bg-red-500/20 text-red-400',
    };
    const labels: Record<string, string> = {
        scheduled: 'Scheduled',
        confirmed: 'Confirmed',
        'checked-in': 'Checked In',
        'in-progress': 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status]}`}>
            {labels[status]}
        </span>
    );
}

export default function AppointmentsPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    const prevDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const nextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        setSelectedDate(newDate);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Appointments</h1>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                        <Plus size={16} />
                        New Appointment
                    </button>
                </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={prevDay}
                            className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)]"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={nextDay}
                            className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)]"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{formatDate(selectedDate)}</h2>
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg"
                    >
                        Today
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                    </div>
                    <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)]">
                        {(['day', 'week'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${viewMode === mode
                                        ? 'bg-[var(--primary)] text-white'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Appointments List */}
            <div className="glass-panel rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Time</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Client</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Service</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Duration</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Stylist</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Status</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {MOCK_APPOINTMENTS.map((apt) => (
                            <tr key={apt.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-[var(--text-muted)]" />
                                        <span className="font-mono text-[var(--primary)]">{apt.time}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-[var(--surface-hover)] flex items-center justify-center">
                                            <User size={14} className="text-[var(--text-muted)]" />
                                        </div>
                                        <span className="font-medium text-[var(--text-primary)]">{apt.client}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">{apt.service}</td>
                                <td className="px-4 py-3 text-center text-[var(--text-muted)]">{apt.duration}m</td>
                                <td className="px-4 py-3 text-[var(--text-secondary)]">{apt.stylist}</td>
                                <td className="px-4 py-3"><StatusBadge status={apt.status} /></td>
                                <td className="px-4 py-3">
                                    <button className="p-1 hover:bg-[var(--surface-active)] rounded">
                                        <MoreHorizontal size={16} className="text-[var(--text-muted)]" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
