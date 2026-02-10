'use client';

import { useState } from 'react';
import {
    Clock, UserCheck, UserX, Calendar, ChevronLeft, ChevronRight,
    Download, Filter
} from 'lucide-react';

const MOCK_EMPLOYEES = [
    { id: 1, name: 'Emma Wilson', role: 'Stylist' },
    { id: 2, name: 'Alex Chen', role: 'Barber' },
    { id: 3, name: 'Maria Garcia', role: 'Nail Tech' },
    { id: 4, name: 'James Brown', role: 'Manager' },
];

const MOCK_TIMESHEET = [
    { id: 1, employeeId: 1, date: 'Today', clockIn: '8:55 AM', clockOut: '5:02 PM', hours: 8.12, status: 'complete' },
    { id: 2, employeeId: 2, date: 'Today', clockIn: '9:00 AM', clockOut: null, hours: 5.5, status: 'active' },
    { id: 3, employeeId: 3, date: 'Today', clockIn: '10:00 AM', clockOut: '6:30 PM', hours: 8.5, status: 'complete' },
    { id: 4, employeeId: 4, date: 'Today', clockIn: '7:45 AM', clockOut: '4:00 PM', hours: 8.25, status: 'complete' },
    { id: 5, employeeId: 1, date: 'Yesterday', clockIn: '9:00 AM', clockOut: '5:30 PM', hours: 8.5, status: 'complete' },
    { id: 6, employeeId: 2, date: 'Yesterday', clockIn: '8:30 AM', clockOut: '4:45 PM', hours: 8.25, status: 'complete' },
];

export default function TimeClockPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filter, setFilter] = useState<'all' | 'active' | 'complete'>('all');

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    };

    const prevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(d);
    };

    const nextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        setSelectedDate(d);
    };

    const getEmployee = (id: number) => MOCK_EMPLOYEES.find(e => e.id === id);

    const todayEntries = MOCK_TIMESHEET.filter(t => {
        if (filter === 'all') return true;
        return t.status === filter;
    });

    const activeCount = MOCK_TIMESHEET.filter(t => t.status === 'active').length;
    const totalHours = MOCK_TIMESHEET.filter(t => t.date === 'Today').reduce((sum, t) => sum + t.hours, 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Time Clock</h1>
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    <Download size={16} />
                    Export Timesheet
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <UserCheck size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{activeCount}</p>
                            <p className="text-xs text-[var(--text-muted)]">Clocked In Now</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Clock size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalHours.toFixed(1)}h</p>
                            <p className="text-xs text-[var(--text-muted)]">Total Hours Today</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Calendar size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{MOCK_EMPLOYEES.length}</p>
                            <p className="text-xs text-[var(--text-muted)]">Total Staff</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                    <button onClick={prevDay} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)]">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={nextDay} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)]">
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
                <div className="ml-auto flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)]">
                    {(['all', 'active', 'complete'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filter === f
                                ? 'bg-[var(--primary)] text-white'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timesheet Table */}
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Employee</th>
                            <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Date</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Clock In</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Clock Out</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Hours</th>
                            <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todayEntries.map((entry) => {
                            const emp = getEmployee(entry.employeeId);
                            return (
                                <tr key={entry.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                    <td className="px-4 py-3">
                                        <div>
                                            <span className="font-medium text-[var(--text-primary)]">{emp?.name}</span>
                                            <span className="block text-xs text-[var(--text-muted)]">{emp?.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-secondary)]">{entry.date}</td>
                                    <td className="px-4 py-3 text-center font-mono text-[var(--text-primary)]">{entry.clockIn}</td>
                                    <td className="px-4 py-3 text-center font-mono text-[var(--text-primary)]">{entry.clockOut || '—'}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-[var(--text-primary)]">{entry.hours.toFixed(1)}h</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.status === 'active'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                                            }`}>
                                            {entry.status === 'active' ? '● Clocked In' : 'Complete'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
