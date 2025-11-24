'use client'

import { useState, useEffect } from 'react'
import {
    Clock,
    Play,
    Square,
    Coffee,
    Calendar,
    User,
    History,
    AlertCircle
} from 'lucide-react'

export default function TimeClockPage() {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [status, setStatus] = useState<'CLOCKED_OUT' | 'CLOCKED_IN' | 'ON_BREAK'>('CLOCKED_OUT')
    const [shiftStart, setShiftStart] = useState<Date | null>(null)
    const [elapsedTime, setElapsedTime] = useState('00:00:00')

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
            if (status === 'CLOCKED_IN' && shiftStart) {
                const diff = new Date().getTime() - shiftStart.getTime()
                const hours = Math.floor(diff / (1000 * 60 * 60))
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                const seconds = Math.floor((diff % (1000 * 60)) / 1000)
                setElapsedTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                )
            }
        }, 1000)
        return () => clearInterval(timer)
    }, [status, shiftStart])

    const handleClockIn = () => {
        setStatus('CLOCKED_IN')
        setShiftStart(new Date())
    }

    const handleClockOut = () => {
        setStatus('CLOCKED_OUT')
        setShiftStart(null)
        setElapsedTime('00:00:00')
    }

    const handleBreak = () => {
        setStatus(status === 'ON_BREAK' ? 'CLOCKED_IN' : 'ON_BREAK')
    }

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-stone-100">Employee Time Clock</h1>
                <p className="text-stone-400">Track your hours accurately for payroll</p>
            </div>

            {/* Main Clock Panel */}
            <div className="glass-panel rounded-2xl p-8 md:p-12 border-t-4 border-orange-500 shadow-2xl shadow-orange-900/20 text-center space-y-8">

                {/* Digital Clock */}
                <div className="space-y-2">
                    <div className="text-6xl md:text-8xl font-mono font-bold text-stone-100 tracking-wider">
                        {currentTime.toLocaleTimeString([], { hour12: false })}
                    </div>
                    <div className="text-xl text-stone-500 font-medium">
                        {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                {/* Status Indicator */}
                <div className="flex justify-center">
                    <div className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide uppercase border ${status === 'CLOCKED_IN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            status === 'ON_BREAK' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                'bg-stone-800 text-stone-400 border-stone-700'
                        }`}>
                        Current Status: {status.replace('_', ' ')}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <button
                        onClick={handleClockIn}
                        disabled={status !== 'CLOCKED_OUT'}
                        className="h-24 rounded-xl flex flex-col items-center justify-center gap-2 font-bold text-lg transition-all
                        disabled:opacity-30 disabled:cursor-not-allowed
                        bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20"
                    >
                        <Play className="h-8 w-8" />
                        Clock In
                    </button>

                    <button
                        onClick={handleBreak}
                        disabled={status === 'CLOCKED_OUT'}
                        className={`h-24 rounded-xl flex flex-col items-center justify-center gap-2 font-bold text-lg transition-all
                        disabled:opacity-30 disabled:cursor-not-allowed
                        ${status === 'ON_BREAK'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'}`}
                    >
                        <Coffee className="h-8 w-8" />
                        {status === 'ON_BREAK' ? 'End Break' : 'Start Break'}
                    </button>

                    <button
                        onClick={handleClockOut}
                        disabled={status === 'CLOCKED_OUT'}
                        className="h-24 rounded-xl flex flex-col items-center justify-center gap-2 font-bold text-lg transition-all
                        disabled:opacity-30 disabled:cursor-not-allowed
                        bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20"
                    >
                        <Square className="h-8 w-8 fill-current" />
                        Clock Out
                    </button>
                </div>

                {/* Session Info */}
                {status !== 'CLOCKED_OUT' && (
                    <div className="pt-6 border-t border-stone-800">
                        <p className="text-stone-500 text-sm mb-2">Current Session Duration</p>
                        <div className="text-3xl font-mono font-bold text-orange-400">
                            {elapsedTime}
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Activity */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center gap-2">
                    <History className="h-5 w-5 text-stone-400" />
                    <h3 className="font-semibold text-stone-200">Recent Activity</h3>
                </div>
                <div className="divide-y divide-stone-800">
                    <div className="p-4 flex items-center justify-between hover:bg-stone-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-stone-800 rounded-lg text-stone-400">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-medium text-stone-200">Yesterday</p>
                                <p className="text-xs text-stone-500">Regular Shift</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-mono text-stone-200">8h 15m</p>
                            <p className="text-xs text-emerald-400">Completed</p>
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-between hover:bg-stone-800/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-stone-800 rounded-lg text-stone-400">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-medium text-stone-200">Nov 21, 2023</p>
                                <p className="text-xs text-stone-500">Regular Shift</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-mono text-stone-200">7h 45m</p>
                            <p className="text-xs text-emerald-400">Completed</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
