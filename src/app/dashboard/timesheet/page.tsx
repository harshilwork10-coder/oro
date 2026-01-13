'use client'

import { useState, useEffect } from 'react'
import { Clock, Play, Square, Calendar, AlertCircle } from 'lucide-react'

interface TimeEntry {
    id: string
    clockIn: string
    clockOut?: string
    duration?: string
}

export default function TimesheetPage() {
    const [isClockedIn, setIsClockedIn] = useState(false)
    const [currentSession, setCurrentSession] = useState<Date | null>(null)
    const [elapsedTime, setElapsedTime] = useState('00:00:00')
    const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([])
    const [loading, setLoading] = useState(false)

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isClockedIn && currentSession) {
            interval = setInterval(() => {
                const now = new Date()
                const diff = Math.floor((now.getTime() - currentSession.getTime()) / 1000)
                const hours = Math.floor(diff / 3600).toString().padStart(2, '0')
                const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0')
                const seconds = (diff % 60).toString().padStart(2, '0')
                setElapsedTime(`${hours}:${minutes}:${seconds}`)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [isClockedIn, currentSession])

    const handleClockIn = async () => {
        setLoading(true)
        try {
            // Clock API integration pending in
            setIsClockedIn(true)
            setCurrentSession(new Date())
            setElapsedTime('00:00:00')
        } finally {
            setLoading(false)
        }
    }

    const handleClockOut = async () => {
        setLoading(true)
        try {
            // Clock API integration pending out
            if (currentSession) {
                const entry: TimeEntry = {
                    id: Date.now().toString(),
                    clockIn: currentSession.toLocaleTimeString(),
                    clockOut: new Date().toLocaleTimeString(),
                    duration: elapsedTime
                }
                setRecentEntries(prev => [entry, ...prev])
            }
            setIsClockedIn(false)
            setCurrentSession(null)
            setElapsedTime('00:00:00')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Clock className="w-8 h-8 text-indigo-600" />
                    Clock In / Out
                </h1>
                <p className="text-gray-500 mt-1">Track your work hours</p>
            </div>

            {/* Clock Status Card */}
            <div className={`rounded-2xl p-8 mb-8 ${isClockedIn ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
                <div className="text-center">
                    {/* Timer Display */}
                    <div className={`text-6xl font-mono font-bold mb-4 ${isClockedIn ? 'text-green-600' : 'text-gray-400'}`}>
                        {elapsedTime}
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className={`w-3 h-3 rounded-full ${isClockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className={`text-lg font-medium ${isClockedIn ? 'text-green-700' : 'text-gray-600'}`}>
                            {isClockedIn ? 'Currently Working' : 'Not Clocked In'}
                        </span>
                    </div>

                    {currentSession && (
                        <p className="text-sm text-gray-500 mb-6">
                            Started at {currentSession.toLocaleTimeString()}
                        </p>
                    )}

                    {/* Clock Button */}
                    <button
                        onClick={isClockedIn ? handleClockOut : handleClockIn}
                        disabled={loading}
                        className={`px-12 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 mx-auto transition-all disabled:opacity-50 ${isClockedIn
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                    >
                        {isClockedIn ? (
                            <>
                                <Square className="w-6 h-6" />
                                Clock Out
                            </>
                        ) : (
                            <>
                                <Play className="w-6 h-6" />
                                Clock In
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Recent Entries */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    Today's Sessions
                </h2>

                {recentEntries.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-500">
                        No time entries today
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentEntries.map(entry => (
                            <div key={entry.id} className="bg-white rounded-xl border p-4 flex justify-between items-center">
                                <div>
                                    <span className="text-gray-900 font-medium">{entry.clockIn}</span>
                                    <span className="text-gray-400 mx-2">→</span>
                                    <span className="text-gray-900 font-medium">{entry.clockOut}</span>
                                </div>
                                <div className="text-indigo-600 font-mono font-medium">
                                    {entry.duration}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Note */}
            <div className="mt-8 p-4 bg-amber-50 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                    Time entries are recorded automatically. Please remember to clock out at the end of your shift.
                </p>
            </div>
        </div>
    )
}
