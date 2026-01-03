'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Calendar,
    Clock,
    Users,
    MapPin
} from 'lucide-react'

interface Employee {
    id: string
    name: string
    email: string
}

interface Location {
    id: string
    name: string
}

interface Schedule {
    id: string
    date: string
    startTime: string
    endTime: string
    employee: Employee
    location: Location
}

export default function SchedulePage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date()
        const dayOfWeek = today.getDay()
        const diff = today.getDate() - dayOfWeek // Start from Sunday
        const sunday = new Date(today.setDate(diff))
        sunday.setHours(0, 0, 0, 0)
        return sunday
    })

    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [employees, setEmployees] = useState<Employee[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [formData, setFormData] = useState({
        employeeId: '',
        locationId: '',
        startTime: '09:00',
        endTime: '17:00',
        selectedDays: [] as number[] // 0=Sun, 1=Mon, etc.
    })

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    useEffect(() => {
        fetchSchedules()
        fetchEmployees()
        fetchLocations()
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

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees')
            if (res.ok) {
                const data = await res.json()
                setEmployees(data)
            }
        } catch (error) {
            console.error('Error fetching employees:', error)
        }
    }

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/locations')
            if (res.ok) {
                const data = await res.json()
                if (Array.isArray(data)) {
                    setLocations(data)
                    if (data.length > 0 && !formData.locationId) {
                        setFormData(prev => ({ ...prev, locationId: data[0].id }))
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching locations:', error)
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

    const openAddModal = (date: Date) => {
        setSelectedDate(date)
        setFormData(prev => ({ ...prev, selectedDays: [date.getDay()] }))
        setShowModal(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (formData.selectedDays.length === 0) return

        try {
            // Create shifts for all selected days
            const promises = formData.selectedDays.map(async (dayOfWeek) => {
                // Calculate the date for this day in the current week
                const shiftDate = new Date(currentWeekStart)
                shiftDate.setDate(currentWeekStart.getDate() + dayOfWeek)

                // Create full datetime for start and end
                const startDateTime = new Date(shiftDate)
                const [startHour, startMin] = formData.startTime.split(':')
                startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0)

                const endDateTime = new Date(shiftDate)
                const [endHour, endMin] = formData.endTime.split(':')
                endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0)

                return fetch('/api/schedule', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        employeeId: formData.employeeId,
                        locationId: formData.locationId,
                        date: shiftDate.toISOString(),
                        startTime: startDateTime.toISOString(),
                        endTime: endDateTime.toISOString()
                    })
                })
            })

            await Promise.all(promises)
            fetchSchedules()
            setShowModal(false)
            setFormData(prev => ({ ...prev, employeeId: '', startTime: '09:00', endTime: '17:00', selectedDays: [] }))
        } catch (error) {
            console.error('Error creating schedule:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this shift?')) return

        try {
            const res = await fetch(`/api/schedule?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                fetchSchedules()
            }
        } catch (error) {
            console.error('Error deleting schedule:', error)
        }
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

    const canManageSchedule = ['PROVIDER', 'FRANCHISOR', 'FRANCHISEE', 'MANAGER'].includes(session?.user?.role || '')

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
                    <h1 className="text-3xl font-bold text-stone-100">Staff Schedule</h1>
                    <p className="text-stone-400 mt-1">Manage employee work schedules</p>
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

            {/* Weekly Calendar Grid */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 border-b border-stone-700">
                    {getWeekDates().map(({ day, fullDay, date }) => (
                        <div
                            key={day}
                            className={`p-3 text-center border-r border-stone-700 last:border-r-0 ${isToday(date) ? 'bg-orange-500/10' : ''
                                }`}
                        >
                            <div className="text-xs text-stone-500 uppercase tracking-wider">{day}</div>
                            <div className={`text-lg font-semibold mt-1 ${isToday(date) ? 'text-orange-400' : 'text-stone-200'
                                }`}>
                                {date.getDate()}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 min-h-[400px]">
                    {getWeekDates().map(({ day, date }) => {
                        const daySchedules = getSchedulesForDate(date)

                        return (
                            <div
                                key={day}
                                className={`p-2 border-r border-stone-700 last:border-r-0 ${isToday(date) ? 'bg-orange-500/5' : ''
                                    }`}
                            >
                                {/* Shifts for this day */}
                                <div className="space-y-2">
                                    {daySchedules.map(schedule => (
                                        <div
                                            key={schedule.id}
                                            className="group p-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg relative"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-blue-300 truncate">
                                                    {schedule.employee.name?.split(' ')[0] || 'Employee'}
                                                </span>
                                                {canManageSchedule && (
                                                    <button
                                                        onClick={() => handleDelete(schedule.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                                    >
                                                        <X className="h-3 w-3 text-red-400" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-xs text-stone-400 mt-1">
                                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add shift button - only for today and future dates */}
                                    {canManageSchedule && date >= new Date(new Date().setHours(0, 0, 0, 0)) && (
                                        <button
                                            onClick={() => openAddModal(date)}
                                            className="w-full p-2 border border-dashed border-stone-700 rounded-lg text-stone-500 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5 transition-all flex items-center justify-center gap-1"
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span className="text-xs">Add</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-stone-100">{schedules.length}</div>
                            <div className="text-sm text-stone-400">Shifts This Week</div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-stone-100">
                                {new Set(schedules.map(s => s.employee.id)).size}
                            </div>
                            <div className="text-sm text-stone-400">Staff Scheduled</div>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                            <Clock className="h-5 w-5 text-orange-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-stone-100">
                                {schedules.reduce((total, s) => {
                                    const start = new Date(s.startTime)
                                    const end = new Date(s.endTime)
                                    return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                                }, 0).toFixed(0)}h
                            </div>
                            <div className="text-sm text-stone-400">Total Hours</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Shift Modal */}
            {showModal && selectedDate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-stone-100">Add Shift</h3>
                                <p className="text-sm text-stone-400 mt-1">
                                    Week of {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-stone-800 rounded-lg"
                            >
                                <X className="h-5 w-5 text-stone-400" />
                            </button>
                        </div>

                        {/* Day Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Select Days <span className="text-stone-500">({formData.selectedDays.length} selected)</span>
                            </label>

                            {/* Quick Presets */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, selectedDays: [1, 2, 3, 4, 5] }))}
                                    className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                                >
                                    Weekdays
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, selectedDays: [0, 6] }))}
                                    className="px-3 py-1 text-xs bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all"
                                >
                                    Weekend
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, selectedDays: [0, 1, 2, 3, 4, 5, 6] }))}
                                    className="px-3 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-all"
                                >
                                    Full Week
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, selectedDays: [] }))}
                                    className="px-3 py-1 text-xs bg-stone-700 text-stone-400 rounded-lg hover:bg-stone-600 transition-all"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Day Checkboxes */}
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((day, index) => {
                                    const isSelected = formData.selectedDays.includes(index)
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    selectedDays: isSelected
                                                        ? prev.selectedDays.filter(d => d !== index)
                                                        : [...prev.selectedDays, index].sort()
                                                }))
                                            }}
                                            className={`p-2 rounded-lg text-sm font-medium transition-all ${isSelected
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Employee Select */}
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    Employee
                                </label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <select
                                        required
                                        value={formData.employeeId}
                                        onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    >
                                        <option value="">Select employee...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Location Select */}
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">
                                    Location
                                </label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <select
                                        required
                                        value={formData.locationId}
                                        onChange={e => setFormData({ ...formData, locationId: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    >
                                        <option value="">Select location...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Time Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Start Time
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                        <input
                                            type="time"
                                            required
                                            value={formData.startTime}
                                            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        End Time
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                        <input
                                            type="time"
                                            required
                                            value={formData.endTime}
                                            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                            className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 px-4 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-orange-900/20 transition-all"
                                >
                                    Add Shift
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

