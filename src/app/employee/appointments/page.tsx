'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, Loader2, Check, X, CalendarDays, AlertTriangle, Phone, Mail } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/providers/ToastProvider';

interface AppointmentData {
    id: string;
    date: string;
    time: string;
    client: string;
    email: string;
    phone: string;
    service: string;
    duration: number;
    status: string;
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateShort(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        'PENDING_APPROVAL': 'bg-amber-500/20 text-amber-400',
        'CHECKED_IN': 'bg-emerald-500/20 text-emerald-400',
        'SCHEDULED': 'bg-blue-500/20 text-blue-400',
        'CONFIRMED': 'bg-blue-500/20 text-blue-400',
        'IN_PROGRESS': 'bg-amber-500/20 text-amber-400',
        'COMPLETED': 'bg-stone-500/20 text-stone-400',
        'CANCELLED': 'bg-red-500/20 text-red-400',
    };
    const displayStatus = status.replace(/_/g, ' ').toLowerCase();
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[status] || 'bg-stone-500/20 text-stone-400'}`}>
            {displayStatus}
        </span>
    );
}

// Confirmation Modal Component
function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    confirmColor = 'red'
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmColor?: 'red' | 'green';
}) {
    if (!isOpen) return null;

    const buttonColors = {
        red: 'bg-red-600 hover:bg-red-500',
        green: 'bg-emerald-600 hover:bg-emerald-500'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-amber-500/10">
                        <AlertTriangle className="h-6 w-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
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

export default function EmployeeAppointmentsPage() {
    const { data: session } = useSession();
    const toast = useToast();
    const [todayAppointments, setTodayAppointments] = useState<AppointmentData[]>([]);
    const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        appointmentId: string;
        clientName: string;
    }>({ isOpen: false, appointmentId: '', clientName: '' });

    const fetchAppointments = async () => {
        try {
            // Get today's date range in local timezone
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');

            // Today's range
            const todayStart = `${year}-${month}-${day}T00:00:00`;
            const todayEnd = `${year}-${month}-${day}T23:59:59`;

            // Upcoming range (next 7 days, starting tomorrow)
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);

            const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}T00:00:00`;
            const weekStr = `${weekFromNow.getFullYear()}-${String(weekFromNow.getMonth() + 1).padStart(2, '0')}-${String(weekFromNow.getDate()).padStart(2, '0')}T23:59:59`;

            // Fetch today's appointments
            const todayRes = await fetch(`/api/appointments?startDate=${todayStart}&endDate=${todayEnd}`);
            if (todayRes.ok) {
                const data = await todayRes.json();
                const transformed: AppointmentData[] = data.map((apt: any) => {
                    const startTime = new Date(apt.startTime);
                    return {
                        id: apt.id,
                        date: formatDateShort(startTime),
                        time: formatTime(startTime),
                        client: apt.client?.firstName
                            ? `${apt.client.firstName} ${apt.client.lastName || ''}`.trim()
                            : 'Walk-In',
                        email: apt.client?.email || '',
                        phone: apt.client?.phone || '',
                        service: apt.service?.name || 'Service',
                        duration: apt.service?.durationMinutes || 30,
                        status: apt.status
                    };
                });
                setTodayAppointments(transformed);
            }

            // Fetch upcoming appointments
            const upcomingRes = await fetch(`/api/appointments?startDate=${tomorrowStr}&endDate=${weekStr}`);
            if (upcomingRes.ok) {
                const data = await upcomingRes.json();
                const transformed: AppointmentData[] = data.map((apt: any) => {
                    const startTime = new Date(apt.startTime);
                    return {
                        id: apt.id,
                        date: formatDateShort(startTime),
                        time: formatTime(startTime),
                        client: apt.client?.firstName
                            ? `${apt.client.firstName} ${apt.client.lastName || ''}`.trim()
                            : 'Walk-In',
                        email: apt.client?.email || '',
                        phone: apt.client?.phone || '',
                        service: apt.service?.name || 'Service',
                        duration: apt.service?.durationMinutes || 30,
                        status: apt.status
                    };
                });
                setUpcomingAppointments(transformed);
            }
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
        // Refresh every 30 seconds
        const interval = setInterval(fetchAppointments, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (id: string, clientName: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/appointments/${id}/approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' })
            });
            if (res.ok) {
                toast.success(`Appointment for ${clientName} approved!`);
                await fetchAppointments();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to approve appointment');
            }
        } catch (error) {
            console.error('Failed to approve:', error);
            toast.error('Failed to approve appointment');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/appointments/${id}/approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject' })
            });
            if (res.ok) {
                toast.success('Appointment rejected');
                await fetchAppointments();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to reject appointment');
            }
        } catch (error) {
            console.error('Failed to reject:', error);
            toast.error('Failed to reject appointment');
        } finally {
            setActionLoading(null);
        }
    };

    const openRejectConfirm = (id: string, clientName: string) => {
        setConfirmModal({ isOpen: true, appointmentId: id, clientName });
    };

    const currentAppointments = activeTab === 'today' ? todayAppointments : upcomingAppointments;
    const pendingCount = todayAppointments.filter(a => a.status === 'PENDING_APPROVAL').length +
        upcomingAppointments.filter(a => a.status === 'PENDING_APPROVAL').length;
    const completedCount = todayAppointments.filter(a => a.status === 'COMPLETED').length;
    const scheduledCount = todayAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length +
        upcomingAppointments.filter(a => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, appointmentId: '', clientName: '' })}
                onConfirm={() => handleReject(confirmModal.appointmentId)}
                title="Reject Appointment?"
                message={`Are you sure you want to reject the appointment for ${confirmModal.clientName}? The customer will be notified.`}
                confirmText="Reject"
                confirmColor="red"
            />

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Appointments</h1>
                    <p className="text-[var(--text-secondary)]">Today, {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <p className="text-sm text-[var(--text-muted)]">Today</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{todayAppointments.length}</p>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                    <p className="text-sm text-amber-400">Pending</p>
                    <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
                </div>
                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    <p className="text-sm text-[var(--text-muted)]">Completed</p>
                    <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
                </div>
                <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-500/5">
                    <p className="text-sm text-violet-400">Upcoming</p>
                    <p className="text-2xl font-bold text-violet-400">{upcomingAppointments.length}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('today')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'today'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                        }`}
                >
                    <Calendar size={16} />
                    Today ({todayAppointments.length})
                </button>
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'upcoming'
                        ? 'bg-violet-600 text-white'
                        : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                        }`}
                >
                    <CalendarDays size={16} />
                    Upcoming ({upcomingAppointments.length})
                </button>
            </div>

            {/* Appointments List */}
            <div className="space-y-3">
                {currentAppointments.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                        <p>{activeTab === 'today' ? 'No appointments scheduled for today' : 'No upcoming appointments'}</p>
                    </div>
                ) : (
                    currentAppointments.map((apt) => (
                        <div
                            key={apt.id}
                            className={`p-4 rounded-xl border transition-colors ${apt.status === 'PENDING_APPROVAL'
                                ? 'border-amber-500/30 bg-amber-500/5'
                                : apt.status === 'CHECKED_IN'
                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                    : 'border-[var(--border)] bg-[var(--surface)]'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    {activeTab === 'upcoming' && (
                                        <span className="text-sm font-medium text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                                            {apt.date}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1 font-mono text-lg text-[var(--primary)]">
                                        <Clock size={16} />
                                        {apt.time}
                                    </div>
                                    <StatusBadge status={apt.status} />
                                </div>
                                <span className="text-sm text-[var(--text-muted)]">{apt.duration} min</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="div">
                                    <div className="flex items-center gap-2">
                                        <User size={16} className="text-[var(--text-muted)]" />
                                        <span className="font-medium text-[var(--text-primary)]">{apt.client}</span>
                                    </div>
                                    {(apt.phone || apt.email) && (
                                        <div className="flex items-center gap-3 mt-1 ml-6">
                                            {apt.phone && (
                                                <a href={`tel:${apt.phone}`} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors" title="Call Customer">
                                                    <Phone size={12} />
                                                    {apt.phone}
                                                </a>
                                            )}
                                            {apt.email && (
                                                <a href={`mailto:${apt.email}`} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors" title="Email Customer">
                                                    <Mail size={12} />
                                                    Email
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm text-[var(--text-secondary)]">{apt.service}</span>
                            </div>

                            {/* Pending Approval Actions */}
                            {apt.status === 'PENDING_APPROVAL' && (
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => handleApprove(apt.id, apt.client)}
                                        disabled={actionLoading === apt.id}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {actionLoading === apt.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Check size={16} />
                                        )}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => openRejectConfirm(apt.id, apt.client)}
                                        disabled={actionLoading === apt.id}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X size={16} />
                                        Reject
                                    </button>
                                </div>
                            )}

                            {/* Checked In - Start Service */}
                            {apt.status === 'CHECKED_IN' && (
                                <button className="mt-3 w-full py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors">
                                    Start Service
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
