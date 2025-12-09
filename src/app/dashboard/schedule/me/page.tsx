'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    ChevronLeft,
    ChevronRight,
    Calendar,
    Clock,
    MapPin,
    Sun,
    Coffee,
    Moon
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

    const getShiftIcon = (startTime: string) => {
        const hour = new Date(startTime).getHours()
        if (hour < 12) return <Sun className="h-4 w-4 text-amber-400" />
        if (hour < 17) return <Coffee className="h-4 w-4 text-orange-400" />
        return <Moon className="h-4 w-4 text-indigo-400" />
    }

    const getShiftType = (startTime: string) => {
        const hour = new Date(startTime).getHours()
        if (hour < 12) return 'Morning'
        if (hour < 17) return 'Afternoon'
        return 'Evening'
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    const weekDates = getWeekDates()
    const totalHours = calculateTotalHours()

    return (
        <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                        My Schedule
                    </h1>
                    <p className="text-stone-500 text-sm">Your upcoming shifts</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2">
                    <div className="bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-400" />
                        <span className="text-blue-400 font-bold">{schedules.length}</span>
                        <span className="text-blue-300/70 text-sm">shifts</span>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-400" />
                        <span className="text-orange-400 font-bold">{totalHours.toFixed(1)}</span>
                        <span className="text-orange-300/70 text-sm">hrs</span>
                    </div>
                </div>
            </div>

            {/* Week Calendar */}
            <div className="bg-stone-800/50 border border-stone-700/50 rounded-xl p-3">
                {/* Navigation */}
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={() => navigateWeek('prev')}
                        className="p-2 hover:bg-stone-700/50 rounded-lg transition-all"
                    >
                        <ChevronLeft className="h-5 w-5 text-stone-400" />
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-100">{formatDateHeader()}</span>
                        <button
                            onClick={goToToday}
                            className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-md hover:bg-orange-400 transition-all"
                        >
                            Today
                        </button>
                    </div>

                    <button
                        onClick={() => navigateWeek('next')}
                        className="p-2 hover:bg-stone-700/50 rounded-lg transition-all"
                    >
                        <ChevronRight className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                {/* Week Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {weekDates.map(({ day, date }) => {
                        const today = isToday(date)
                        const hasShift = getSchedulesForDate(date).length > 0

                        return (
                            <div
                                key={day}
                                className={`relative py-2 px-1 rounded-lg text-center ${today
                                        ? 'bg-orange-500/20 border border-orange-500/50'
                                        : hasShift
                                            ? 'bg-blue-500/10'
                                            : 'bg-stone-800/30'
                                    }`}
                            >
                                <div className={`text-xs ${today ? 'text-orange-400' : 'text-stone-500'}`}>
                                    {day}
                                </div>
                                <div className={`text-lg font-bold ${today ? 'text-orange-400' : hasShift ? 'text-blue-400' : 'text-stone-400'
                                    }`}>
                                    {date.getDate()}
                                </div>
                                {hasShift && (
                                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                                        <div className="h-1 w-1 rounded-full bg-blue-500"></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Shifts List - Compact, only show days with shifts */}
            {schedules.length > 0 ? (
                <div className="space-y-2">
                    {weekDates.map(({ fullDay, date }) => {
                        const daySchedules = getSchedulesForDate(date)
                        const today = isToday(date)

                        if (daySchedules.length === 0) return null

                        return (
                            <div
                                key={fullDay}
                                className={`rounded-xl overflow-hidden ${today
                                        ? 'bg-orange-500/10 border border-orange-500/30'
                                        : 'bg-stone-800/40 border border-stone-700/50'
                                    }`}
                            >
                                {/* Day Header - Compact */}
                                <div className={`px-4 py-2 flex items-center justify-between ${today ? 'bg-orange-500/10' : 'bg-stone-800/50'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold ${today ? 'text-orange-400' : 'text-stone-200'}`}>
                                            {fullDay}
                                        </span>
                                        <span className="text-stone-500 text-sm">
                                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        {today && (
                                            <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">
                                                TODAY
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-sm text-stone-400">
                                        {daySchedules.reduce((total, s) => {
                                            const start = new Date(s.startTime)
                                            const end = new Date(s.endTime)
                                            return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                                        }, 0).toFixed(1)}h
                                    </span>
                                </div>

                                {/* Shifts */}
                                <div className="p-3 space-y-2">
                                    {daySchedules.map(schedule => (
                                        <div
                                            key={schedule.id}
                                            className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                                    {getShiftIcon(schedule.startTime)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-stone-100 font-semibold">
                                                            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 text-xs bg-stone-700 text-stone-400 rounded">
                                                            {getShiftType(schedule.startTime)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm text-stone-500">
                                                        <MapPin className="h-3 w-3" />
                                                        {schedule.location.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xl font-bold text-blue-400">
                                                {((new Date(schedule.endTime).getTime() - new Date(schedule.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                /* Empty State - Compact */
                <div className="bg-stone-800/30 border border-stone-700/50 rounded-xl p-8 text-center">
                    <div className="h-14 w-14 bg-stone-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-7 w-7 text-stone-500" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-200 mb-2">No Shifts Scheduled</h3>
                    <p className="text-stone-500 text-sm">
                        You're free this week! Check back later or contact your manager.
                    </p>
                </div>
            )}
        </div>
    )
}
