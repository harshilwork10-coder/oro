'use client'

import { CalendarDays, ChevronRight } from 'lucide-react'

interface UpcomingAppointment {
    id: string
    date: Date
    time: string
    customerName: string
    service: string
}

export default function UpcomingAppointments() {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)

    const formatDate = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
        return date.toLocaleDateString('en-US', options)
    }

    const upcomingAppts: UpcomingAppointment[] = [
        { id: '1', date: tomorrow, time: '10:00 AM', customerName: 'Jennifer L.', service: 'Haircut' },
        { id: '2', date: tomorrow, time: '02:30 PM', customerName: 'Robert P.', service: 'Coloring' },
        { id: '3', date: tomorrow, time: '04:00 PM', customerName: 'Lisa M.', service: 'Style' },
        { id: '4', date: dayAfter, time: '11:00 AM', customerName: 'Mark W.', service: 'Haircut' },
        { id: '5', date: dayAfter, time: '01:00 PM', customerName: 'Anna K.', service: 'Highlights' }
    ]

    const tomorrowAppts = upcomingAppts.filter(apt => apt.date.getDate() === tomorrow.getDate())
    const dayAfterAppts = upcomingAppts.filter(apt => apt.date.getDate() === dayAfter.getDate())

    return (
        <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                    <h3 className="font-bold text-stone-100">Upcoming Appointments</h3>
                    <p className="text-xs text-stone-500">Next 2 days</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Tomorrow */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            Tomorrow ({formatDate(tomorrow)})
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/50 to-transparent"></div>
                    </div>
                    <div className="space-y-2">
                        {tomorrowAppts.map((apt) => (
                            <div key={apt.id} className="flex items-center gap-2 p-2 bg-stone-900/20 rounded-lg">
                                <ChevronRight className="h-4 w-4 text-emerald-500" />
                                <span className="text-xs font-medium text-stone-400 min-w-[60px]">{apt.time}</span>
                                <span className="text-sm text-stone-300">{apt.customerName}</span>
                                <span className="text-xs text-stone-500">({apt.service})</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Day After Tomorrow */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                            {formatDate(dayAfter)}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-l from-blue-500/50 to-transparent"></div>
                    </div>
                    <div className="space-y-2">
                        {dayAfterAppts.map((apt) => (
                            <div key={apt.id} className="flex items-center gap-2 p-2 bg-stone-900/20 rounded-lg">
                                <ChevronRight className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-medium text-stone-400 min-w-[60px]">{apt.time}</span>
                                <span className="text-sm text-stone-300">{apt.customerName}</span>
                                <span className="text-xs text-stone-500">({apt.service})</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
