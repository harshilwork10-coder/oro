'use client';

import { useState } from 'react';
import { Search, User, Clock, CheckCircle, AlertCircle, Phone, X, Mail, Scissors } from 'lucide-react';

interface Appointment {
    id: number;
    time: string;
    client: string;
    phone: string;
    email?: string;
    service: string;
    duration: number;
    status: string;
    arrived: boolean;
    arrivedAt?: string;
}

const INITIAL_APPOINTMENTS: Appointment[] = [
    { id: 1, time: '10:00 AM', client: 'Sarah Miller', phone: '(555) 012-3456', service: 'Haircut & Color', duration: 60, status: 'scheduled', arrived: false },
    { id: 2, time: '10:30 AM', client: 'John Davis', phone: '(555) 012-4567', service: "Men's Cut", duration: 30, status: 'arrived', arrived: true, arrivedAt: '10:25 AM' },
    { id: 3, time: '11:00 AM', client: 'Lisa Kim', phone: '(555) 012-5678', service: 'Manicure', duration: 45, status: 'scheduled', arrived: false },
    { id: 4, time: '11:30 AM', client: 'Mike Thompson', phone: '(555) 012-6789', service: 'Beard Trim', duration: 30, status: 'late', arrived: false },
];

// Phone formatter helper
function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 10);
    let formatted = '';
    if (limited.length > 0) {
        formatted = '(' + limited.slice(0, 3);
    }
    if (limited.length >= 3) {
        formatted += ') ' + limited.slice(3, 6);
    }
    if (limited.length >= 6) {
        formatted += '-' + limited.slice(6, 10);
    }
    return formatted;
}

