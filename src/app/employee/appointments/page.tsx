'use client';

import { Calendar, Clock, User, MapPin } from 'lucide-react';

const MOCK_MY_APPOINTMENTS = [
    { id: 1, time: '10:30 AM', client: 'John Davis', service: 'Men\'s Cut', duration: 30, status: 'checked-in' },
    { id: 2, time: '11:30 AM', client: 'Mike Thompson', service: 'Beard Trim + Haircut', duration: 60, status: 'confirmed' },
    { id: 3, time: '1:00 PM', client: 'Anna Lee', service: 'Full Highlights', duration: 90, status: 'confirmed' },
    { id: 4, time: '3:00 PM', client: 'Tom Wilson', service: 'Haircut', duration: 30, status: 'confirmed' },
];

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        'checked-in': 'bg-emerald-500/20 text-emerald-400',
        confirmed: 'bg-blue-500/20 text-blue-400',
        'in-progress': 'bg-amber-500/20 text-amber-400',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status]}`}>
            {status.replace('-', ' ')}
        </span>
    );
}

export default function EmployeeAppointmentsPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Appointments</h1>
                    <p className="text-[var(--text-secondary)]">Today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <p className="text-sm text-[var(--text-muted)]">Total</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{MOCK_MY_APPOINTMENTS.length}</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <p className="text-sm text-[var(--text-muted)]">Completed</p>
                    <p className="text-2xl font-bold text-emerald-400">1</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <p className="text-sm text-[var(--text-muted)]">Remaining</p>
                    <p className="text-2xl font-bold text-blue-400">3</p>
                </div>
            </div>

            {/* Appointments List */}
            <div className="space-y-3">
                {MOCK_MY_APPOINTMENTS.map((apt) => (
                    <div
                        key={apt.id}
                        className={`p-4 rounded-xl border transition-colors ${apt.status === 'checked-in'
                                ? 'border-emerald-500/30 bg-emerald-500/5'
                                : 'border-[var(--border)] bg-[var(--surface)]'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 font-mono text-lg text-[var(--primary)]">
                                    <Clock size={16} />
                                    {apt.time}
                                </div>
                                <StatusBadge status={apt.status} />
                            </div>
                            <span className="text-sm text-[var(--text-muted)]">{apt.duration} min</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-[var(--text-muted)]" />
                                <span className="font-medium text-[var(--text-primary)]">{apt.client}</span>
                            </div>
                            <span className="text-sm text-[var(--text-secondary)]">{apt.service}</span>
                        </div>
                        {apt.status === 'checked-in' && (
                            <button className="mt-3 w-full py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                                Start Service
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
