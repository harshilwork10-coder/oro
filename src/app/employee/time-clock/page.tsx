'use client';

import { useState } from 'react';
import { Clock, Play, Pause, History } from 'lucide-react';

const MOCK_TIME_ENTRIES = [
    { date: 'Today', clockIn: '9:00 AM', clockOut: null, hours: '4.5h' },
    { date: 'Yesterday', clockIn: '9:15 AM', clockOut: '5:30 PM', hours: '8.25h' },
    { date: 'Dec 22', clockIn: '8:45 AM', clockOut: '5:00 PM', hours: '8.25h' },
];

export default function TimeClockPage() {
    const [isClockedIn, setIsClockedIn] = useState(true);
    const [clockInTime] = useState('9:00 AM');

    const handleClockAction = () => {
        setIsClockedIn(!isClockedIn);
    };

    return (
        <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">Time Clock</h1>

            {/* Clock Display */}
            <div className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-center mb-6">
                <div className="text-4xl font-mono text-[var(--text-primary)] mb-2">
                    {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <p className="text-[var(--text-muted)]">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>

                {isClockedIn && (
                    <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <p className="text-sm text-emerald-400">Clocked in at {clockInTime}</p>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">4h 32m</p>
                    </div>
                )}

                <button
                    onClick={handleClockAction}
                    className={`mt-6 w-full py-4 rounded-xl font-medium text-lg flex items-center justify-center gap-3 transition-colors ${isClockedIn
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        }`}
                >
                    {isClockedIn ? (
                        <>
                            <Pause size={24} />
                            Clock Out
                        </>
                    ) : (
                        <>
                            <Play size={24} />
                            Clock In
                        </>
                    )}
                </button>
            </div>

            {/* Recent History */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
                    <History size={18} className="text-[var(--text-muted)]" />
                    <h2 className="font-semibold text-[var(--text-primary)]">Recent Shifts</h2>
                </div>
                <div className="divide-y divide-[var(--border)]">
                    {MOCK_TIME_ENTRIES.map((entry, i) => (
                        <div key={i} className="p-4 flex items-center justify-between">
                            <div>
                                <p className="font-medium text-[var(--text-primary)]">{entry.date}</p>
                                <p className="text-sm text-[var(--text-muted)]">
                                    {entry.clockIn} - {entry.clockOut || 'Active'}
                                </p>
                            </div>
                            <span className={`font-mono ${entry.clockOut ? 'text-[var(--text-secondary)]' : 'text-emerald-400'}`}>
                                {entry.hours}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