// Walk-In Client Modal
function WalkInModal({ isOpen, onClose, onAdd }: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (client: Omit<Appointment, 'id' | 'status' | 'arrived'>) => void;
}) {
    const [form, setForm] = useState({
        client: '',
        phone: '',
        email: '',
        service: 'Haircut',
        duration: '30',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!form.client.trim()) newErrors.client = 'Client name is required';
        if (form.phone && form.phone.replace(/\D/g, '').length < 10) {
            newErrors.phone = 'Phone must be 10 digits';
        }
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            newErrors.email = 'Invalid email format';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onAdd({
                time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                client: form.client,
                phone: form.phone,
                email: form.email,
                service: form.service,
                duration: parseInt(form.duration),
            });
            setForm({ client: '', phone: '', email: '', service: 'Haircut', duration: '30' });
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Walk-In Client</h2>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--surface-hover)] rounded-lg">
                        <X size={20} className="text-[var(--text-muted)]" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Client Name */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Client Name *</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text"
                                value={form.client}
                                onChange={(e) => setForm({ ...form, client: e.target.value })}
                                maxLength={50}
                                className={`w-full bg-[var(--background)] border rounded-lg py-2 pl-10 pr-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.client ? 'border-red-500' : 'border-[var(--border)]'}`}
                                placeholder="John Doe"
                            />
                        </div>
                        {errors.client && <p className="text-xs text-red-400 mt-1">{errors.client}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Phone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                                maxLength={14}
                                className={`w-full bg-[var(--background)] border rounded-lg py-2 pl-10 pr-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.phone ? 'border-red-500' : 'border-[var(--border)]'}`}
                                placeholder="(555) 123-4567"
                            />
                        </div>
                        {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className={`w-full bg-[var(--background)] border rounded-lg py-2 pl-10 pr-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${errors.email ? 'border-red-500' : 'border-[var(--border)]'}`}
                                placeholder="john@example.com"
                            />
                        </div>
                        {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                    </div>

                    {/* Service & Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Service</label>
                            <div className="relative">
                                <Scissors className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                <select
                                    value={form.service}
                                    onChange={(e) => setForm({ ...form, service: e.target.value })}
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 pl-10 pr-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                >
                                    <option value="Haircut">Haircut</option>
                                    <option value="Men's Cut">Men's Cut</option>
                                    <option value="Color">Color</option>
                                    <option value="Highlights">Highlights</option>
                                    <option value="Manicure">Manicure</option>
                                    <option value="Pedicure">Pedicure</option>
                                    <option value="Beard Trim">Beard Trim</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Duration</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                                <select
                                    value={form.duration}
                                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg py-2 pl-10 pr-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                >
                                    <option value="15">15 min</option>
                                    <option value="30">30 min</option>
                                    <option value="45">45 min</option>
                                    <option value="60">60 min</option>
                                    <option value="90">90 min</option>
                                    <option value="120">120 min</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] rounded-lg font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium"
                    >
                        Check In Now
                    </button>
                </div>
            </div>
        </div>
    );
}

function AppointmentCard({
    appointment,
    onCheckIn
}: {
    appointment: Appointment;
    onCheckIn: (id: number) => void;
}) {
    return (
        <div className={`p-4 rounded-xl border transition-all ${appointment.arrived
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : appointment.status === 'late'
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]/50'
            }`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--surface-hover)] flex items-center justify-center">
                        <User size={24} className="text-[var(--text-muted)]" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">{appointment.client}</h3>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                            <Phone size={12} />
                            {appointment.phone}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-mono text-lg text-[var(--primary)]">{appointment.time}</p>
                    <p className="text-xs text-[var(--text-muted)]">{appointment.duration} min</p>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-[var(--text-secondary)]">{appointment.service}</p>
                    {appointment.arrived && (
                        <p className="text-xs text-emerald-400 mt-1">✓ Arrived at {appointment.arrivedAt}</p>
                    )}
                    {appointment.status === 'late' && (
                        <p className="text-xs text-amber-400 mt-1">⚠ Running late</p>
                    )}
                </div>

                {!appointment.arrived ? (
                    <button
                        onClick={() => onCheckIn(appointment.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <CheckCircle size={16} />
                        Check In
                    </button>
                ) : (
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium">
                        <CheckCircle size={16} />
                        Ready
                    </button>
                )}
            </div>
        </div>
    );
}

export default function CheckInPage() {
    const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
    const [searchQuery, setSearchQuery] = useState('');
    const [showWalkInModal, setShowWalkInModal] = useState(false);

    const handleCheckIn = (id: number) => {
        setAppointments(appointments.map(apt =>
            apt.id === id
                ? { ...apt, arrived: true, status: 'arrived', arrivedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
                : apt
        ));
    };

    const handleAddWalkIn = (client: Omit<Appointment, 'id' | 'status' | 'arrived'>) => {
        const newAppointment: Appointment = {
            ...client,
            id: Date.now(),
            status: 'arrived',
            arrived: true,
            arrivedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
        setAppointments([newAppointment, ...appointments]);
    };

    const waitingCount = appointments.filter(a => a.arrived).length;
    const upcomingCount = appointments.filter(a => !a.arrived && a.status !== 'late').length;
    const lateCount = appointments.filter(a => a.status === 'late').length;

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Client Check-In</h1>
                <p className="text-[var(--text-secondary)]">Check in clients as they arrive</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                    <p className="text-sm text-emerald-400">Waiting</p>
                    <p className="text-2xl font-bold text-emerald-400">{waitingCount}</p>
                </div>
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10">
                    <p className="text-sm text-blue-400">Upcoming</p>
                    <p className="text-2xl font-bold text-blue-400">{upcomingCount}</p>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                    <p className="text-sm text-amber-400">Late</p>
                    <p className="text-2xl font-bold text-amber-400">{lateCount}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={20} />
                <input
                    type="text"
                    placeholder="Search by client name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl py-3 pl-12 pr-4 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
            </div>

            {/* Appointments */}
            <div className="space-y-4">
                {appointments
                    .filter(a =>
                        a.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.phone.includes(searchQuery)
                    )
                    .map((apt) => (
                        <AppointmentCard
                            key={apt.id}
                            appointment={apt}
                            onCheckIn={handleCheckIn}
                        />
                    ))}
            </div>

            {/* Walk-In Button */}
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <button
                    onClick={() => setShowWalkInModal(true)}
                    className="w-full py-4 border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--primary)]/50 transition-colors flex items-center justify-center gap-2"
                >
                    <User size={20} />
                    Add Walk-In Client
                </button>
            </div>

            {/* Walk-In Modal */}
            <WalkInModal
                isOpen={showWalkInModal}
                onClose={() => setShowWalkInModal(false)}
                onAdd={handleAddWalkIn}
            />
        </div>
    );
}
