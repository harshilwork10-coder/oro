'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Clock,
    ArrowLeft,
    Calendar,
    RefreshCw,
    User
} from 'lucide-react'
import Link from 'next/link'

interface TimeEntry {
    id: string
    employeeName: string
    date: string
    clockIn: string
    clockOut: string
    hoursWorked: number
    breakMinutes: number
}

export default function HoursWagesPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [entries, setEntries] = useState<TimeEntry[]>([])
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        fetchData()
    }, [startDate, endDate])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/hours-wages?startDate=${startDate}&endDate=${endDate}`)
            if (res.ok) {
                const data = await res.json()
                setEntries(data.entries || [])
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0)

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports/employee" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                            Hours & Wages
                        </h1>
                        <p className="text-gray-400 mt-1">Employee time entries</p>
                    </div>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
                <span className="text-gray-400">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Entries</p>
                    <p className="text-2xl font-bold text-white">{entries.length}</p>
                </div>
                <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-4">
                    <p className="text-blue-300 text-sm">Total Hours</p>
                    <p className="text-2xl font-bold text-blue-400">{totalHours.toFixed(2)}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Employee</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Clock In</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Clock Out</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Break (min)</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Hours</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : entries.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No time entries found</td></tr>
                        ) : (
                            entries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-gray-700/30">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <User className="w-4 h-4 text-gray-500" />
                                            <span className="text-white">{entry.employeeName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">{entry.date}</td>
                                    <td className="px-4 py-3 text-green-400">{entry.clockIn}</td>
                                    <td className="px-4 py-3 text-red-400">{entry.clockOut || 'Active'}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">{entry.breakMinutes}</td>
                                    <td className="px-4 py-3 text-right text-white font-medium">{entry.hoursWorked.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
