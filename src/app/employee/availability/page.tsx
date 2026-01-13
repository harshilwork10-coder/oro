'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
    Clock,
    Calendar,
    Check,
    X,
    Save
} from 'lucide-react'

interface DayAvailability {
    enabled: boolean
    startTime: string
    endTime: string
}

interface WeeklyAvailability {
    [key: string]: DayAvailability
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function MyAvailabilityPage() {
    const { data: session } = useSession()
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const [availability, setAvailability] = useState<WeeklyAvailability>({
        Monday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        Tuesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        Wednesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        Thursday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        Friday: { enabled: true, startTime: '09:00', endTime: '17:00' },
        Saturday: { enabled: true, startTime: '10:00', endTime: '16:00' },
        Sunday: { enabled: false, startTime: '10:00', endTime: '14:00' },
    })

    const toggleDay = (day: string) => {
        setAvailability(prev => ({
            ...prev,
            [day]: { ...prev[day], enabled: !prev[day].enabled }
        }))
    }

    const updateTime = (day: string, field: 'startTime' | 'endTime', value: string) => {
        setAvailability(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await fetch('/api/employee/availability', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ availability })
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (error) {
            console.error('Failed to save:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">My Availability</h1>
                    <p className="text-gray-400">
                        Set your weekly work schedule, {session?.user?.name || 'Team Member'}
                    </p>
                </div>

                {/* Weekly Schedule */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    {DAYS.map((day, index) => (
                        <div
                            key={day}
                            className={`flex items-center justify-between p-4 ${index < DAYS.length - 1 ? 'border-b border-gray-800' : ''
                                }`}
                        >
                            {/* Day Toggle */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => toggleDay(day)}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${availability[day].enabled
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-gray-800 text-gray-500'
                                        }`}
                                >
                                    {availability[day].enabled ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <X className="w-5 h-5" />
                                    )}
                                </button>
                                <div>
                                    <p className={`font-medium ${availability[day].enabled ? 'text-white' : 'text-gray-500'
                                        }`}>
                                        {day}
                                    </p>
                                    {!availability[day].enabled && (
                                        <p className="text-gray-500 text-sm">Day off</p>
                                    )}
                                </div>
                            </div>

                            {/* Time Selectors */}
                            {availability[day].enabled && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={availability[day].startTime}
                                        onChange={(e) => updateTime(day, 'startTime', e.target.value)}
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                    <span className="text-gray-500">to</span>
                                    <input
                                        type="time"
                                        value={availability[day].endTime}
                                        onChange={(e) => updateTime(day, 'endTime', e.target.value)}
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Save Button */}
                <div className="mt-6">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${saved
                                ? 'bg-green-600 text-white'
                                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg hover:shadow-orange-500/25'
                            }`}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : saved ? (
                            <>
                                <Check className="w-5 h-5" />
                                Saved!
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save Availability
                            </>
                        )}
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <button className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-left hover:bg-gray-800 transition-colors">
                        <Calendar className="w-5 h-5 text-blue-400 mb-2" />
                        <p className="text-white font-medium">Request Time Off</p>
                        <p className="text-gray-500 text-sm">Submit a vacation request</p>
                    </button>
                    <button className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-left hover:bg-gray-800 transition-colors">
                        <Clock className="w-5 h-5 text-purple-400 mb-2" />
                        <p className="text-white font-medium">Swap Shift</p>
                        <p className="text-gray-500 text-sm">Trade with a coworker</p>
                    </button>
                </div>
            </div>
        </div>
    )
}
