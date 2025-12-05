'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Clock,
    MapPin
} from 'lucide-react'

interface Schedule {
    id: string
    date: string
    startTime: string
    endTime: string
    location: {
        id: string
        name: string
    }
}

export default function MySchedulePage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date()
        const dayOfWeek = today.getDay()
        const diff = today.getDate() - dayOfWeek
        const sunday = new Date(today.setDate(diff))
        sunday.setHours(0, 0, 0, 0)
        return sunday
    })

    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [loading, setLoading] = useState(true)

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    useEffect(() => {
        fetchSchedules()
    }, [currentWeekStart])

    const fetchSchedules = async () => {
        try {
            setLoading(true)
            const weekStartISO = currentWeekStart.toISOString()
            const res = await fetch(`/api/schedule?weekStart=${weekStartISO}`)
            if (res.ok) {
                const data = await res.json()
                setSchedules(data)
            }
        } catch (error) {
            console.error('Error fetching schedules:', error)
        } finally {
            setLoading(false)
        }
    }

    const navigateWeek = (direction: 'prev' | 'next') => {
        setCurrentWeekStart(prev => {
            const newDate = new Date(prev)
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
            return newDate
        })
    }

    const goToToday = () => {
        const today = new Date()
        const dayOfWeek = today.getDay()
        const diff = today.getDate() - dayOfWeek
        const sunday = new Date(today.setDate(diff))
        sunday.setHours(0, 0, 0, 0)
        setCurrentWeekStart(sunday)
    }

    const getWeekDates = () => {
        return days.map((day, index) => {
            const date = new Date(currentWeekStart)
            date.setDate(date.getDate() + index)
            return { day, fullDay: fullDays[index], date }
        })
    }

    const getSchedulesForDate = (date: Date) => {
        return schedules.filter(schedule => {
            const scheduleDate = new Date(schedule.date)
            return scheduleDate.toDateString() === date.toDateString()
        })
    }

    const formatTime = (timeStr: string) => {
        const date = new Date(timeStr)
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    }

    const isToday = (date: Date) => {
        const today = new Date()
        return date.toDateString() === today.toDateString()
    }

    const formatDateHeader = () => {
        const endOfWeek = new Date(currentWeekStart)
        endOfWeek.setDate(endOfWeek.getDate() + 6)

        const startMonth = currentWeekStart.toLocaleDateString('en-US', { month: 'short' })
        const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' })
        const year = currentWeekStart.getFullYear()

        if (startMonth === endMonth) {
            return `${startMonth} ${currentWeekStart.getDate()} - ${endOfWeek.getDate()}, ${year}`
        } else {
            return `${startMonth} ${currentWeekStart.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${year}`
        }
    }

    const calculateTotalHours = () => {
        return schedules.reduce((total, s) => {
            const start = new Date(s.startTime)
            const end = new Date(s.endTime)
            return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        }, 0)
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100">My Schedule</h1>
                    <p className="text-stone-400 mt-1">View your upcoming shifts</p>
                </div>

                {/* Weekly stats */}
                <div className="flex items-center gap-4">
                    <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span className="text-stone-200 font-medium">{schedules.length} shifts</span>
                    </div>
                    <div className="glass-panel px-4 py-2 rounded-xl flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-400" />
                        <span className="text-stone-200 font-medium">{calculateTotalHours().toFixed(1)}h</span>
                    </div>
                </div>
            </div>

            {/* Week Navigation */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigateWeek('prev')}
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-stone-300" />
                    </button>

                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-semibold text-stone-100">
                            {formatDateHeader()}
                        </h2>
                        <button
                            onClick={goToToday}
                            className="px-3 py-1 text-sm bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition-colors"
                        >
                            Today
                        </button>
                    </div>

                    <button
                        onClick={() => navigateWeek('next')}
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <ChevronRight className="h-5 w-5 text-stone-300" />
                    </button>
                </div>
            </div>

            {/* Schedule List View - Better for employees */}
            <div className="space-y-4">
                {getWeekDates().map(({ day, fullDay, date }) => {
                    const daySchedules = getSchedulesForDate(date)
                    const today = isToday(date)

                    return (
                        <div
                            key={day}
                            className={`glass-panel rounded-xl overflow-hidden ${today ? 'border border-orange-500/30' : ''
                                }`}
                        >
                            {/* Day Header */}
                            <div className={`px-4 py-3 border-b border-stone-700 ${today ? 'bg-orange-500/10' : 'bg-stone-800/50'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-lg font-bold ${today ? 'text-orange-400' : 'text-stone-100'
                                            }`}>
                                            {fullDay}
                                        </span>
                                        <span className="text-stone-500">
                                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        {today && (
                                            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
                                                Today
                                            </span>
                                        )}
                                    </div>
                                    {daySchedules.length > 0 && (
                                        <span className="text-sm text-stone-400">
                                            {daySchedules.reduce((total, s) => {
                                                const start = new Date(s.startTime)
                                                const end = new Date(s.endTime)
                                                return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                                            }, 0).toFixed(1)}h
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Shifts */}
                            <div className="p-4">
                                {daySchedules.length === 0 ? (
                                    <p className="text-stone-500 text-sm">No shifts scheduled</p>
                                ) : (
                                    <div className="space-y-3">
                                        {daySchedules.map(schedule => (
                                            <div
                                                key={schedule.id}
                                                className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-lg"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                        <Clock className="h-5 w-5 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <div className="text-stone-100 font-medium">
                                                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                                        </div>
                                                        <div className="flex items-center gap-1 text-sm text-stone-400">
                                                            <MapPin className="h-3 w-3" />
                                                            {schedule.location.name}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-bold text-blue-400">
                                                        {((new Date(schedule.endTime).getTime() - new Date(schedule.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Empty State */}
            {schedules.length === 0 && (
                <div className="glass-panel p-12 rounded-xl text-center">
                    <div className="h-16 w-16 bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-stone-500" />
                    </div>
                    <h3 className="text-xl font-bold text-stone-100 mb-2">No Shifts This Week</h3>
                    <p className="text-stone-400">
                        You don't have any shifts scheduled for this week. Check back later or contact your manager.
                    </p>
                </div>
            )}
        </div>
    )
}
