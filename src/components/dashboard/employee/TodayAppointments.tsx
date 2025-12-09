'use client'

import { Calendar, Clock, User } from 'lucide-react'

interface TodayAppointment {
    id: string
    time: string
    customerName: string
    service: string
    provider: string
    status: 'upcoming' | 'in-progress' | 'completed'
}

export default function TodayAppointments() {
    const appointments: TodayAppointment[] = []

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'upcoming': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            case 'in-progress': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
            case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            default: return 'bg-stone-500/10 text-stone-400 border-stone-500/20'
        }
    }

    return (
        <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                    <h3 className="font-bold text-stone-100">Today's Schedule</h3>
                    <p className="text-xs text-stone-500">{appointments.length} appointments</p>
                </div>
            </div>

            {appointments.length === 0 ? (
                <div className="text-center py-8 text-stone-500">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No appointments scheduled</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {appointments.map((apt) => (
                        <div
                            key={apt.id}
                            className="flex items-center gap-3 p-3 bg-stone-900/30 rounded-lg border border-stone-800"
                        >
                            <div className="flex flex-col items-center justify-center min-w-[60px] bg-stone-950 rounded-lg p-2">
                                <Clock className="h-4 w-4 text-stone-400 mb-1" />
                                <span className="text-xs font-bold text-stone-300">{apt.time}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-stone-200 truncate">{apt.customerName}</p>
                                <p className="text-sm text-stone-400 truncate">{apt.service}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-medium border ${getStatusColor(apt.status)} whitespace-nowrap`}>
                                {apt.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
