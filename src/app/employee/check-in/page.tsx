'use client';

import { useState, useEffect } from 'react';
import { Search, User, Clock, CheckCircle, AlertCircle, Phone, X, Mail, Scissors, Loader2, Play, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';

interface Appointment {
    id: string;
    time: string;
    client: string;
    phone: string;
    email?: string;
    service: string;
    duration: number;
    status: string;
    arrived: boolean;
    inProgress: boolean;
    arrivedAt?: string;
}

// Helper to format time
function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Helper to check if appointment is late
function isLate(startTime: Date): boolean {
    const now = new Date();
    return now > startTime;
}

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

// Confirmation Modal
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmColor = 'red' }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmColor?: 'red' | 'blue' | 'green';
}) {
    if (!isOpen) return null;

    const buttonColors = {
        red: 'bg-red-500 hover:bg-red-600',
        blue: 'bg-blue-500 hover:bg-blue-600',
        green: 'bg-emerald-500 hover:bg-emerald-600'
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${confirmColor === 'red' ? 'bg-red-500/10 text-red-500' :
                        confirmColor === 'blue' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-emerald-500/10 text-emerald-500'
                        }`}>
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
                        <p className="text-[var(--text-secondary)]">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2.5 px-4 ${buttonColors[confirmColor]} text-white rounded-xl font-medium transition-colors`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Walk-In Client Modal
function WalkInModal({ isOpen, onClose, onAdd }: {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (client: Omit<Appointment, 'id' | 'status' | 'arrived' | 'inProgress'>) => void;
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
    onCheckIn,
    onStartService
}: {
    appointment: Appointment;
    onCheckIn: (id: string) => void;
    onStartService: (id: string) => void;
}) {
    return (
        <div className={`p-4 rounded-xl border transition-all ${appointment.inProgress
            ? 'border-blue-500/30 bg-blue-500/5'
            : appointment.arrived
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
                    {appointment.inProgress && (
                        <p className="text-xs text-blue-400 mt-1">● In Progress</p>
                    )}
                    {appointment.arrived && !appointment.inProgress && (
                        <p className="text-xs text-emerald-400 mt-1">✓ Arrived at {appointment.arrivedAt}</p>
                    )}
                    {appointment.status === 'late' && (
                        <p className="text-xs text-amber-400 mt-1">⚠ Running late</p>
                    )}
                </div>

                {!appointment.arrived && !appointment.inProgress ? (
                    <button
                        onClick={() => onCheckIn(appointment.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <CheckCircle size={16} />
                        Check In
                    </button>
                ) : appointment.inProgress ? (
                    <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium cursor-default"
                    >
                        <Scissors size={16} />
                        In Service
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            disabled
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium cursor-default opacity-60"
                        >
                            <CheckCircle size={16} />
                            Ready
                        </button>
                        <button
                            onClick={() => onStartService(appointment.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors animate-pulse-subtle"
                        >
                            <Play size={16} fill="currentColor" />
                            Start Service
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CheckInPage() {
    const toast = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showWalkInModal, setShowWalkInModal] = useState(false);

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        confirmText?: string;
        confirmColor?: 'red' | 'blue' | 'green';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Fetch today's appointments on mount
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                // Get today's date range in local timezone
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');

                // Use local midnight to local end of day (no timezone conversion)
                const startDate = `${year}-${month}-${day}T00:00:00`;
                const endDate = `${year}-${month}-${day}T23:59:59`;

                const res = await fetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}`);
                if (res.ok) {
                    const data = await res.json();

                    // Transform API data to Appointment format
                    const transformed: Appointment[] = data.map((apt: any) => {
                        const startTime = new Date(apt.startTime);
                        const arrived = apt.status === 'CHECKED_IN' || apt.status === 'IN_PROGRESS' || apt.status === 'COMPLETED';
                        const inProgress = apt.status === 'IN_PROGRESS';

                        return {
                            id: apt.id,
                            time: formatTime(startTime),
                            client: apt.client?.firstName
                                ? `${apt.client.firstName} ${apt.client.lastName || ''}`.trim()
                                : 'Walk-In',
                            phone: apt.client?.phone || '',
                            email: apt.client?.email || '',
                            service: apt.service?.name || 'Service',
                            duration: apt.service?.durationMinutes || 30,
                            status: arrived ? 'arrived' : isLate(startTime) ? 'late' : 'scheduled',
                            arrived,
                            inProgress,
                            arrivedAt: arrived ? formatTime(new Date(apt.checkedInAt || apt.startTime)) : undefined
                        };
                    });

                    setAppointments(transformed);
                }
            } catch (error) {
                console.error('Failed to fetch appointments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
        // Refresh every 30 seconds
        const interval = setInterval(fetchAppointments, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleCheckIn = async (id: string) => {
        // Optimistic update
        setAppointments(appointments.map(apt =>
            apt.id === id
                ? { ...apt, arrived: true, status: 'arrived', arrivedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
                : apt
        ));

        // Call API to update appointment status
        try {
            await fetch(`/api/appointments/${id}/check-in`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });
            toast.success('Client checked in');
        } catch (error) {
            console.error('Failed to check in:', error);
            toast.error('Failed to check in');
        }
    };

    const handleStartService = async (id: string) => {
        const appointment = appointments.find(a => a.id === id);
        setConfirmModal({
            isOpen: true,
            title: 'Start Service',
            message: `Start service for ${appointment?.client || 'client'}?`,
            confirmText: 'Start Service',
            confirmColor: 'blue',
            onConfirm: async () => {
                // Optimistic update
                setAppointments(prev => prev.map(apt =>
                    apt.id === id
                        ? { ...apt, inProgress: true }
                        : apt
                ));

                try {
                    const res = await fetch(`/api/appointments/${id}/start`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (!res.ok) {
                        throw new Error('Failed to start service');
                    }
                    toast.success('Service started');
                } catch (error) {
                    console.error('Failed to start service:', error);
                    toast.error('Failed to start service');
                    // Revert optimistic update
                    setAppointments(prev => prev.map(apt =>
                        apt.id === id
                            ? { ...apt, inProgress: false }
                            : apt
                    ));
                }
            }
        });
    };

    const handleAddWalkIn = (client: Omit<Appointment, 'id' | 'status' | 'arrived' | 'inProgress'>) => {
        const newAppointment: Appointment = {
            ...client,
            id: `walkin-${Date.now()}`,
            status: 'arrived',
            arrived: true,
            inProgress: false,
            arrivedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
        setAppointments([newAppointment, ...appointments]);
    };

    const waitingCount = appointments.filter(a => a.arrived).length;
    const upcomingCount = appointments.filter(a => !a.arrived && a.status !== 'late').length;
    const lateCount = appointments.filter(a => a.status === 'late').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
            </div>
        );
    }

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
                            onStartService={handleStartService}
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

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                confirmColor={confirmModal.confirmColor}
            />
        </div>
    );
}

