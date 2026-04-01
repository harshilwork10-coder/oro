'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Clock, UserCheck, Download, RefreshCw,
    AlertCircle, ChevronLeft, ChevronRight, Users
} from 'lucide-react';

interface ClockEntry {
    id: string;
    name: string;
    role: string;
    clockedInAt: string;
    hoursWorked: number;
    locationName: string;
}

interface HistoryEntry {
    id: string;
    clockIn: string;
    clockOut: string | null;
    employeeName: string;
}

export default function TimeClockPage() {
    const [view, setView] = useState<'live' | 'history'>('live');
    const [onClock, setOnClock] = useState<ClockEntry[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [liveRes, histRes] = await Promise.all([
                fetch('/api/owner/on-clock'),
                fetch('/api/pos/timeclock/history'),
            ]);

            if (liveRes.ok) {
                const d = await liveRes.json();
                setOnClock(d.employees || []);
            }
            if (histRes.ok) {
                const d = await histRes.json();
                setHistory(d.data || []);
            }
        } catch {
            setError('Could not load time clock data.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

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

    const formatDate = (date: Date) =>
        date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Filter history to selected date
    const dateStr = selectedDate.toDateString();
    const dayHistory = history.filter(e => new Date(e.clockIn).toDateString() === dateStr);

    const totalHoursToday = dayHistory.reduce((sum, e) => {
        if (!e.clockOut) return sum;
        return sum + (new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 3600000;
    }, 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Time Clock</h1>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg text-sm transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <Download size={16} />
                        Export Timesheet
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 mb-4">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <UserCheck size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{onClock.length}</p>
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
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalHoursToday.toFixed(1)}h</p>
                            <p className="text-xs text-[var(--text-muted)]">Hours Logged — {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : formatDate(selectedDate)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Users size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{dayHistory.length}</p>
                            <p className="text-xs text-[var(--text-muted)]">Shifts This Day</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* View toggle */}
            <div className="flex gap-1 bg-[var(--surface)] rounded-lg p-1 border border-[var(--border)] mb-5 w-fit">
                {(['live', 'history'] as const).map(v => (
                    <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${view === v
                            ? 'bg-[var(--primary)] text-white'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        {v === 'live' ? '● Live' : 'History'}
                    </button>
                ))}
            </div>

            {view === 'live' ? (
                /* Live — who is clocked in right now */
                loading ? (
                    <div className="py-16 text-center text-[var(--text-muted)]">
                        <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                        Loading…
                    </div>
                ) : onClock.length === 0 ? (
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center text-[var(--text-muted)]">
                        <UserCheck size={40} className="mx-auto mb-3 opacity-30" />
                        <p>No employees currently clocked in</p>
                    </div>
                ) : (
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
                                    <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Employee</th>
                                    <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Location</th>
                                    <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Clock In</th>
                                    <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Hours</th>
                                    <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {onClock.map(emp => (
                                    <tr key={emp.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-[var(--text-primary)]">{emp.name}</span>
                                            <span className="block text-xs text-[var(--text-muted)]">{emp.role}</span>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--text-secondary)]">{emp.locationName}</td>
                                        <td className="px-4 py-3 text-center font-mono text-[var(--text-primary)]">{formatTime(emp.clockedInAt)}</td>
                                        <td className="px-4 py-3 text-center font-semibold text-[var(--text-primary)]">{emp.hoursWorked}h</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                                ● Clocked In
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                /* History — timesheet by day */
                <>
                    <div className="flex items-center gap-3 mb-4">
                        <button onClick={prevDay} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)]">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={nextDay} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-secondary)]">
                            <ChevronRight size={20} />
                        </button>
                        <h2 className="text-base font-semibold text-[var(--text-primary)]">{formatDate(selectedDate)}</h2>
                        <button onClick={() => setSelectedDate(new Date())} className="ml-auto px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-lg">
                            Today
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-[var(--text-muted)]">
                            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                            Loading…
                        </div>
                    ) : dayHistory.length === 0 ? (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center text-[var(--text-muted)]">
                            <Clock size={40} className="mx-auto mb-3 opacity-30" />
                            <p>No shifts recorded for this day</p>
                        </div>
                    ) : (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
                                        <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium">Employee</th>
                                        <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Clock In</th>
                                        <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Clock Out</th>
                                        <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Hours</th>
                                        <th className="px-4 py-3 text-center text-[var(--text-muted)] font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dayHistory.map(entry => {
                                        const hrs = entry.clockOut
                                            ? ((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 3600000).toFixed(1)
                                            : null;
                                        return (
                                            <tr key={entry.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                                                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{entry.employeeName}</td>
                                                <td className="px-4 py-3 text-center font-mono text-[var(--text-primary)]">{formatTime(entry.clockIn)}</td>
                                                <td className="px-4 py-3 text-center font-mono text-[var(--text-primary)]">{entry.clockOut ? formatTime(entry.clockOut) : '—'}</td>
                                                <td className="px-4 py-3 text-center font-semibold text-[var(--text-primary)]">{hrs ? `${hrs}h` : '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${entry.clockOut
                                                        ? 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                                                        : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                        {entry.clockOut ? 'Complete' : '● Clocked In'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
