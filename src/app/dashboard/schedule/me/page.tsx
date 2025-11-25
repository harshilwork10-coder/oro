'use client'

import { Calendar, Clock, User, MapPin } from 'lucide-react'
import { useState } from 'react'

export default function MySchedulePage() {
    const [currentWeek] = useState({
        start: 'Nov 25',
        end: 'Dec 1'
    })

    const schedule = [
        {
            date: 'Mon 11/25',
            shifts: [{ start: '9:00 AM', end: '5:00 PM', location: 'Downtown' }],
            appointments: [
                { time: '10:00 AM', customer: 'Sarah M.', service: 'Haircut' },
                { time: '2:00 PM', customer: 'John D.', service: 'Color' }
            ]
        },
        {
            date: 'Tue 11/26',
            shifts: [{ start: '9:00 AM', end: '5:00 PM', location: 'Downtown' }],
            appointments: [
                { time: '11:00 AM', customer: 'Lisa K.', service: 'Style' },
                { time: '3:00 PM', customer: 'Mike R.', service: 'Haircut' }
            ]
        },
        {
            date: 'Wed 11/27',
            shifts: [{ start: '12:00 PM', end: '8:00 PM', location: 'Downtown' }],
            appointments: [
                { time: '1:00 PM', customer: 'Emily T.', service: 'Highlights' },
                { time: '4:30 PM', customer: 'Robert W.', service: 'Beard Trim' }
            ]
        },
        {
            date: 'Thu 11/28',
            shifts: [],
            appointments: [],
            notes: 'Day Off'
        },
        {
            date: 'Fri 11/29',
            shifts: [{ start: '9:00 AM', end: '6:00 PM', location: 'Downtown' }],
            appointments: [
                { time: '10:00 AM', customer: 'Jennifer L.', service: 'Haircut' },
                { time: '12:00 PM', customer: 'David K.', service: 'Style' },
                { time: '3:00 PM', customer: 'Anna P.', service: 'Color' }
            ]
        }
    ]

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-blue-500" />
                    My Schedule
                </h1>
                <p className="text-stone-400 mt-2">Week of {currentWeek.start} - {currentWeek.end}</p>
            </div>

            {/* Schedule Grid */}
            <div className="space-y-4">
                {schedule.map((day, idx) => (
                    <div key={idx} className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-stone-100">{day.date}</h3>
                            {day.notes && (
                                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm rounded-full border border-amber-500/20">
                                    {day.notes}
                                </span>
                            )}
                        </div>

                        {/* Shifts */}
                        {day.shifts.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="h-4 w-4 text-emerald-500" />
                                    <span className="text-sm font-medium text-stone-400">Shift</span>
                                </div>
                                {day.shifts.map((shift, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                        <span className="text-emerald-400 font-medium">{shift.start} - {shift.end}</span>
                                        <span className="text-stone-500">|</span>
                                        <div className="flex items-center gap-1 text-stone-300">
                                            <MapPin className="h-3 w-3" />
                                            <span className="text-sm">{shift.location}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Appointments */}
                        {day.appointments.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4 text-blue-500" />
                                    <span className="text-sm font-medium text-stone-400">Appointments ({day.appointments.length})</span>
                                </div>
                                <div className="space-y-2">
                                    {day.appointments.map((apt, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg border border-stone-800">
                                            <div className="flex items-center gap-3">
                                                <span className="text-blue-400 font-medium text-sm">{apt.time}</span>
                                                <span className="text-stone-500">|</span>
                                                <span className="text-stone-200">{apt.customer}</span>
                                            </div>
                                            <span className="text-sm text-stone-400">{apt.service}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!day.shifts.length && !day.appointments.length && !day.notes && (
                            <p className="text-center text-stone-500 py-4">No schedule for this day</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
